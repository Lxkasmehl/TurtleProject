import numpy as np
import pickle
import os
import joblib
from django.conf import settings
from .models import Turtle, TurtleImage

# Imports (assuming previous fix was applied)
from image_processing import process_image_through_SIFT
from vlad_utils import compute_vlad

KMEANS_VOCAB_PATH = os.path.join(settings.BASE_DIR, '..', 'trained_kmeans_vocabulary.pkl')
GLOBAL_KMEANS_VOCAB = None
VLAD_DISTANCE_THRESHOLD = 0.5


def get_kmeans_model():
    global GLOBAL_KMEANS_VOCAB
    if GLOBAL_KMEANS_VOCAB is None:
        if not os.path.exists(KMEANS_VOCAB_PATH):
            print(f"Warning: VLAD vocabulary not found at {KMEANS_VOCAB_PATH}")
            return None
        GLOBAL_KMEANS_VOCAB = joblib.load(KMEANS_VOCAB_PATH)
    return GLOBAL_KMEANS_VOCAB


def process_turtle_image(turtle_image_instance):
    """
    Generates SIFT/VLAD for a specific TurtleImage instance.
    """
    kmeans_model = get_kmeans_model()
    if kmeans_model is None:
        print("Cannot process: KMeans vocabulary missing.")
        return False

    base_dir = os.path.dirname(turtle_image_instance.image.path)

    # 1. Process Original
    if turtle_image_instance.image:
        # Use image ID to avoid overwriting files if multiple images exist
        orig_npz_path = os.path.join(base_dir, f"img_{turtle_image_instance.id}_orig.npz")
        success, descriptors = process_image_through_SIFT(turtle_image_instance.image.path, orig_npz_path)

        if success and descriptors is not None:
            vlad_vec = compute_vlad(descriptors, kmeans_model)
            turtle_image_instance.vlad_blob_original = pickle.dumps(vlad_vec)

    # 2. Process Mirror
    if turtle_image_instance.mirror_image:
        mirror_npz_path = os.path.join(base_dir, f"img_{turtle_image_instance.id}_mirror.npz")
        success, descriptors = process_image_through_SIFT(turtle_image_instance.mirror_image.path, mirror_npz_path)

        if success and descriptors is not None:
            vlad_vec = compute_vlad(descriptors, kmeans_model)
            turtle_image_instance.vlad_blob_mirror = pickle.dumps(vlad_vec)

    turtle_image_instance.is_processed = True
    turtle_image_instance.save()
    return True


def find_best_matching_turtle(query_image):
    """
    Compares the query_image (TurtleImage) against all other processed TurtleImages.
    Returns the ID of the *parent Turtle* that matched.
    """
    if not query_image.vlad_blob_original:
        return {"match_found": False, "reason": "Query image has no features"}

    query_vec = pickle.loads(query_image.vlad_blob_original)

    # Compare against all images NOT belonging to the current (temp) turtle
    # We filter by processed images to avoid errors
    candidate_images = TurtleImage.objects.filter(is_processed=True).exclude(turtle_id=query_image.turtle_id)

    best_distance = float('inf')
    best_match_turtle_id = None

    for candidate in candidate_images:
        # Compare vs Candidate Original
        if candidate.vlad_blob_original:
            cand_vec = pickle.loads(candidate.vlad_blob_original)
            dist = np.linalg.norm(query_vec - cand_vec)
            if dist < best_distance:
                best_distance = dist
                best_match_turtle_id = candidate.turtle_id

        # Compare vs Candidate Mirror
        if candidate.vlad_blob_mirror:
            cand_vec_mirror = pickle.loads(candidate.vlad_blob_mirror)
            dist = np.linalg.norm(query_vec - cand_vec_mirror)
            if dist < best_distance:
                best_distance = dist
                best_match_turtle_id = candidate.turtle_id

    if best_match_turtle_id and best_distance < VLAD_DISTANCE_THRESHOLD:
        matched_turtle = Turtle.objects.get(id=best_match_turtle_id)
        return {
            "match_found": True,
            "matched_turtle_id": matched_turtle.id,
            "matched_biology_id": matched_turtle.biology_id,
            "matched_name": matched_turtle.name,
            "distance": best_distance
        }
    else:
        return {
            "match_found": False,
            "best_distance": best_distance if best_distance != float('inf') else None,
            "threshold": VLAD_DISTANCE_THRESHOLD
        }