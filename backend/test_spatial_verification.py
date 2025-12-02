import sys
import os
import unittest
from unittest.mock import MagicMock, patch
import numpy as np
import cv2 as cv

# --- PATH FIX: Allow importing from the same directory ---
# This gets the folder where THIS test file lives
current_dir = os.path.dirname(os.path.abspath(__file__))

# If this folder is not in the python path, add it.
if current_dir not in sys.path:
    sys.path.append(current_dir)

# NOW we can safely import the sibling file
from image_processing import rerank_results_with_spatial_verification, extract_features_from_image, SIFT_from_file

class TestSpatialVerification(unittest.TestCase):

    def setUp(self):
        # Common test data
        self.query_path = "query.jpg"
        self.dummy_kp = [cv.KeyPoint(x=10, y=10, size=1), cv.KeyPoint(x=20, y=20, size=1),
                         cv.KeyPoint(x=30, y=30, size=1), cv.KeyPoint(x=40, y=40, size=1)]
        self.dummy_des = np.random.rand(4, 128).astype(np.float32)

    @patch('backend.turtles.image_processing.extract_features_from_image')
    def test_01_empty_input(self, mock_extract):
        """
        Path 1: 'if not initial_results' is True.
        Logic: Should return empty list immediately.
        """
        #from backend.turtles.image_processing import rerank_results_with_spatial_verification

        results = rerank_results_with_spatial_verification(self.query_path, [])

        self.assertEqual(results, [])
        mock_extract.assert_not_called()  # Should verify we didn't waste time extracting

    @patch('backend.turtles.image_processing.extract_features_from_image')
    def test_02_query_extraction_fails(self, mock_extract):
        """
        Path 2: 'if des_query is None' is True.
        Logic: Query image is unreadable or has no features. Should return original list unmodified.
        """
        #from backend.turtles.image_processing import rerank_results_with_spatial_verification

        # Simulate extraction returning None
        mock_extract.return_value = (None, None)

        initial = [{'file_path': 'cand1.npz'}]
        results = rerank_results_with_spatial_verification(self.query_path, initial)

        self.assertEqual(results, initial)
        # Ensure we printed the error message (mock print would verify this)

    @patch('backend.turtles.image_processing.extract_features_from_image')
    @patch('os.path.exists')
    def test_03_candidate_file_missing(self, mock_exists, mock_extract):
        """
        Path 3: 'if not candidate_path or not os.path.exists' is True.
        Logic: Candidate file is missing. Should verify loop continues (SKIP File).
        """
        #from backend.turtles.image_processing import rerank_results_with_spatial_verification

        mock_extract.return_value = (self.dummy_kp, self.dummy_des)
        # Simulate file NOT existing
        mock_exists.return_value = False

        initial = [{'file_path': 'ghost_file.npz', 'id': 1}]
        results = rerank_results_with_spatial_verification(self.query_path, initial)

        # Result should be sorted (same list essentially, but processed)
        self.assertEqual(len(results), 1)
        # Since it skipped, 'spatial_score' should NOT be added (or 0 if initialized elsewhere)
        self.assertNotIn('spatial_score', results[0])

    @patch('backend.turtles.image_processing.extract_features_from_image')
    @patch('os.path.exists')
    @patch('backend.turtles.image_processing.SIFT_from_file')
    def test_04_candidate_no_descriptors(self, mock_sift_load, mock_exists, mock_extract):
        """
        Path 4: 'if des_candidate is None' is True.
        Logic: NPZ file exists but is empty/corrupt. Should verify loop continues (SKIP No Desc).
        """
        #from backend.turtles.image_processing import rerank_results_with_spatial_verification

        mock_extract.return_value = (self.dummy_kp, self.dummy_des)
        mock_exists.return_value = True
        # Simulate loading failing to return descriptors
        mock_sift_load.return_value = (None, None, None, None)

        initial = [{'file_path': 'corrupt.npz'}]
        results = rerank_results_with_spatial_verification(self.query_path, initial)

        self.assertEqual(len(results), 1)
        self.assertNotIn('spatial_score', results[0])

    @patch('backend.turtles.image_processing.extract_features_from_image')
    @patch('os.path.exists')
    @patch('backend.turtles.image_processing.SIFT_from_file')
    @patch('cv2.BFMatcher')
    def test_05_match_exception(self, mock_bf, mock_sift_load, mock_exists, mock_extract):
        """
        Path 5: 'except Exception as e' is triggered.
        Logic: Something goes wrong during matching (e.g., dimension mismatch).
        """
        #from backend.turtles.image_processing import rerank_results_with_spatial_verification

        mock_extract.return_value = (self.dummy_kp, self.dummy_des)
        mock_exists.return_value = True
        mock_sift_load.return_value = (None, self.dummy_kp, self.dummy_des, "name")

        # Force the Matcher to raise an error
        mock_matcher = MagicMock()
        mock_matcher.knnMatch.side_effect = Exception("Dimension Mismatch!")
        mock_bf.return_value = mock_matcher

        initial = [{'file_path': 'valid.npz'}]
        results = rerank_results_with_spatial_verification(self.query_path, initial)

        # Function should catch error, print it, and continue, returning the list
        self.assertEqual(len(results), 1)

    @patch('backend.turtles.image_processing.extract_features_from_image')
    @patch('os.path.exists')
    @patch('backend.turtles.image_processing.SIFT_from_file')
    @patch('cv2.BFMatcher')
    def test_06_few_matches_no_homography(self, mock_bf, mock_sift_load, mock_exists, mock_extract):
        """
        Path 6: 'if len(good) >= 4' is False.
        Logic: Not enough visual similarity to even attempt geometry check.
        """
        #from backend.turtles.image_processing import rerank_results_with_spatial_verification

        mock_extract.return_value = (self.dummy_kp, self.dummy_des)
        mock_exists.return_value = True
        mock_sift_load.return_value = (None, self.dummy_kp, self.dummy_des, "name")

        # Mock matches so none pass the ratio test
        mock_matcher = MagicMock()
        # Create dummy matches with huge distance so ratio test fails
        bad_match = MagicMock();
        bad_match.distance = 100
        good_match = MagicMock();
        good_match.distance = 10
        # knnMatch returns list of lists [[m, n], [m, n]]
        # We return a structure that fails "m.distance < 0.7 * n.distance"
        mock_matcher.knnMatch.return_value = [[bad_match, good_match]]
        mock_bf.return_value = mock_matcher

        initial = [{'file_path': 'valid.npz'}]
        results = rerank_results_with_spatial_verification(self.query_path, initial)

        # Inliers should default to 0
        self.assertEqual(results[0]['spatial_score'], 0)

    @patch('backend.turtles.image_processing.extract_features_from_image')
    @patch('os.path.exists')
    @patch('backend.turtles.image_processing.SIFT_from_file')
    @patch('cv2.BFMatcher')
    @patch('cv2.findHomography')
    def test_07_successful_match(self, mock_homography, mock_bf, mock_sift_load, mock_exists, mock_extract):
        """
        Path 7: 'if mask is not None' is True. (Success Case)
        Logic: Good matches found, Homography calculated, Inliers counted.
        """
        #from backend.turtles.image_processing import rerank_results_with_spatial_verification

        mock_extract.return_value = (self.dummy_kp, self.dummy_des)
        mock_exists.return_value = True
        mock_sift_load.return_value = (None, self.dummy_kp, self.dummy_des, "name")

        # 1. Setup Good Matches (>= 4)
        mock_matcher = MagicMock()
        # Create 5 perfect matches
        m = MagicMock();
        m.distance = 0.1;
        m.queryIdx = 0;
        m.trainIdx = 0
        n = MagicMock();
        n.distance = 1.0  # 0.1 < 0.7 * 1.0 is True
        matches = [[m, n]] * 5  # 5 matches
        mock_matcher.knnMatch.return_value = matches
        mock_bf.return_value = mock_matcher

        # 2. Setup Homography Success
        # Mask of 1s (all inliers)
        mock_mask = np.ones((5, 1), dtype=np.uint8)
        mock_homography.return_value = (np.eye(3), mock_mask)

        initial = [{'file_path': 'valid.npz'}]
        results = rerank_results_with_spatial_verification(self.query_path, initial)

        # Score should be sum of mask (5)
        self.assertEqual(results[0]['spatial_score'], 5)


if __name__ == '__main__':
    unittest.main()