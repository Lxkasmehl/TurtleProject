import cv2 as cv
import os
import joblib
import numpy as np
import faiss
from sklearn.cluster import MiniBatchKMeans
from search_utils import initialize_faiss_index
from vlad_utils import compute_vlad
import time

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

# --- OPTIMIZED CV PARAMETERS ---
# 1. Cap Features: 10k is high detail, but prevents the 180k explosion
SIFT_NFEATURES = 10000
SIFT_NOCTAVE_LAYERS = 3
SIFT_CONTRAST_THRESHOLD = 0.03  # Slightly stricter to ignore noise
SIFT_EDGE_THRESHOLD = 10
SIFT_SIGMA = 1.6

# CLAHE: High - Helps with dark shells, Low - Helps with light shells
CLAHE_CLIP_LIMIT = 1.0
CLAHE_TILE_GRID_SIZE = (16, 16)

# Resize Limit: Downscale 4K images to this max dimension
MAX_IMAGE_DIMENSION = 1200


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


# --- HELPER: MEMORY & SPEED OPTIMIZED EXTRACTION ---
def extract_features_from_image(image_path):
    """
    Reads image, RESIZES if too large, applies CLAHE, runs SIFT.
    Returns: (keypoints, descriptors)
    """
    sift = get_SIFT()
    img = cv.imread(image_path, cv.IMREAD_GRAYSCALE)
    if img is None: return None, None

    # --- SPEED OPTIMIZATION: Resize Huge Images ---
    h, w = img.shape
    if max(h, w) > MAX_IMAGE_DIMENSION:
        scale = MAX_IMAGE_DIMENSION / max(h, w)
        new_w, new_h = int(w * scale), int(h * scale)
        img = cv.resize(img, (new_w, new_h), interpolation=cv.INTER_AREA)
    # -----------------------------------------

    clahe = get_CLAHE()
    img = clahe.apply(img)

    kps, des = sift.detectAndCompute(img, None)
    if des is None or len(des) == 0: return None, None
    '''
    # --- ROOTSIFT TRANSFORMATION (NEW) ---
    # 1. L1 Normalize: Divide each vector by its sum (Manhattan distance normalization)
    #    eps prevents division by zero
    eps = 1e-7
    des /= (des.sum(axis=1, keepdims=True) + eps)

    # 2. Square Root: Takes the element-wise square root
    #    This maps the Euclidean distance to the Hellinger kernel (better for histograms)
    des = np.sqrt(des)
    # -------------------------------------
    '''
    return kps, des


# --- RESOURCE MANAGEMENT ---
def load_vocabulary(vocab_path=DEFAULT_VOCAB_PATH):
    if not os.path.exists(vocab_path): return None
    return joblib.load(vocab_path)


def load_faiss_index(index_path=DEFAULT_INDEX_PATH):
    if not os.path.exists(index_path): return None
    return faiss.read_index(index_path)


def load_metadata(metadata_path=DEFAULT_METADATA_PATH):
    if not os.path.exists(metadata_path): return []
    return joblib.load(metadata_path)


def load_vlad_array(vlad_array_path=DEFAULT_VLAD_ARRAY_PATH):
    if not os.path.exists(vlad_array_path): return None
    return np.load(vlad_array_path)


def load_or_generate_persistent_data(data_directory):
    global GLOBAL_RESOURCES
    GLOBAL_RESOURCES['vocab'] = load_vocabulary()
    GLOBAL_RESOURCES['faiss_index'] = load_faiss_index()
    GLOBAL_RESOURCES['metadata'] = load_metadata()
    GLOBAL_RESOURCES['vlad_array'] = load_vlad_array()

    if GLOBAL_RESOURCES['vocab'] and GLOBAL_RESOURCES['faiss_index']:
        print("✅ Resources Loaded from Disk.")
        return True

    print("⚠️ Rebuilding Index/Vocab from scratch...")
    rebuild_faiss_index_from_folders(data_directory)

    GLOBAL_RESOURCES['vocab'] = load_vocabulary()
    GLOBAL_RESOURCES['faiss_index'] = load_faiss_index()
    GLOBAL_RESOURCES['metadata'] = load_metadata()
    GLOBAL_RESOURCES['vlad_array'] = load_vlad_array()
    return True


# --- CORE OPS ---
def process_new_image(image_path, kmeans_vocab):
    _, des = extract_features_from_image(image_path)
    if des is None: return None
    return compute_vlad(des, kmeans_vocab).reshape(1, -1).astype('float32')


def process_image_through_SIFT(image_path, output_path):
    kps, des = extract_features_from_image(image_path)
    if des is None: return False, None

    kp_array = np.array([(p.pt, p.size, p.angle, p.response, p.octave, p.class_id) for p in kps], dtype=object)
    try:
        np.savez(output_path, keypoints=kp_array, descriptors=des)
        return True, des
    except Exception as e:
        print(f"Error saving NPZ: {e}")
        return False, None


def SIFT_from_file(file_path):
    try:
        data = np.load(file_path, allow_pickle=True)
        kp_array = data['keypoints']
        descriptors = data['descriptors']

        # SAFEGUARD: If loading an OLD file with 180k descriptors, downsample it
        # This prevents the "5 minute freeze" even if you forget to delete old files
        if len(descriptors) > 15000:
            indices = np.random.choice(len(descriptors), 15000, replace=False)
            descriptors = descriptors[indices]
            kp_array = kp_array[indices]

        keypoints = [
            cv.KeyPoint(p[0][0], p[0][1], p[1], p[2], p[3], p[4], p[5])
            for p in kp_array
        ]
        return None, keypoints, descriptors, os.path.basename(file_path)
    except Exception as e:
        return None, [], None, ""


# --- SEARCH & VERIFICATION ---
def smart_search(image_path, location_filter=None, k_results=20):
    vocab = GLOBAL_RESOURCES['vocab']
    index = GLOBAL_RESOURCES['faiss_index']
    metadata = GLOBAL_RESOURCES['metadata']

    if not vocab or not index: return []

    query_vector = process_new_image(image_path, vocab)
    if query_vector is None: return []

    dists, idxs = index.search(query_vector, k_results * 5)
    results = []
    seen_sites = set()

    for i, idx in enumerate(idxs[0]):
        if idx == -1 or idx >= len(metadata): continue
        meta = metadata[idx]
        site_id = meta.get('site_id', 'Unknown')
        if site_id not in seen_sites:
            seen_sites.add(site_id)
            results.append({
                'filename': meta.get('filename'),
                'file_path': meta.get('file_path'),
                'site_id': site_id,
                'location': meta.get('location', 'Unknown'),
                'distance': float(dists[0][i])
            })
        if len(results) >= k_results: break
    return results


def rerank_results_with_spatial_verification(query_image_path, initial_results):
    """
    STAGE 2: GEOMETRIC VERIFICATION (CLASSIC RANSAC)
    - Reverted to standard cv.RANSAC for better tolerance on curved surfaces.
    - Increased reprojectionThreshold to 8.0 (looser).
    """
    if not initial_results:
        return []

    print(f"🔍 Spatial Verification: Checking top {len(initial_results)} candidates...")

    kp_query, des_query = extract_features_from_image(query_image_path)
    if des_query is None:
        print("   -> No features found in query.")
        return initial_results

    bf = cv.BFMatcher()
    verified_results = []

    for i, res in enumerate(initial_results):
        candidate_path = res.get('file_path')
        fname = os.path.basename(candidate_path) if candidate_path else "???"
        print(f"   [{i + 1}/{len(initial_results)}] {fname}...", end="", flush=True)

        if not candidate_path or not os.path.exists(candidate_path):
            print(" SKIP (File)")
            continue

        try:
            _, kp_candidate, des_candidate, _ = SIFT_from_file(candidate_path)
            if des_candidate is None:
                print(" SKIP (No Desc)")
                continue

            # Match
            matches = bf.knnMatch(des_query, des_candidate, k=2)
            good = [m for m, n in matches if m.distance < 0.70 * n.distance]

            inliers = 0
            if len(good) >= 4:
                src_pts = np.float32([kp_query[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
                dst_pts = np.float32([kp_candidate[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)

                # --- REVERT TO CLASSIC RANSAC ---
                # Threshold increased to 8.0 to allow for 3D curvature distortion
                M, mask = cv.findHomography(src_pts, dst_pts, cv.RANSAC, 8.0)

                if mask is not None:
                    inliers = np.sum(mask)

            print(f" Inliers: {inliers}")
            res['spatial_score'] = int(inliers)
            verified_results.append(res)

        except Exception as e:
            print(f" ERROR: {e}")
            pass

    verified_results.sort(key=lambda x: x.get('spatial_score', 0), reverse=True)
    return verified_results


# --- TRAINING LOGIC (Memory Safe) ---
def train_vocabulary_incremental(root_data_path, vocab_save_path, num_clusters=64, batch_size=100):
    print(f"📉 Starting Incremental Training (k={num_clusters})...")
    kmeans = MiniBatchKMeans(n_clusters=num_clusters, random_state=42, batch_size=10000, n_init=3)

    all_npz_files = []
    for root, dirs, files in os.walk(root_data_path):
        for f in files:
            if f.endswith(".npz"): all_npz_files.append(os.path.join(root, f))

    current_batch = []
    files_processed = 0
    for i, fpath in enumerate(all_npz_files):
        try:
            d = np.load(fpath, allow_pickle=True)
            if 'descriptors' in d and d['descriptors'] is not None:
                # If descriptor count is crazy high, downsample BEFORE training to save RAM
                des = d['descriptors']
                if len(des) > 10000:
                    indices = np.random.choice(len(des), 10000, replace=False)
                    des = des[indices]
                current_batch.append(des)
        except:
            pass

        if len(current_batch) >= batch_size or i == len(all_npz_files) - 1:
            if current_batch:
                kmeans.partial_fit(np.vstack(current_batch).astype('float32'))
                files_processed += len(current_batch)
                print(f"   Training: {files_processed}/{len(all_npz_files)} files...")
                current_batch = []

    joblib.dump(kmeans, vocab_save_path)
    return kmeans


def rebuild_faiss_index_from_folders(data_directory, vocab_save_path=DEFAULT_VOCAB_PATH,
                                     index_save_path=DEFAULT_INDEX_PATH, metadata_save_path=DEFAULT_METADATA_PATH,
                                     vlad_array_save_path=DEFAULT_VLAD_ARRAY_PATH, num_clusters=64):
    print("♻️  STARTING MASTER REBUILD...")
    start_time = time.time()
    # 1. Regenerate Missing NPZ
    print("   Scanning for missing NPZ files...")
    for root, dirs, files in os.walk(data_directory):
        for f in files:
            if f.lower().endswith(('.jpg', '.png', '.jpeg')) and 'ref_data' in root:
                npz = os.path.join(root, os.path.splitext(f)[0] + ".npz")
                if not os.path.exists(npz):
                    process_image_through_SIFT(os.path.join(root, f), npz)

    # 2. Train Vocab
    kmeans_vocab = None
    if os.path.exists(vocab_save_path):
        try:
            kmeans_vocab = joblib.load(vocab_save_path)
            if not hasattr(kmeans_vocab, 'cluster_centers_'): kmeans_vocab = None
        except:
            kmeans_vocab = None

    if kmeans_vocab is None:
        kmeans_vocab = train_vocabulary_incremental(data_directory, vocab_save_path, num_clusters)

    if not hasattr(kmeans_vocab, 'cluster_centers_'):
        print("❌ CRITICAL: Vocab training failed.")
        return None

    # 3. Build Index
    print("   Generating Index...")
    all_vlad = []
    final_meta = []
    for root, dirs, files in os.walk(data_directory):
        for f in files:
            if f.endswith(".npz"):
                path = os.path.join(root, f)
                try:
                    parts = path.split(os.sep)
                    if 'ref_data' in parts:
                        idx = parts.index('ref_data')
                        tid, loc = parts[idx - 1], parts[idx - 2]
                    else:
                        tid, loc = "Unknown", "Unknown"

                    d = np.load(path, allow_pickle=True)

                    # Safety Sample for VLAD generation too
                    des = d.get('descriptors')
                    if des is not None and len(des) > 15000:
                        indices = np.random.choice(len(des), 15000, replace=False)
                        des = des[indices]

                    if des is not None and len(des) > 0:
                        vlad = compute_vlad(des, kmeans_vocab)
                        all_vlad.append(vlad)
                        final_meta.append({'filename': f, 'file_path': path, 'site_id': tid, 'location': loc})
                except:
                    pass

    if all_vlad:
        vlad_arr = np.array(all_vlad).astype('float32')
        np.save(vlad_array_save_path, vlad_arr)
        joblib.dump(final_meta, metadata_save_path)

        index = initialize_faiss_index(vlad_arr)
        faiss.write_index(index, index_save_path)
        end_time = time.time()  # <--- TIMER END
        elapsed = end_time - start_time
        print(f"✅ System Rebuild Complete in {elapsed:.2f} seconds.")
        return kmeans_vocab
    return None