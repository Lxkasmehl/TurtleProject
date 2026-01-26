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
        """
        Initializes the Neural Network stack.
        """
        # 1. Hardware Check
        if torch.cuda.is_available():
            self.device = torch.device("cuda")
            logger.info(f"✅ GPU DETECTED: {torch.cuda.get_device_name(0)}")
        else:
            self.device = torch.device("cpu")
            logger.warning("⚠️ GPU NOT DETECTED. Running in CPU slow mode.")

        # 2. Load SuperPoint (The Eye) - Extracts 2048 keypoints per image
        self.extractor = SuperPoint(max_num_keypoints=2048).eval().to(self.device)

        # 3. Load LightGlue (The Brain) - Geometric Matching
        self.matcher = LightGlue(features='superpoint', depth_confidence=0.9, width_confidence=0.95).eval().to(
            self.device)

    def process_and_save(self, image_path, output_pt_path):
        """
        INGEST/UPDATE STEP:
        Reads image -> GPU Extract -> CPU Move -> Save .pt file.
        """
        try:
            # Load Image
            img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
            if img is None:
                logger.error(f"❌ Could not read image: {image_path}")
                return False

            # Preprocess: Resize if image is massive (SuperPoint optimal < 1600px)
            h, w = img.shape
            if max(h, w) > 1600:
                scale = 1600 / max(h, w)
                img = cv2.resize(img, (int(w * scale), int(h * scale)))

            # Convert to Tensor
            tensor_img = utils.numpy_image_to_torch(img).to(self.device)

            # Extract Features
            with torch.inference_mode():
                feats = self.extractor.extract(tensor_img)

            # Move to CPU for storage (Save VRAM) & Strip batch dimension [0]
            feats_cpu = {k: v[0].cpu() for k, v in feats.items()}

            # Save/Overwrite to Disk
            torch.save(feats_cpu, output_pt_path)
            logger.info(f"💾 Features saved to {os.path.basename(output_pt_path)}")
            return True

        except Exception as e:
            logger.error(f"❌ Extraction failed for {image_path}: {e}")
            return False

    def match_query_against_db(self, query_path, db_index_list):
        """
        SEARCH STEP (Brute Force GPU):
        Matches query against list of DB paths.
        """
        # 1. Extract Query
        img = cv2.imread(query_path, cv2.IMREAD_GRAYSCALE)
        if img is None: return []

        # Resize query to match ingest logic
        h, w = img.shape
        if max(h, w) > 1600:
            scale = 1600 / max(h, w)
            img = cv2.resize(img, (int(w * scale), int(h * scale)))

        query_tensor = utils.numpy_image_to_torch(img).to(self.device)

        with torch.inference_mode():
            query_feats = self.extractor.extract(query_tensor)

        results = []

        # 2. Search Loop
        for db_pt_path, turtle_id, location in db_index_list:
            if not os.path.exists(db_pt_path): continue

            try:
                # Load Candidate Features (CPU -> GPU)
                cand_data = torch.load(db_pt_path)

                # Add batch dimension back and move to GPU
                cand_feats = {k: v.unsqueeze(0).to(self.device) for k, v in cand_data.items()}

                # Run LightGlue
                score, match_count = self._run_glue(query_feats, cand_feats)

                # 3. Thresholding (Reject Noise)
                if match_count > 10:
                    results.append({
                        'site_id': turtle_id,
                        'location': location,
                        'file_path': db_pt_path,
                        'score': match_count,
                        'confidence': score
                    })

            except Exception as e:
                # logger.error(f"Error matching {turtle_id}: {e}")
                continue

        # 4. Sort Results (High Score = Better)
        results.sort(key=lambda x: x['score'], reverse=True)
        torch.cuda.empty_cache()  # Cleanup VRAM

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


# --- SINGLETON INSTANCE ---
brain = TurtleDeepMatcher()


# --- COMPATIBILITY STUBS (Keeps older calls from crashing) ---
def load_or_generate_persistent_data(data_dir):
    return True


def process_image_through_SIFT(image_path, output_path):
    pt_path = output_path.replace(".npz", ".pt")
    success = brain.process_and_save(image_path, pt_path)
    return success, None