import numpy as np
import pickle
import os
import joblib
from django.conf import settings
from .models import Turtle, TurtleImage

# --- FIX: Import directly from the project root ---
# Since manage.py is in the same folder as these files, we import them directly.
try:
    from image_processing import process_image_through_SIFT
    from vlad_utils import compute_vlad
except ImportError:
    # Fallback: In some IDE configurations, the root might be different.
    # This helps catch pathing errors early.
    import sys

    sys.path.append(str(settings.BASE_DIR))
    from image_processing import process_image_through_SIFT
    from vlad_utils import compute_vlad

KMEANS_VOCAB_PATH = os.path.join(settings.BASE_DIR, '..', 'trained_kmeans_vocabulary.pkl')
GLOBAL_KMEANS_VOCAB = None


def get_kmeans_model():
    global GLOBAL_KMEANS_VOCAB
    if GLOBAL_KMEANS_VOCAB is None:
        # Resolve the absolute path to ensure we find the file
        abs_path = os.path.abspath(KMEANS_VOCAB_PATH)
        if not os.path.exists(abs_path):
            print(f"Warning: VLAD vocabulary not found at {abs_path}")
            return None
        GLOBAL_KMEANS_VOCAB = joblib.load(abs_path)
    return GLOBAL_KMEANS_VOCAB


def process_turtle_image(turtle_image_instance):
    """
    Generates SIFT/VLAD for both Original and Mirror versions of the image.
    """
    kmeans_model = get_kmeans_model()
    # If model is missing, we can't process, but we shouldn't crash.
    if kmeans_model is None:
        print("Cannot process: KMeans vocabulary missing.")
        return False

    base_dir = os.path.dirname(turtle_image_instance.image.path)

    # 1. Process Original
    if turtle_image_instance.image:
        orig_npz_path = os.path.join(base_dir, f"img_{turtle_image_instance.id}_orig.npz")
        try:
            success, descriptors = process_image_through_SIFT(turtle_image_instance.image.path, orig_npz_path)

            if success and descriptors is not None:
                vlad_vec = compute_vlad(descriptors, kmeans_model)
                turtle_image_instance.vlad_blob_original = pickle.dumps(vlad_vec)
        except Exception as e:
            print(f"Error processing original image SIFT: {e}")
            return False

    # 2. Process Mirror (The 'Flip' requirement)
    if turtle_image_instance.mirror_image:
        mirror_npz_path = os.path.join(base_dir, f"img_{turtle_image_instance.id}_mirror.npz")
        try:
            success, descriptors = process_image_through_SIFT(turtle_image_instance.mirror_image.path, mirror_npz_path)

            if success and descriptors is not None:
                vlad_vec = compute_vlad(descriptors, kmeans_model)
                turtle_image_instance.vlad_blob_mirror = pickle.dumps(vlad_vec)
        except Exception as e:
            print(f"Error processing mirror image SIFT: {e}")

    turtle_image_instance.is_processed = True
    turtle_image_instance.save()
    return True


def find_near_matches(query_image, top_k=5):
    """
    Compares query_image against all processed images.
    Returns the top K unique Turtles that look similar.
    """
    if not query_image.vlad_blob_original:
        return []

    try:
        query_vec = pickle.loads(query_image.vlad_blob_original)
    except Exception as e:
        print(f"Error loading query vector: {e}")
        return []

    # Compare against all processed images (excluding the query image itself)
    candidate_images = TurtleImage.objects.filter(is_processed=True).exclude(id=query_image.id)

    matches = []

    for candidate in candidate_images:
        dist = float('inf')

        # Compare Query vs Candidate Original
        if candidate.vlad_blob_original:
            try:
                cand_vec = pickle.loads(candidate.vlad_blob_original)
                d = np.linalg.norm(query_vec - cand_vec)
                if d < dist: dist = d
            except:
                continue

        # Compare Query vs Candidate Mirror
        if candidate.vlad_blob_mirror:
            try:
                cand_vec_mirror = pickle.loads(candidate.vlad_blob_mirror)
                d = np.linalg.norm(query_vec - cand_vec_mirror)
                if d < dist: dist = d
            except:
                continue

        if dist != float('inf'):
            matches.append({
                'turtle': candidate.turtle,
                'distance': dist,
                'preview_image': candidate.image.url if candidate.image else ""
            })

    # Sort by distance (smallest is best)
    matches.sort(key=lambda x: x['distance'])

    # Deduplicate: We only want the best match per unique Turtle
    unique_turtle_matches = []
    seen_turtles = set()

    for m in matches:
        t_id = m['turtle'].id
        if t_id not in seen_turtles:
            seen_turtles.add(t_id)
            unique_turtle_matches.append({
                'turtle_id': m['turtle'].id,
                'biology_id': m['turtle'].biology_id,
                'gender': m['turtle'].gender,
                'location': f"{m['turtle'].location_specific}, {m['turtle'].location_state}",
                'distance': m['distance'],
                'image_url': m['preview_image']
            })
            if len(unique_turtle_matches) >= top_k:
                break

    return unique_turtle_matches