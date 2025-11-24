
import cv2 as cv
import numpy as np
import os
import joblib
from matplotlib import pyplot as plt

from vlad_utils import build_vocabulary, compute_vlad
from sklearn.decomposition import PCA


#Initialization
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


def load_vocabulary(vocab_path):
    print('Loading vocabulary...')
    if not os.path.exists(vocab_path):
        print('Vocabulary not found.')
        return None
    return joblib.load(vocab_path)

def load_all_descriptors(npz_path):
    #Will scan our directory to load all descriptor files
    all_descriptors = []
    print('Loading descriptors...')
    file_paths = [os.path.join(npz_path, f) for f in os.listdir(npz_path) if f.endswith(".npz")]

    for file_path in file_paths:
        try:
            data = np.load(file_path, allow_pickle=True)
            if 'descriptors' in data and data['descriptors'] is not None:
                all_descriptors.append(data['descriptors'])
        except Exception as e:
            print(f"Warning: could not load or read {file_path}: {e}")

    if not all_descriptors:
        print("No descriptors found")
        return None, []
    return np.vstack(all_descriptors)

#Core Functionality

def process_image_through_SIFT(image_path, output_path):
    SIFT = get_SIFT()
    imgGray = cv.imread(image_path, cv.IMREAD_GRAYSCALE)
    if imgGray is None:
        print(f"Failed to load Image: {image_path}")
        return False, None

    #Applying CLAHE here
    clahe = get_CLAHE()
    imgGray = clahe.apply(imgGray)

    keypoints, descriptors = SIFT.detectAndCompute(imgGray, None)

    if descriptors is None:
        print(f"No descriptors found for: {image_path}")
        return False, None
    
    #Serializing keypoints
    kp_array = np.array([
        (kp.pt, kp.size, kp.angle, kp.response, kp.octave, kp.class_id)
        for kp in keypoints
    ], dtype=object)

    img_with_keypoints = cv.drawKeypoints(imgGray, keypoints, imgGray,
                                          flags=cv.DRAW_MATCHES_FLAGS_DRAW_RICH_KEYPOINTS)
    plt.imshow(img_with_keypoints)
    plt.show()
    try:
        np.savez(output_path,
                 image=img_with_keypoints,
                 keypoints=kp_array,
                 descriptors=descriptors)
        return True, descriptors
    except Exception as e:
        print(f"Failed to save NPZ to {output_path}: {e}")
        return False, None

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