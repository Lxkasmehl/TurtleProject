import cv2 as cv
import numpy as np
import pickle
from .models import TurtleImage

def get_sift_match(query_image_path, min_match_count=20):

    sift = cv.SIFT_create()
    bf = cv.BFMatcher()


    img_query = cv.imread(query_image_path, cv.IMREAD_GRAYSCALE)
    if img_query is None:
        raise ValueError("Could not read query image")

    _, des_query = sift.detectAndCompute(img_query, None)
    if des_query is None:
        return None, "No descriptors found in query image"

    best_match_count = 0
    best_turtle_id = None


    all_refs = TurtleImage.objects.exclude(descriptors_blob=None)

    for ref_img in all_refs:
        try:
            des_ref = pickle.loads(ref_img.descriptors_blob)

            matches = bf.knnMatch(des_query, des_ref, k=2)

            good_match =[]
            for m, n in matches:
                if m.distance < 0.75 * n.distance:
                    good_match.append(m)

            if len(good_match) > best_match_count:
                best_match_count = len(good_match)
                best_turtle_id = ref_img.turtle.id

        except Exception as e:
            print(f"Error matching against image {ref_img.id}: {e}")
            continue

    if best_match_count >= min_match_count:
        return best_turtle_id, f"Match found with {best_match_count} keypoints"
    else:
        return None, f"No match found. Best was {best_match_count} (Threshold: {min_match_count})"