import cv2 as cv
import numpy as np
import pickle
import os  # New import to handle file paths
import joblib  # New import to load the vocabulary model
from vlad_utils import compute_vlad  # New import for VLAD calculation
from .models import TurtleImage

# --- VLAD Configuration ---
# NOTE: This path must point to the KMeans model saved after offline training.
# This assumes the trained model is saved directly in the 'backend' folder.
KMEANS_VOCAB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..',
                                 'trained_kmeans_vocabulary.pkl')
GLOBAL_KMEANS_VOCAB = None
VLAD_DISTANCE_THRESHOLD = 0.5  # A placeholder threshold; tune this value based on testing.


def load_vlad_config():
    """Loads the pre-trained KMeans vocabulary model."""
    global GLOBAL_KMEANS_VOCAB
    if GLOBAL_KMEANS_VOCAB is None:
        # ⚠️ CRITICAL: Check if the vocabulary is trained and saved.
        if not os.path.exists(KMEANS_VOCAB_PATH):
            raise FileNotFoundError(
                f"VLAD vocabulary file not found at: {KMEANS_VOCAB_PATH}. You must run an offline training/save script first.")
        try:
            GLOBAL_KMEANS_VOCAB = joblib.load(KMEANS_VOCAB_PATH)
            print("VLAD vocabulary loaded successfully.")
        except Exception as e:
            raise RuntimeError(f"Could not load VLAD vocabulary: {e}")
    return GLOBAL_KMEANS_VOCAB


def get_vlad_match(query_image_path):
    """
    Identifies a turtle image by computing its VLAD vector and finding the
    closest vector in the database using L2 distance.

    Assumes the TurtleImage model's descriptors_blob now stores a pickled VLAD vector.
    """
    # 1. Load configuration
    try:
        kmeans_vocab = load_vlad_config()
    except Exception as e:
        return None, str(e)

    # 2. Compute SIFT and VLAD for the query image
    sift = cv.SIFT_create()
    img_query = cv.imread(query_image_path, cv.IMREAD_GRAYSCALE)
    if img_query is None:
        return None, "Could not read query image"

    # Detect keypoints and compute descriptors
    _, des_query = sift.detectAndCompute(img_query, None)
    if des_query is None or len(des_query) < 10:
        return None, "Not enough SIFT descriptors found in query image for VLAD encoding"

    query_vlad = compute_vlad(des_query, kmeans_vocab)

    # 3. Search database for the closest VLAD vector
    all_refs = TurtleImage.objects.exclude(descriptors_blob=None)

    best_distance = float('inf')
    best_turtle_id = None

    if not all_refs.exists():
        return None, "No reference VLAD vectors in the database."

    for ref_img in all_refs:
        try:
            # Deserialize the pre-computed VLAD vector from the database
            ref_vlad = pickle.loads(ref_img.descriptors_blob)

            # Compute L2 distance (Euclidean distance) for vector matching
            distance = np.linalg.norm(query_vlad - ref_vlad)

            if distance < best_distance:
                best_distance = distance
                best_turtle_id = ref_img.turtle.id

        except Exception as e:
            print(f"Error processing reference image {ref_img.id}: {e}")
            continue

    # 4. Return result based on threshold
    if best_turtle_id is not None and best_distance < VLAD_DISTANCE_THRESHOLD:
        return best_turtle_id, f"Match found with ID {best_turtle_id}. Distance: {best_distance:.4f} (Threshold: {VLAD_DISTANCE_THRESHOLD})"
    else:
        return None, f"No match found. Best distance was {best_distance:.4f} (Threshold: {VLAD_DISTANCE_THRESHOLD})"


# Re-route the old function name to the new VLAD-based matching logic
# to maintain API compatibility. The 'min_match_count' argument is ignored.
def get_sift_match(query_image_path, min_match_count=20):
    return get_vlad_match(query_image_path)