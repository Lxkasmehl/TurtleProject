
import cv2 as cv
import numpy as np
import os
import joblib
from vlad_utils import build_vocabulary, compute_vlad
from sklearn.decomposition import PCA


#Initialization

#Creating the SIFT detector once instead of every time we need it

def get_SIFT():

    return cv.SIFT_create()

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
    file_paths = [os.path.join(npz_path, f) for f in os.listdir(npz_path)]

    for file_path in file_paths:
        try:
            data = np.load(file_path, allow_pickle=True)
