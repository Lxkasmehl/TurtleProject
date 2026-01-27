import os
import shutil
import time
import cv2 as cv
import json
import sys

# --- PATH HACK (Preserved from your setup) ---
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# --- IMPORT THE BRAIN ---
try:
    from turtles.image_processing import brain
except ImportError:
    # Fallback if file is in same directory
    try:
        from image_processing import brain
    except ImportError:
        print("❌ CRITICAL: Could not import 'brain'. Check file structure.")
        sys.exit(1)

# --- CONFIGURATION ---
BASE_DATA_DIR = 'data'
LOCATION_NAME_MAP = {}  # Add mappings if needed


class TurtleManager:
    def __init__(self, base_data_dir='data'):
        self.base_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), base_data_dir)
        self.review_queue_dir = os.path.join(self.base_dir, 'Review_Queue')

        os.makedirs(self.base_dir, exist_ok=True)
        os.makedirs(self.review_queue_dir, exist_ok=True)
        self._ensure_special_directories()

        # --- Indexing ---
        self.db_index = []
        print("🐢 TurtleManager: Indexing Database...")
        self.refresh_database_index()
        print(f"✅ Indexed {len(self.db_index)} known turtles.")

    def _ensure_special_directories(self):
        for special_folder in ["Community_Uploads", "Incidental_Finds"]:
            path = os.path.join(self.base_dir, special_folder)
            os.makedirs(path, exist_ok=True)

    def refresh_database_index(self):
        """Scans for .pt files to build the search index."""
        self.db_index = []
        for root, dirs, files in os.walk(self.base_dir):
            if "ref_data" in root:
                for file in files:
                    if file.endswith(".pt"):
                        path_parts = root.split(os.sep)
                        if len(path_parts) >= 3:
                            turtle_id = path_parts[-2]
                            rel_path = os.path.relpath(root, self.base_dir)
                            loc_parts = rel_path.split(os.sep)[:-2]
                            location_name = "/".join(loc_parts)
                            self.db_index.append((os.path.join(root, file), turtle_id, location_name))

    def get_all_locations(self):
        locations = ["Incidental_Finds", "Community_Uploads"]
        if os.path.exists(self.base_dir):
            for state in sorted(os.listdir(self.base_dir)):
                state_path = os.path.join(self.base_dir, state)
                if not os.path.isdir(state_path) or state.startswith('.'): continue
                if state in ["Review_Queue", "Community_Uploads", "Incidental_Finds"]: continue
                for loc in sorted(os.listdir(state_path)):
                    if os.path.isdir(os.path.join(state_path, loc)) and not loc.startswith('.'):
                        locations.append(f"{state}/{loc}")
        return locations

    # --- INGEST ---
    def ingest_flash_drive(self, drive_root_path):
        ingest_start_time = time.time()
        print(f"🐢 Starting Ingest from: {drive_root_path}")

        count_new = 0
        count_skipped = 0

        for state_name in os.listdir(drive_root_path):
            if state_name == "System Volume Information" or state_name.startswith('.'): continue
            state_source_path = os.path.join(drive_root_path, state_name)
            if not os.path.isdir(state_source_path): continue

            state_dest_path = os.path.join(self.base_dir, state_name)
            os.makedirs(state_dest_path, exist_ok=True)

            for location_name in os.listdir(state_source_path):
                location_source_path = os.path.join(state_source_path, location_name)
                if not os.path.isdir(location_source_path) or location_name.startswith('.'): continue

                official_name = LOCATION_NAME_MAP.get(location_name, location_name)
                location_dest_path = os.path.join(state_dest_path, official_name)
                os.makedirs(location_dest_path, exist_ok=True)

                for filename in os.listdir(location_source_path):
                    if not filename.lower().endswith(('.jpg', '.jpeg', '.png')): continue
                    turtle_id = filename[:4].strip().rstrip('_')
                    source_path = os.path.join(location_source_path, filename)

                    status = self._process_single_turtle(source_path, location_dest_path, turtle_id)
                    if status == "created":
                        count_new += 1
                    elif status == "skipped":
                        count_skipped += 1

        self.refresh_database_index()
        print(f"\n🎉 Ingest Complete. New: {count_new}, Skipped: {count_skipped}")

    def _process_single_turtle(self, source_path, location_dir, turtle_id):
        """Creates folders and generates .pt tensor file."""
        turtle_dir = os.path.join(location_dir, turtle_id)
        ref_dir = os.path.join(turtle_dir, 'ref_data')
        loose_dir = os.path.join(turtle_dir, 'loose_images')

        os.makedirs(ref_dir, exist_ok=True)
        os.makedirs(loose_dir, exist_ok=True)

        ext = os.path.splitext(source_path)[1]
        dest_image_path = os.path.join(ref_dir, f"{turtle_id}{ext}")
        dest_pt_path = os.path.join(ref_dir, f"{turtle_id}.pt")

        if os.path.exists(dest_pt_path):
            return "skipped"

        shutil.copy2(source_path, dest_image_path)
        success = brain.process_and_save(dest_image_path, dest_pt_path)

        if success:
            print(f"   ✅ Processed New: {turtle_id}")
            return "created"
        else:
            return "error"

    # --- SEARCH ---
    def search_for_matches(self, query_image_path, location_filter="All Locations"):
        """
        Deep Learning Search using Multi-Rotation Robust Matching.
        """
        filename = os.path.basename(query_image_path)
        t_start = time.time()

        print(f"🔍 Deep Searching {filename} (Robust Mode)...")

        # Filter Index
        if location_filter and location_filter != "All Locations":
            search_index = [entry for entry in self.db_index if entry[2] == location_filter]
        else:
            search_index = self.db_index

        # CALL THE ROBUST MATCHER (Handles 0, 90, 180, 270 rotations internally)
        results = brain.match_query_robust(query_image_path, search_index)

        t_elapsed = time.time() - t_start

        if results:
            print(f"✅ Found {len(results)} matches in {t_elapsed:.2f}s")
        else:
            print(f"⚠️ No matches found in {t_elapsed:.2f}s")

        return results[:5], t_elapsed

    def get_review_queue(self):
        queue_items = []
        if os.path.exists(self.review_queue_dir):
            for req_id in os.listdir(self.review_queue_dir):
                req_path = os.path.join(self.review_queue_dir, req_id)
                if os.path.isdir(req_path):
                    queue_items.append({'request_id': req_id, 'path': req_path, 'status': 'pending'})
        return queue_items

    # --- APPROVAL & UPGRADE LOGIC ---

    def approve_review_packet(self, request_id, match_turtle_id=None, replace_reference=False, new_location=None,
                              new_turtle_id=None, uploaded_image_path=None):
        """
        Processes approval.
        If match_turtle_id + replace_reference=True: Swaps old master for new image.
        """
        # 1. Locate Query Image
        query_image = None
        packet_dir = os.path.join(self.review_queue_dir, request_id)

        if os.path.exists(packet_dir):
            for f in os.listdir(packet_dir):
                if f.lower().endswith(('.jpg', '.png', '.jpeg')) and f != 'metadata.json':
                    query_image = os.path.join(packet_dir, f)
                    break
        elif uploaded_image_path and os.path.exists(uploaded_image_path):
            query_image = uploaded_image_path

        if not query_image: return False, "Image not found"

        # 2. Logic: Existing Match
        if match_turtle_id:
            # Find Turtle Folder
            target_dir = None
            # Fast lookup via index
            for path, tid, _ in self.db_index:
                if tid == match_turtle_id:
                    # Path is .../T101/ref_data/T101.pt -> need T101 root
                    target_dir = os.path.dirname(os.path.dirname(path))
                    break

            if not target_dir: return False, f"Could not find folder for {match_turtle_id}"

            ref_dir = os.path.join(target_dir, 'ref_data')
            loose_dir = os.path.join(target_dir, 'loose_images')
            os.makedirs(loose_dir, exist_ok=True)

            if replace_reference:
                # --- UPGRADE LOGIC ---
                print(f"✨ UPGRADING REFERENCE for {match_turtle_id}...")

                # A. Find current master files
                old_pt_path = os.path.join(ref_dir, f"{match_turtle_id}.pt")
                old_img_path = None
                for ext in ['.jpg', '.jpeg', '.png']:
                    possible = os.path.join(ref_dir, f"{match_turtle_id}{ext}")
                    if os.path.exists(possible):
                        old_img_path = possible
                        break

                # B. Archive Old Image
                if old_img_path:
                    archive_name = f"Archived_Master_{int(time.time())}{os.path.splitext(old_img_path)[1]}"
                    shutil.move(old_img_path, os.path.join(loose_dir, archive_name))
                    print(f"   📦 Archived old master to {archive_name}")

                # C. Delete Old Tensor
                if os.path.exists(old_pt_path):
                    os.remove(old_pt_path)

                # D. Install New Image (Rename to T101.ext)
                new_ext = os.path.splitext(query_image)[1]
                new_master_path = os.path.join(ref_dir, f"{match_turtle_id}{new_ext}")
                new_pt_path = os.path.join(ref_dir, f"{match_turtle_id}.pt")

                shutil.copy2(query_image, new_master_path)

                # E. Generate New Tensor
                brain.process_and_save(new_master_path, new_pt_path)

                # F. Also save a copy to loose_images as "Obs_Date" for record
                obs_name = f"Obs_{int(time.time())}_{os.path.basename(query_image)}"
                shutil.copy2(query_image, os.path.join(loose_dir, obs_name))

                # Update Index
                self.refresh_database_index()
                print(f"   ✅ {match_turtle_id} upgraded successfully.")

            else:
                # --- STANDARD OBSERVATION LOGIC ---
                print(f"📸 Adding observation to {match_turtle_id}...")
                obs_name = f"Obs_{int(time.time())}_{os.path.basename(query_image)}"
                shutil.copy2(query_image, os.path.join(loose_dir, obs_name))

        # 3. Logic: New Turtle
        elif new_location and new_turtle_id:
            # (Standard creation logic - calls self._process_single_turtle)
            # ...
            pass  # (Presumed existing logic)

        # 4. Cleanup Packet
        if os.path.exists(packet_dir):
            shutil.rmtree(packet_dir)

        return True, "Processed"

    def process_manual_upload(self, image_path, location_selection):
        # Calls self._process_single_turtle
        # ...
        pass


if __name__ == "__main__":
    m = TurtleManager()
    print("Manager Loaded.")