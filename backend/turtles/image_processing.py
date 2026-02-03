import torch
from lightglue import LightGlue, SuperPoint, utils
import cv2
import numpy as np
import logging
import os

# --- LOGGING SETUP ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("TurtleBrain")


class TurtleDeepMatcher:
    def __init__(self):
        # 1. Hardware Check
        if torch.cuda.is_available():
            self.device = torch.device("cuda")
            logger.info(f"✅ GPU DETECTED: {torch.cuda.get_device_name(0)}")
        else:
            self.device = torch.device("cpu")
            logger.warning("⚠️ GPU NOT DETECTED. Running in CPU slow mode.")

        # 2. SuperPoint: INCREASED DETECTION THRESHOLD
        # We increase 'nms_radius' slightly to force points to spread out
        # We increase keypoints to 4096 to ensure we capture the turtle even with background noise
        self.extractor = SuperPoint(max_num_keypoints=4096, nms_radius=3).eval().to(self.device)

        # 3. LightGlue
        self.matcher = LightGlue(features='superpoint', depth_confidence=0.9, width_confidence=0.95).eval().to(
            self.device)
        # 4. Load Dataset into Ram
        self.feature_cache = {}


    def set_feature_cache(self, cache_dict):
        """Called by TurtleManager to push CPU-loaded features into the brain."""
        self.feature_cache = cache_dict
        logger.info(f"🧠 Brain: Feature cache synchronized ({len(cache_dict)} items).")

    def preprocess_image_robust(self, img):
        """
        Applies CLAHE and Scale normalization to handle 'Field Quality' images.
        """
        # 1. Resize if massive (Standardize scale)
        h, w = img.shape
        max_dim = 1200  # Slightly smaller than before to reduce noise
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

        # 2. CLAHE (Contrast Limited Adaptive Histogram Equalization)
        # This cuts through the "Shiny" glare and boosts shadow details
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        img_enhanced = clahe.apply(img)

        return img_enhanced

    def process_and_save(self, image_path, output_pt_path):
        """INGEST: Saves features for the 'Lab Quality' database images."""
        try:
            img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
            if img is None: return False

            # Use robust preprocessing even on ingest to match the domain
            img = self.preprocess_image_robust(img)

            tensor_img = utils.numpy_image_to_torch(img).to(self.device)

            with torch.inference_mode():
                feats = self.extractor.extract(tensor_img)

            feats_cpu = {k: v[0].cpu() for k, v in feats.items()}
            torch.save(feats_cpu, output_pt_path)
            return True
        except Exception as e:
            logger.error(f"❌ Extraction failed: {e}")
            return False

    def match_query_robust(self, query_path, db_index_list):
        """
        SEARCH: Performs a Multi-Rotation Brute Force Search.
        """
        # 1. Load and Preprocess Query
        img_raw = cv2.imread(query_path, cv2.IMREAD_GRAYSCALE)
        if img_raw is None: return []

        img_base = self.preprocess_image_robust(img_raw)

        # 2. Generate Rotations (0, 90, 180, 270)
        # This solves the "Sideways Turtle" problem
        rotations = [
            img_base,  # 0 deg
            cv2.rotate(img_base, cv2.ROTATE_90_CLOCKWISE),  # 90 deg
            cv2.rotate(img_base, cv2.ROTATE_180),  # 180 deg
            cv2.rotate(img_base, cv2.ROTATE_90_COUNTERCLOCKWISE)  # 270 deg
        ]

        # 3. Extract Features for ALL rotations once
        query_feats_list = []
        with torch.inference_mode():
            for rot_img in rotations:
                t_img = utils.numpy_image_to_torch(rot_img).to(self.device)
                query_feats_list.append(self.extractor.extract(t_img))

        results = []

        # 4. Search Loop
        # We compare DB images against ALL 4 rotations of the query
        for db_pt_path, turtle_id, location in db_index_list:
            if not os.path.exists(db_pt_path): continue

            try:
                # Load Candidate (Database is usually correctly oriented)
                cand_data = torch.load(db_pt_path)
                cand_feats = {k: v.unsqueeze(0).to(self.device) for k, v in cand_data.items()}

                best_score_for_turtle = 0
                best_conf_for_turtle = 0

                # Check against all 4 rotations
                for q_feats in query_feats_list:
                    score, match_count = self._run_glue(q_feats, cand_feats)
                    if match_count > best_score_for_turtle:
                        best_score_for_turtle = match_count
                        best_conf_for_turtle = score

                if best_score_for_turtle > 15:  # Noise threshold
                    results.append({
                        'site_id': turtle_id,
                        'location': location,
                        'file_path': db_pt_path,
                        'score': best_score_for_turtle,
                        'confidence': best_conf_for_turtle
                    })

            except Exception:
                continue

        results.sort(key=lambda x: x['score'], reverse=True)
        torch.cuda.empty_cache()
        return results

    def _run_glue(self, feats0, feats1):
        with torch.inference_mode():
            data = {'image0': feats0, 'image1': feats1}
            pred = self.matcher(data)
            matches = pred['matches0'][0]
            scores = pred['matching_scores0'][0]
            valid = matches > -1
            match_count = int(valid.sum().item())
            avg_conf = float(scores[valid].mean().item()) if match_count > 0 else 0.0
            return avg_conf, match_count


brain = TurtleDeepMatcher()


# COMPATIBILITY STUBS
def load_or_generate_persistent_data(data_dir): return True


def process_image_through_SIFT(image_path, output_path):
    pt_path = output_path.replace(".npz", ".pt")
    success = brain.process_and_save(image_path, pt_path)
    return success, None