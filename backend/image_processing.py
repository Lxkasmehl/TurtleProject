
import cv2 as cv

import os
import joblib
from search_utils import *
from vlad_utils import build_vocabulary, compute_vlad
from sklearn.decomposition import PCA


#Initialization
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

SIFT_NFEATURES = 0
SIFT_NOCTAVE_LAYERS = 3
SIFT_CONTRAST_THRESHOLD = 0.04
SIFT_EDGE_THRESHOLD = 10
SIFT_SIGMA = 1.6

APPLY_CLAHE_PRECOMP = True
CLAHE_CLIP_LIMIT = 1.0
CLAHE_TILE_GRID_SIZE = (16, 16)
#Creating the SIFT detector once instead of every time we need it

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


def load_vocabulary(vocab_path = DEFAULT_VOCAB_PATH):
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

def load_all_descriptors(npz_path):
    #Will scan our directory to load all descriptor files
    all_descriptors = []
    file_metadata = []
    print('Loading descriptors...')
    file_paths = [os.path.join(npz_path, f) for f in os.listdir(npz_path) if f.endswith(".npz")]

    for i, file_path in enumerate(file_paths):
        try:
            data = np.load(file_path, allow_pickle=True)
            if 'descriptors' in data and data['descriptors'] is not None:
                all_descriptors.append(data['descriptors'])
                file_metadata.append({'filename': os.path.basename(file_path), 'original_index': i})
        except Exception as e:
            print(f"Warning: could not load or read {file_path}: {e}")

    if not all_descriptors:
        print("No descriptors found")
        return None, []
    return np.vstack(all_descriptors), file_metadata


# Assumed Global Variable Loaded in Django Startup:
# GLOBAL_VLAD_ARRAY = [vector_0, vector_1, vector_2, ...]

def smart_search(image_path, location_filter=None, k_results=5):
    """
    Handles Global Diversity Search (Default) or Location-Filtered Search.
    """
    vocab = GLOBAL_RESOURCES['vocab']
    index = GLOBAL_RESOURCES['faiss_index']
    metadata = GLOBAL_RESOURCES['metadata']
    global_vlad_array = GLOBAL_RESOURCES['vlad_array']

    if not vocab or not index or not metadata:
        return {"error": "System resources not loaded"}

    query_vector = process_new_image(image_path, vocab)
    if query_vector is None:
        return {"error": "Could not process image"}

    # MODE A: Location Filtered
    if location_filter:
        print(f"Filtering for location: {location_filter}")
        target_indices = [i for i, m in enumerate(metadata) if m.get('location') == location_filter]

        if not target_indices: return []

        subset_vectors = global_vlad_array[target_indices]
        return filtered_faiss_search(query_vector, subset_vectors, np.array(target_indices), k_results)

    # MODE B: Global Search (Diversity)
    # Re-implementing search_unique_sites logic here for direct access to globals
    search_depth = k_results * 10
    distances, indices = index.search(query_vector, search_depth)
    distances, indices = distances[0], indices[0]

    unique_results = []
    seen_sites = set()

    for i, idx in enumerate(indices):
        if idx == -1 or idx >= len(metadata): continue

        meta = metadata[idx]
        site_id = meta['site_id']

        if site_id not in seen_sites:
            seen_sites.add(site_id)
            unique_results.append({
                'filename': meta['filename'],
                'site_id': site_id,
                'distance': float(distances[i]),
                'location': meta.get('location', 'Unknown')
            })
        if len(unique_results) >= k_results: break

    return unique_results



def load_or_generate_persistent_data(npz_directory):
    """
    Runs on startup. Loads data from disk. If missing, regenerates it.
    """
    global GLOBAL_RESOURCES

    print("Attempting to load persistent data...")
    GLOBAL_RESOURCES['vocab'] = load_vocabulary()
    GLOBAL_RESOURCES['faiss_index'] = load_faiss_index()
    GLOBAL_RESOURCES['metadata'] = load_metadata()
    GLOBAL_RESOURCES['vlad_array'] = load_vlad_array()  # Load the big array

    # Check if everything loaded successfully
    if all(GLOBAL_RESOURCES.values()):
        print("✅ System ready. All resources loaded.")
        return True

    print("⚠️ Resources missing. Generating from scratch...")
    generate_clustering_and_index(npz_directory)

    # Reload after generation
    GLOBAL_RESOURCES['vocab'] = load_vocabulary()
    GLOBAL_RESOURCES['faiss_index'] = load_faiss_index()
    GLOBAL_RESOURCES['metadata'] = load_metadata()
    GLOBAL_RESOURCES['vlad_array'] = load_vlad_array()

    if all(GLOBAL_RESOURCES.values()):
        print("✅ Generation complete. System ready.")
        return True

    print("❌ CRITICAL FAILURE: Could not initialize system.")
    return False

#Core Functionality

def register_new_site_from_upload(image_path, location_name="Unknown"):
    """
    Called when Admin clicks 'Create New Site'.
    """
    vocab = load_vocabulary()
    faiss_index = load_faiss_index()
    metadata = load_metadata()

    if not vocab or not faiss_index:
        return {"error": "System resources missing."}

    # 1. Generate New Turtle ID (Primary Key Simulation)
    # In the future, Django will give us this ID automatically.
    # For now, we find the max existing ID and increment it.
    existing_ids = [m.get('site_id', 0) for m in metadata]
    new_turtle_id = max(existing_ids) + 1 if existing_ids else 1

    print(f"Creating New Turtle ID: {new_turtle_id} at {location_name}")

    # 2. Create Physical Folder using the ID
    # Structure: backend/data/turtles/turtle_{ID}/
    # This keeps all data for one turtle isolated.
    turtle_folder = os.path.join(BASE_DIR, 'data', 'turtles', f'turtle_{new_turtle_id}')
    os.makedirs(turtle_folder, exist_ok=True)

    # 3. Process & Save Data (.npz)
    filename = os.path.basename(image_path)

    # Copy the original image to the permanent folder (optional but recommended)
    final_image_path = os.path.join(turtle_folder, filename)
    import shutil
    try:
        shutil.copy2(image_path, final_image_path)
    except Exception as e:
        print(f"Warning: Could not copy image file: {e}")

    # Save the SIFT data (.npz) next to the image
    npz_filename = filename.replace('.jpg', '.npz').replace('.png', '.npz')
    npz_save_path = os.path.join(turtle_folder, npz_filename)

    success, _ = process_image_through_SIFT(image_path, npz_save_path)

    if not success:
        return {"error": "Failed to process SIFT data."}

    # 4. Add to FAISS (The Search Index)
    # We calculate the VLAD vector and add it to the live index
    vlad_vector = process_new_image(image_path, vocab)
    add_new_turtle_image_to_index(faiss_index, vlad_vector)

    # 5. Update Metadata (The Database Record)
    # This links the FAISS vector (original_index) to the Turtle ID (site_id)
    new_entry = {
        'filename': filename,
        'site_id': new_turtle_id,  # This is effectively the Primary Key
        'location': location_name,
        'original_index': faiss_index.ntotal - 1,  # The last vector added
        'file_path': npz_save_path  # Store the full path for easy retrieval
    }
    metadata.append(new_entry)
    joblib.dump(metadata, DEFAULT_METADATA_PATH)

    # 6. Save Index
    faiss.write_index(faiss_index, DEFAULT_INDEX_PATH)

    return {
        "status": "success",
        "turtle_id": new_turtle_id,
        "folder": turtle_folder
    }

def register_new_turtle(image_path, new_turtle_name=None):
    """
    Called when Admin clicks "No Match - Create New Site".
    1. Creates new Site Folder.
    2. Saves .npz data.
    3. Updates Metadata/DB.
    4. Updates FAISS.
    """
    vocab = load_vocabulary()
    index = load_faiss_index()
    metadata = load_metadata()  # Load current list

    # A. Generate New Site ID
    # Find the highest existing site_id and add 1
    existing_ids = [m['site_id'] for m in metadata]
    new_site_id = max(existing_ids) + 1 if existing_ids else 1

    print(f"Creating New Site ID: {new_site_id}")

    # B. Create Folder Structure
    # e.g. backend/data/site_101/
    site_folder = os.path.join(os.path.dirname(image_path), f"site_{new_site_id}")
    os.makedirs(site_folder, exist_ok=True)

    # C. Save the Data (.npz)
    filename = os.path.basename(image_path)
    save_path = os.path.join(site_folder, filename.replace('.jpg', '.npz').replace('.png', '.npz'))

    success, descriptors = process_image_through_SIFT(image_path, save_path)
    if not success:
        return False

    # D. Update FAISS (Live Indexing)
    # We need the VLAD vector for the index
    new_vlad = process_new_image(image_path, vocab)
    add_new_turtle_image_to_index(index, new_vlad)  # Adds to RAM index

    # Save index to disk so we don't lose it on restart
    faiss.write_index(index, DEFAULT_INDEX_PATH)

    # E. Update Metadata (The "Database")
    new_entry = {
        'filename': filename,
        'original_index': index.ntotal - 1,  # The last index we just added
        'site_id': new_site_id,
        'name': new_turtle_name
    }
    metadata.append(new_entry)
    joblib.dump(metadata, DEFAULT_METADATA_PATH)

    return new_site_id



def process_image_through_SIFT(image_path, output_path):
    """
    ARCHIVER
    """
    SIFT = get_SIFT()
    imgGray = cv.imread(image_path, cv.IMREAD_GRAYSCALE)
    if imgGray is None:
        print(f"Failed to load Image: {image_path}")
        return False, None

    #Applying CLAHE here
    clahe = get_CLAHE()
    imgGray = clahe.apply(imgGray)

    keypoints, descriptors = SIFT.detectAndCompute(imgGray, None)

    if descriptors is None or len(descriptors) == 0:
        print(f"No descriptors found for: {image_path}")
        return False, None
    
    #Serializing keypoints
    kp_array = np.array([
        (kp.pt, kp.size, kp.angle, kp.response, kp.octave, kp.class_id)
        for kp in keypoints
    ], dtype=object)

    #img_with_keypoints = cv.drawKeypoints(imgGray, keypoints, imgGray,
                                          #flags=cv.DRAW_MATCHES_FLAGS_DRAW_RICH_KEYPOINTS)
    #plt.imshow(img_with_keypoints)
    #plt.show()


    try:
        np.savez(output_path,
                 #image=img_with_keypoints,
                 keypoints=kp_array,
                 descriptors=descriptors)
        return True, descriptors
    except Exception as e:
        print(f"Failed to save NPZ to {output_path}: {e}")
        return False, None

def process_new_image(image_path, kmeans_vocab):
    """
    [SEARCHER] Processes an uploaded image and returns the VLAD vector (in memory).
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


# --- Search Logic (Diversity Search) ---

def search_unique_sites(image_path, k_results=5):
    """
    #Finds matches but ensures diversity (1 match per site).
    """
    vocab = load_vocabulary()
    index = load_faiss_index()
    metadata = load_metadata()

    if vocab is None or index is None or not metadata: return []

    query_vector = process_new_image(image_path, vocab)
    if query_vector is None: return []

    # Search deeper (50) to find 5 unique sites
    distances, indices = index.search(query_vector, k_results * 10)

    distances = distances[0]
    indices = indices[0]

    unique_results = []
    seen_sites = set()

    for i, idx in enumerate(indices):
        if idx == -1: continue

        match_info = metadata[idx]
        site_id = match_info['site_id']

        if site_id not in seen_sites:
            seen_sites.add(site_id)
            unique_results.append({
                'filename': match_info['filename'],
                'site_id': site_id,
                'distance': float(distances[i]),
            })

        if len(unique_results) >= k_results: break

    return unique_results

def SIFT_from_file(file_path):
    #Fetching NPZ from pre processed files
    try:
        data = np.load(file_path, allow_pickle=True)
        imgGray = data['image']
        kp_array = data['keypoints']
        descriptors = data['descriptors']

        keypoints = [
            cv.KeyPoint(pt[0], pt[1], size, angle, response, octave, class_id)
            for (pt, size, angle, response, octave, class_id) in kp_array
        ]

        return imgGray, keypoints, descriptors, os.path.basename(file_path)
    except Exception as e:
        print(f"Error loading NPZ {file_path}: {e}")
        return None, [], None, os.path.basename(file_path)

def train_and_save_vocabulary(npz_directory, vocab_output_path, num_clusters=64):
    all_descriptors = load_all_descriptors(npz_directory)
    if all_descriptors is None:
        print("Vocab Training Failed")
        return None

    print(f"Training k-means vocabulary with {len(all_descriptors)} descriptors...")
    kmeans = build_vocabulary(all_descriptors, num_clusters=num_clusters)

    # Save the trained model
    joblib.dump(kmeans, vocab_output_path)
    print(f"Vocabulary saved to {vocab_output_path}")
    return kmeans


def get_vlad_vectors(npz_directory, kmeans_model):
    vlad_vectors = []
    labels = []

    file_paths = [os.path.join(npz_directory, f) for f in os.listdir(npz_directory) if f.endswith(".npz")]

    for path in file_paths:
        _, _, descriptors, name = SIFT_from_file(path)

        if descriptors is not None:
            vlad = compute_vlad(descriptors, kmeans_model)
            vlad_vectors.append(vlad)
            labels.append(name)

    return labels, np.array(vlad_vectors)


def reduce_with_pca(vectors, n_components=2):
    #PCA used here to reduce var count without losing valuable data
    if vectors.shape[0] < n_components:
        print(f"Not enough samples ({vectors.shape[0]}) for PCA with {n_components} components.")
        return None

    reduced = PCA(n_components=n_components).fit_transform(vectors)
    return reduced


def generate_clustering_and_index(npz_directory,
                                  vocab_save_path=DEFAULT_VOCAB_PATH,
                                  index_save_path=DEFAULT_INDEX_PATH,
                                  metadata_save_path=DEFAULT_METADATA_PATH,
                                  vlad_array_save_path=DEFAULT_VLAD_ARRAY_PATH,
                                  num_clusters=64, dbscan_eps=0.5, dbscan_min_samples=5):
    """
    [MASTER SETUP] Run ONCE. Processes data, Clusters Sites, Builds Index.
    """
    stacked_descriptors, file_metadata = load_all_descriptors(npz_directory)
    if stacked_descriptors is None: return None

    # 2. Train Vocabulary
    print("Training Vocabulary...")
    kmeans_vocab = build_vocabulary(stacked_descriptors, num_clusters=num_clusters)
    joblib.dump(kmeans_vocab, vocab_save_path)

    # 3. Compute VLAD
    print("Generating VLAD vectors...")
    all_vlad_vectors = []
    valid_metadata = []

    for meta in file_metadata:
        file_path = os.path.join(npz_directory, meta['filename'])
        try:
            data = np.load(file_path, allow_pickle=True)
            descriptors = data.get('descriptors')
            if descriptors is not None and len(descriptors) > 0:
                vlad = compute_vlad(descriptors, kmeans_vocab)
                all_vlad_vectors.append(vlad)
                valid_metadata.append(meta)
        except Exception: pass

    vlad_array = np.array(all_vlad_vectors).astype('float32')
    np.save(vlad_array_save_path, vlad_array)
    print(f"Global VLAD Array saved to {vlad_array_save_path}")
    # 4. DBSCAN
    print("Running DBSCAN...")
    site_labels = run_initial_dbscan(vlad_array, eps=dbscan_eps, min_samples=dbscan_min_samples)

    # 5. Build Metadata Map
    final_metadata = []
    for i, meta in enumerate(valid_metadata):
        final_metadata.append({
            'filename': meta['filename'],
            'original_index': meta['original_index'],
            'site_id': int(site_labels[i])
        })
    joblib.dump(final_metadata, metadata_save_path)

    # 6. Build FAISS
    print("Building FAISS Index...")
    global_index = initialize_faiss_index(vlad_array)
    faiss.write_index(global_index, index_save_path)

    return kmeans_vocab, site_labels

