import cv2 as cv
import os
import joblib
import numpy as np
import faiss
from sklearn.cluster import MiniBatchKMeans

from search_utils import run_initial_dbscan, initialize_faiss_index, add_new_turtle_image_to_index, \
    filtered_faiss_search
from vlad_utils import build_vocabulary, compute_vlad
from sklearn.decomposition import PCA

# --- CONFIGURATION ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_VOCAB_PATH = os.path.join(BASE_DIR, 'vlad_vocab.pkl')
DEFAULT_INDEX_PATH = os.path.join(BASE_DIR, 'turtles.index')
DEFAULT_METADATA_PATH = os.path.join(BASE_DIR, 'metadata.pkl')
DEFAULT_VLAD_ARRAY_PATH = os.path.join(BASE_DIR, 'global_vlad_array.npy')

GLOBAL_RESOURCES = {
    'faiss_index': None,
    'vocab': None,
    'metadata': None,
    'vlad_array': None,
}

# --- CV PARAMETERS ---
SIFT_NFEATURES = 0
SIFT_NOCTAVE_LAYERS = 3
SIFT_CONTRAST_THRESHOLD = 0.02
SIFT_EDGE_THRESHOLD = 10
SIFT_SIGMA = 1.6

CLAHE_CLIP_LIMIT = 3.0
CLAHE_TILE_GRID_SIZE = (16, 16)


def get_SIFT():
    return cv.SIFT_create(
        nfeatures=SIFT_NFEATURES,
        nOctaveLayers=SIFT_NOCTAVE_LAYERS,
        contrastThreshold=SIFT_CONTRAST_THRESHOLD,
        edgeThreshold=SIFT_EDGE_THRESHOLD,
        sigma=SIFT_SIGMA)


def get_CLAHE():
    return cv.createCLAHE(
        clipLimit=CLAHE_CLIP_LIMIT,
        tileGridSize=CLAHE_TILE_GRID_SIZE)


# --- RESOURCE MANAGEMENT ---

def load_vocabulary(vocab_path=DEFAULT_VOCAB_PATH):
    print('Loading vocabulary...')
    if not os.path.exists(vocab_path):
        print('Vocabulary not found.')
        return None
    return joblib.load(vocab_path)


def load_faiss_index(index_path=DEFAULT_INDEX_PATH):
    if not os.path.exists(index_path):
        return None
    return faiss.read_index(index_path)


def load_metadata(metadata_path=DEFAULT_METADATA_PATH):
    if not os.path.exists(metadata_path):
        return []
    return joblib.load(metadata_path)


def load_vlad_array(vlad_array_path=DEFAULT_VLAD_ARRAY_PATH):
    if not os.path.exists(vlad_array_path): return None
    return np.load(vlad_array_path)


# --- NEW: MEMORY-SAFE TRAINING LOGIC ---

def train_vocabulary_incremental(root_data_path, vocab_save_path, num_clusters=64, batch_size=100):
    """
    Trains K-Means using Mini-Batches to avoid RAM crashes.
    It loads 'batch_size' files, extracts SIFT, updates the model, and clears RAM.
    """
    print(f"📉 Starting Incremental Training (k={num_clusters})...")

    # 1. Initialize the MiniBatch Model
    kmeans = MiniBatchKMeans(
        n_clusters=num_clusters,
        random_state=42,
        batch_size=10000,  # Scikit-learn internal batch size
        n_init=3
    )

    # 2. Collect all .npz file paths first (Lightweight)
    all_npz_files = []
    for root, dirs, files in os.walk(root_data_path):
        for f in files:
            if f.endswith(".npz"):
                all_npz_files.append(os.path.join(root, f))

    print(f"Found {len(all_npz_files)} files to process.")

    # 3. Loop through files in chunks
    current_batch_descriptors = []
    files_processed = 0

    for i, file_path in enumerate(all_npz_files):
        try:
            data = np.load(file_path, allow_pickle=True)
            if 'descriptors' in data and data['descriptors'] is not None:
                descriptors = data['descriptors']
                # SIFT descriptors are typically uint8 or float32. KMeans needs float.
                if descriptors.shape[0] > 0:
                    current_batch_descriptors.append(descriptors)
        except Exception as e:
            print(f"Skipping bad file {file_path}: {e}")

        # 4. If batch is full, Train and Flush
        if len(current_batch_descriptors) >= batch_size or i == len(all_npz_files) - 1:
            if current_batch_descriptors:
                # Stack just this batch (e.g. 100 files worth)
                batch_data = np.vstack(current_batch_descriptors).astype('float32')

                # TEACH THE MODEL (Incremental Update)
                kmeans.partial_fit(batch_data)

                files_processed += len(current_batch_descriptors)
                print(f"   Training progress: {files_processed}/{len(all_npz_files)} files processed...")

                # FREE RAM
                current_batch_descriptors = []

    # 5. Save the Trained Model
    print("✅ Training Complete. Saving Vocabulary...")
    joblib.dump(kmeans, vocab_save_path)
    return kmeans


def load_or_generate_persistent_data(data_directory):
    global GLOBAL_RESOURCES
    GLOBAL_RESOURCES['vocab'] = load_vocabulary()
    GLOBAL_RESOURCES['faiss_index'] = load_faiss_index()
    GLOBAL_RESOURCES['metadata'] = load_metadata()

    if GLOBAL_RESOURCES['vocab'] and GLOBAL_RESOURCES['faiss_index']:
        print("✅ Resources Loaded from Disk.")
        return True

    print("⚠️ Rebuilding Index/Vocab from scratch...")
    rebuild_faiss_index_from_folders(data_directory)

    # Reload
    GLOBAL_RESOURCES['vocab'] = load_vocabulary()
    GLOBAL_RESOURCES['faiss_index'] = load_faiss_index()
    GLOBAL_RESOURCES['metadata'] = load_metadata()
    return True


# --- CORE IMAGE OPS ---

def process_image_through_SIFT(image_path, output_path):
    """
    Generates SIFT keypoints/descriptors and saves to .npz
    """
    SIFT = get_SIFT()
    imgGray = cv.imread(image_path, cv.IMREAD_GRAYSCALE)
    if imgGray is None:
        print(f"Failed to load Image: {image_path}")
        return False, None

    clahe = get_CLAHE()
    imgGray = clahe.apply(imgGray)

    keypoints, descriptors = SIFT.detectAndCompute(imgGray, None)

    if descriptors is None or len(descriptors) == 0:
        # print(f"No descriptors found for: {image_path}") # Optional: Reduce spam
        return False, None

    kp_array = np.array([
        (kp.pt, kp.size, kp.angle, kp.response, kp.octave, kp.class_id)
        for kp in keypoints
    ], dtype=object)

    try:
        np.savez(output_path, keypoints=kp_array, descriptors=descriptors)
        return True, descriptors
    except Exception as e:
        print(f"Failed to save NPZ to {output_path}: {e}")
        return False, None


def process_new_image(image_path, kmeans_vocab):
    """
    Calculates VLAD vector for a single new image (used for searching).
    """
    sift = get_SIFT()
    img_gray = cv.imread(image_path, cv.IMREAD_GRAYSCALE)
    if img_gray is None: return None

    clahe = get_CLAHE()
    img_gray = clahe.apply(img_gray)

    keypoints, descriptors = sift.detectAndCompute(img_gray, None)
    if descriptors is None or len(descriptors) == 0: return None

    vlad_vector = compute_vlad(descriptors, kmeans_vocab)
    return vlad_vector.reshape(1, -1).astype('float32')


def SIFT_from_file(file_path):
    """Helper to load data back from .npz for verification/plotting"""
    try:
        data = np.load(file_path, allow_pickle=True)
        # imgGray = data['image'] # We removed image saving to save space
        kp_array = data['keypoints']
        descriptors = data['descriptors']

        keypoints = [
            cv.KeyPoint(pt[0], pt[1], size, angle, response, octave, class_id)
            for (pt, size, angle, response, octave, class_id) in kp_array
        ]
        return None, keypoints, descriptors, os.path.basename(file_path)
    except Exception as e:
        print(f"Error loading NPZ {file_path}: {e}")
        return None, [], None, os.path.basename(file_path)


# --- SEARCH LOGIC ---

def smart_search(image_path, location_filter=None, k_results=5):
    # (Keep your existing smart_search code exactly as is)
    vocab = GLOBAL_RESOURCES['vocab']
    index = GLOBAL_RESOURCES['faiss_index']
    metadata = GLOBAL_RESOURCES['metadata']

    if not vocab or not index: return []

    q_vec = process_new_image(image_path, vocab)
    if q_vec is None: return []

    dists, idxs = index.search(q_vec, k_results * 2)
    results = []
    seen = set()

    for i, idx in enumerate(idxs[0]):
        if idx == -1 or idx >= len(metadata): continue
        meta = metadata[idx]
        sid = meta.get('site_id', 'Unknown')
        if sid not in seen:
            seen.add(sid)
            results.append({
                'filename': meta['filename'],
                'file_path': meta.get('file_path'),
                'site_id': sid,
                'distance': float(dists[0][i]),
                'location': meta.get('location')
            })
        if len(results) >= k_results: break
    return results


# --- SETUP & TRAINING ---
def rebuild_faiss_index_from_folders(data_directory,
                                     vocab_save_path=DEFAULT_VOCAB_PATH,
                                     index_save_path=DEFAULT_INDEX_PATH,
                                     metadata_save_path=DEFAULT_METADATA_PATH,
                                     vlad_array_save_path=DEFAULT_VLAD_ARRAY_PATH,
                                     num_clusters=64):
    """
    [MASTER SETUP]
    1. REGENERATES MISSING .NPZ FILES from source images.
    2. Trains/Loads Vocab (Memory Safe).
    3. Generates VLAD vectors.
    4. Builds FAISS.
    """
    print("♻️  STARTING MASTER REBUILD...")

    # --- STEP 0: REGENERATE MISSING .NPZ FILES ---
    print(f"   Scanning {data_directory} for missing feature files...")
    regen_count = 0
    for root, dirs, files in os.walk(data_directory):
        for f in files:
            if f.lower().endswith(('.jpg', '.jpeg', '.png')):
                image_path = os.path.join(root, f)
                if 'ref_data' in root:
                    npz_name = os.path.splitext(f)[0] + ".npz"
                    npz_path = os.path.join(root, npz_name)
                    if not os.path.exists(npz_path):
                        # Silent processing unless you want spam
                        process_image_through_SIFT(image_path, npz_path)
                        regen_count += 1
                        if regen_count % 10 == 0: print(f"   Generated {regen_count} descriptors...")

    print(f"   ✅ Regeneration Complete. Created {regen_count} new .npz files.")

    # --- STEP 1: TRAIN VOCABULARY (WITH HEALTH CHECK) ---
    kmeans_vocab = None
    if os.path.exists(vocab_save_path):
        print("Loading existing vocabulary...")
        try:
            kmeans_vocab = joblib.load(vocab_save_path)
            # CHECK: Is it actually fitted?
            if not hasattr(kmeans_vocab, 'cluster_centers_'):
                print("⚠️  Existing vocabulary is CORRUPT (Not fitted). Deleting...")
                kmeans_vocab = None
        except Exception:
            kmeans_vocab = None

    if kmeans_vocab is None:
        # RUN NEW INCREMENTAL TRAINING
        kmeans_vocab = train_vocabulary_incremental(data_directory, vocab_save_path, num_clusters)

    # Final check to prevent crash
    if not hasattr(kmeans_vocab, 'cluster_centers_'):
        print("❌ CRITICAL ERROR: Vocabulary training failed (No data found?). Cannot proceed.")
        return None

    # --- STEP 2: GENERATE VLAD VECTORS ---
    print("Generating VLAD vectors for Index...")
    all_vlad_vectors = []
    final_metadata = []

    for root, dirs, files in os.walk(data_directory):
        for f in files:
            if f.endswith(".npz"):
                file_path = os.path.join(root, f)
                try:
                    parts = file_path.split(os.sep)
                    if 'ref_data' in parts:
                        idx = parts.index('ref_data')
                        tid = parts[idx - 1]
                        loc = parts[idx - 2]
                    else:
                        tid = "Unknown";
                        loc = "Unknown"

                    data = np.load(file_path, allow_pickle=True)
                    des = data.get('descriptors')

                    if des is not None and len(des) > 0:
                        vlad = compute_vlad(des, kmeans_vocab)
                        all_vlad_vectors.append(vlad)

                        final_metadata.append({
                            'filename': f,
                            'file_path': file_path,
                            'original_index': len(all_vlad_vectors) - 1,
                            'site_id': tid,
                            'location': loc
                        })
                except Exception as e:
                    print(f"Error processing {f}: {e}")

    if not all_vlad_vectors:
        print("❌ ERROR: No valid data found to index.")
        return None

    # --- STEP 3: BUILD & SAVE INDEX ---
    vlad_array = np.array(all_vlad_vectors).astype('float32')
    np.save(vlad_array_save_path, vlad_array)
    joblib.dump(final_metadata, metadata_save_path)

    print(f"Building FAISS Index with {vlad_array.shape[0]} vectors...")
    global_index = initialize_faiss_index(vlad_array)
    faiss.write_index(global_index, index_save_path)

    print("✅ System Ready.")
    return kmeans_vocab