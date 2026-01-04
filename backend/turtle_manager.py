import os
import shutil
import time

import cv2 as cv
import json

# We import your existing SIFT logic to reuse it
from image_processing import *

# --- CONFIGURATION ---
BASE_DATA_DIR = 'data'

LOCATION_NAME_MAP = {
    #"CBPS": "WT",
    #"North Topeka": "NT",
}


class TurtleManager:
    def __init__(self, base_data_dir='data'):
        # backend/data/
        self.base_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), base_data_dir)
        self.review_queue_dir = os.path.join(self.base_dir, 'Review_Queue')

        os.makedirs(self.base_dir, exist_ok=True)
        os.makedirs(self.review_queue_dir, exist_ok=True)

        self._ensure_special_directories()

        print("🐢 TurtleManager: Loading Search Index & Vocabulary...")
        load_or_generate_persistent_data(self.base_dir)
        print("✅ Resources Ready.")

    def _ensure_special_directories(self):
        """Creates the folder roots for Community and Incidental finds."""
        for special_folder in ["Community_Uploads", "Incidental_Finds"]:
            path = os.path.join(self.base_dir, special_folder)
            os.makedirs(path, exist_ok=True)

    def get_official_location_name(self, folder_name):
        """Translates acronyms (CBPS) to official names (Central Biological Preserve)."""
        return LOCATION_NAME_MAP.get(folder_name, folder_name)

    def get_all_locations(self):
        """
        Scans the data folder to build a list of locations for the GUI Dropdown.
        Returns: ["Nebraska/Topeka", "Kansas/Karlyle Woods", "Incidental_Finds", ...]
        """
        locations = ["Incidental_Finds", "Community_Uploads"]

        if os.path.exists(self.base_dir):
            # Loop through States
            for state in sorted(os.listdir(self.base_dir)):
                state_path = os.path.join(self.base_dir, state)
                if not os.path.isdir(state_path) or state.startswith('.'): continue
                if state in ["Review_Queue", "Community_Uploads", "Incidental_Finds"]: continue

                # Loop through Locations
                for loc in sorted(os.listdir(state_path)):
                    if os.path.isdir(os.path.join(state_path, loc)) and not loc.startswith('.'):
                        locations.append(f"{state}/{loc}")

        return locations

    def process_manual_upload(self, image_path, location_selection):
        """
        Handles the GUI Manual Upload.
        Parses 'State/Location' string and calls the processor.
        """
        # 1. Determine Destination Folder
        if "/" in location_selection:
            state, loc = location_selection.split("/", 1)
            location_dir = os.path.join(self.base_dir, state, loc)
        else:
            # Handle roots like "Incidental_Finds"
            location_dir = os.path.join(self.base_dir, location_selection)

        if not os.path.exists(location_dir):
            os.makedirs(location_dir, exist_ok=True)

        # 2. Extract ID (First 4 chars)
        filename = os.path.basename(image_path)
        turtle_id = filename[:4].strip().rstrip('_')

        # 3. Run the standard processor
        print(f"Manual Upload: Processing {turtle_id} into {location_dir}...")
        return self._process_single_turtle(image_path, location_dir, turtle_id)


    def get_review_queue(self):
        """
        RECOVERS STATE ON RESTART.
        Scans the 'Review_Queue' folder and returns the list of pending requests.
        """
        queue_items = []

        # If the server restarted, this loop finds all the folders we haven't finished yet
        if os.path.exists(self.review_queue_dir):
            for req_id in os.listdir(self.review_queue_dir):
                req_path = os.path.join(self.review_queue_dir, req_id)

                if os.path.isdir(req_path):
                    # Basic info to send to frontend
                    queue_items.append({
                        'request_id': req_id,
                        'path': req_path,
                        'status': 'pending'  # If it's in this folder, it is pending
                    })

        print(f"📋 Review Queue Loaded: {len(queue_items)} pending items.")
        return queue_items



    def create_new_location(self, state_name, location_name):
        """
        Future Use: Allows Admin to generate a new research site folder from the GUI.
        """
        official_name = self.get_official_location_name(location_name)
        path = os.path.join(self.base_dir, state_name, official_name)

        if not os.path.exists(path):
            os.makedirs(path)
            print(f"✅ Created new location: {state_name}/{official_name}")
            return path
        else:
            print(f"⚠️ Location already exists: {state_name}/{official_name}")
            return path

    def ingest_flash_drive(self, drive_root_path):
        """
        Scans drive, extracts 'Letter+3Digit' ID, creates folders, and skips duplicates.
        """
        print(f"🐢 Starting Ingest from: {drive_root_path}")
        if not os.path.exists(drive_root_path):
            print("❌ Error: Drive path does not exist.")
            return

        count_new = 0
        count_skipped = 0

        for state_name in os.listdir(drive_root_path):

            if state_name == "System Volume Information" or state_name.startswith('.'):
                continue

            state_source_path = os.path.join(drive_root_path, state_name)
            if not os.path.isdir(state_source_path): continue

            state_dest_path = os.path.join(self.base_dir, state_name)
            os.makedirs(state_dest_path, exist_ok=True)

            for location_name in os.listdir(state_source_path):
                location_source_path = os.path.join(state_source_path, location_name)
                if not os.path.isdir(location_source_path) or location_name.startswith('.'): continue

                official_name = self.get_official_location_name(location_name)
                location_dest_path = os.path.join(state_dest_path, official_name)
                os.makedirs(location_dest_path, exist_ok=True)

                for filename in os.listdir(location_source_path):
                    if not filename.lower().endswith(('.jpg', '.jpeg', '.png')): continue

                    # --- CHANGE 1: Extract only the first 4 chars (Letter + 3 Numbers) ---
                    # Example: "T101_date.jpg" -> "T101"
                    turtle_id = filename[:4].strip().rstrip('_')

                    source_path = os.path.join(location_source_path, filename)

                    # Call helper (which handles the duplicate skipping logic)
                    status = self._process_single_turtle(source_path, location_dest_path, turtle_id)

                    if status == "created":
                        count_new += 1
                    elif status == "skipped":
                        count_skipped += 1

        print(f"\n🎉 Ingest Complete. New: {count_new}, Skipped (Existing/Duplicates): {count_skipped}")

    def _process_single_turtle(self, source_path, location_dir, turtle_id):
        """
        Checks if NPZ exists (Duplicate/Resume check).
        If new, renames image to 'TurtleID.jpg' and generates 'TurtleID.npz'.
        """
        # backend/data/State/Location/T101/
        turtle_dir = os.path.join(location_dir, turtle_id)
        ref_dir = os.path.join(turtle_dir, 'ref_data')
        loose_dir = os.path.join(turtle_dir, 'loose_images')

        os.makedirs(ref_dir, exist_ok=True)
        os.makedirs(loose_dir, exist_ok=True)

        # --- CHANGE 2: Rename files to match the ID exactly ---
        # Get original extension (e.g. .jpg)
        ext = os.path.splitext(source_path)[1]

        # Save as T101.jpg
        dest_image_path = os.path.join(ref_dir, f"{turtle_id}{ext}")
        # Save as T101.npz
        dest_npz_path = os.path.join(ref_dir, f"{turtle_id}.npz")

        # --- THE "SKIP DUPLICATE" CHECK ---
        # If T101.npz exists, we assume this ID is already processed for this location.
        # This handles both restarting the server AND multiple images for T101 in the source folder.
        if os.path.exists(dest_npz_path):
            return "skipped"

        # If we get here, it is the FIRST time seeing this ID in this location.
        shutil.copy2(source_path, dest_image_path)
        success, _ = process_image_through_SIFT(dest_image_path, dest_npz_path)

        if success:
            print(f"   ✅ Processed New: {turtle_id}")
            return "created"
        else:
            print(f"   ⚠️ SIFT Failed: {turtle_id}")
            return "error"



    def handle_community_upload(self, image_path, finder_name="Anonymous"):
        """
        Saves an image to 'backend/data/Community_Uploads/FinderName/'.
        """
        dest_folder = os.path.join(self.base_dir, "Community_Uploads", finder_name)
        os.makedirs(dest_folder, exist_ok=True)

        filename = os.path.basename(image_path)
        saved_path = os.path.join(dest_folder, filename)
        shutil.copy2(image_path, saved_path)
        print(f"Saved community find by {finder_name}")

        # --- NEW: Automatically Create a Review Packet for this upload ---
        # This puts it into the Admin's "Inbox" (Queue) immediately
        self.create_review_packet(saved_path, user_info={"finder": finder_name})

    def create_review_packet(self, query_image_path, user_info=None):
        """
        Creates a folder in 'Review_Queue' containing the query image
        and copies of the Top 5 candidate matches found by AI.
        """
        # 1. Create Unique Request Folder
        request_id = f"Req_{int(time.time())}_{os.path.basename(query_image_path)}"
        packet_dir = os.path.join(self.review_queue_dir, request_id)
        candidates_dir = os.path.join(packet_dir, 'candidate_matches')

        os.makedirs(packet_dir, exist_ok=True)
        os.makedirs(candidates_dir, exist_ok=True)

        # 2. Save the Query Image
        filename = os.path.basename(query_image_path)
        query_save_path = os.path.join(packet_dir, filename)
        shutil.copy2(query_image_path, query_save_path)

        # 3. Save Metadata
        if user_info:
            with open(os.path.join(packet_dir, 'metadata.json'), 'w') as f:
                json.dump(user_info, f)

        print(f"🐢 Analysis: Running Smart Search for {filename}...")

        # 4. Run AI Search
        # Note: smart_search must return 'file_path' or 'filename' we can resolve
        results = smart_search(query_save_path, k_results=5)

        # 5. Populate the Candidate Folder
        if results:
            for i, match in enumerate(results):
                match_id = match.get('site_id', 'Unknown')
                score = int(match.get('distance', 0) * 100)

                # Logic to find the original file to copy
                # Ideally, smart_search should return 'file_path' in the dict.
                # If not, we might need to look it up.
                # For now, we assume 'file_path' exists or we construct it from filename if possible.
                original_path = match.get('file_path')

                if original_path and os.path.exists(original_path):
                    # We copy the .npz's corresponding .jpg if possible,
                    # otherwise we just copy what we have.
                    # Assumption: .npz and .jpg are in the same folder with same basename
                    base_path = os.path.splitext(original_path)[0]  # Remove .npz
                    possible_exts = ['.jpg', '.jpeg', '.png']
                    found_img = None
                    for ext in possible_exts:
                        if os.path.exists(base_path + ext):
                            found_img = base_path + ext
                            break

                    if found_img:
                        new_name = f"Rank{i + 1}_ID{match_id}_Score{score}.jpg"
                        shutil.copy2(found_img, os.path.join(candidates_dir, new_name))

        print(f"✅ Review Packet Created: {request_id}")
        return request_id

    # --- NEW: SEARCH & OBSERVATION LOGIC ---

    def search_for_matches(self, query_image_path):
        """
        Smart Search with "Auto-Mirror" fallback.
        1. Search Normal.
        2. If scores are low, flip image horizontal and search again.
        3. Return the best set of results.
        """
        MATCH_CONFIDENCE_THRESHOLD = 15

        filename = os.path.basename(query_image_path)
        print(f"🔍 Analyzing {filename} (Normal Orientation)...")

        # 1. First Pass (Normal)
        # Use existing smart_search
        candidates_normal = smart_search(query_image_path, k_results=20)
        results_normal = []

        # Rerank with RANSAC
        if candidates_normal:
            results_normal = rerank_results_with_spatial_verification(query_image_path, candidates_normal)

        # Get best score
        best_score_normal = 0
        if results_normal:
            best_score_normal = results_normal[0].get('spatial_score', 0)

        # 2. Check Threshold
        if best_score_normal >= MATCH_CONFIDENCE_THRESHOLD:
            print(f"✅ Good match found ({best_score_normal} matches). Returning results.")
            return results_normal[:5]

        # 3. Second Pass (Mirrored)
        print(f"⚠️ Low confidence ({best_score_normal} < {MATCH_CONFIDENCE_THRESHOLD}). Attempting Mirror Search...")

        # Generate Mirrored Image
        img = cv.imread(query_image_path)
        if img is None: return results_normal[:5]

        img_mirrored = cv.flip(img, 1)  # 1 = Horizontal Flip

        # Save temp file
        mirror_path = os.path.join(self.review_queue_dir, f"TEMP_MIRROR_{filename}")
        cv.imwrite(mirror_path, img_mirrored)

        try:
            candidates_mirror = smart_search(mirror_path, k_results=20)
            results_mirror = []
            if candidates_mirror:
                results_mirror = rerank_results_with_spatial_verification(mirror_path, candidates_mirror)

            best_score_mirror = 0
            if results_mirror:
                best_score_mirror = results_mirror[0].get('spatial_score', 0)

            print(f"   Normal Best: {best_score_normal} | Mirrored Best: {best_score_mirror}")

            # 4. Compare and Return Winner
            if best_score_mirror > best_score_normal:
                print("🪞 Mirrored orientation yielded better results! Switching view.")
                # Mark as mirrored for UI
                for res in results_mirror:
                    res['is_mirrored'] = True
                return results_mirror[:5]
            else:
                print("   Normal orientation was better.")
                return results_normal[:5]

        finally:
            # Cleanup temp file
            if os.path.exists(mirror_path):
                os.remove(mirror_path)

    def add_observation_to_turtle(self, source_image_path, turtle_id, location_hint=None):
        """
        Called when you click "Match!" on the GUI.
        Moves the uploaded image to that Turtle's 'loose_images' folder.
        """
        # 1. Find the turtle's home folder
        target_dir = None

        # Strategy A: Use the location hint from the match result
        if location_hint and location_hint != "Unknown":
            # Attempt to construct path: data/State/Location/TurtleID
            # (We might need to scan for the state if hint doesn't include it)
            possible_path = os.path.join(self.base_dir, location_hint, turtle_id)
            if os.path.exists(possible_path):
                target_dir = possible_path

        # Strategy B: If hint fails, scan the whole data folder for the ID
        if not target_dir:
            print(f"Scanning for home of {turtle_id}...")
            for root, dirs, files in os.walk(self.base_dir):
                if os.path.basename(root) == turtle_id:
                    target_dir = root
                    break

        if not target_dir:
            return False, f"Could not find folder for {turtle_id}"

        # 2. Move the image
        loose_dir = os.path.join(target_dir, 'loose_images')
        os.makedirs(loose_dir, exist_ok=True)

        filename = os.path.basename(source_image_path)
        # Optional: Rename to avoid collision?
        # For now, we keep original name or append timestamp
        save_name = f"Obs_{int(time.time())}_{filename}"
        dest_path = os.path.join(loose_dir, save_name)

        try:
            shutil.copy2(source_image_path, dest_path)
            print(f"✅ Observation added to {turtle_id}")
            return True, dest_path
        except Exception as e:
            return False, str(e)

    def approve_review_packet(self, request_id, match_turtle_id=None, new_location=None):
        """
        Called when Admin approves a packet.
        - If match_turtle_id is set: Adds image to that existing turtle's 'loose_images'.
        - If new_location is set: Creates a NEW turtle folder there.
        """
        packet_dir = os.path.join(self.review_queue_dir, request_id)
        if not os.path.exists(packet_dir):
            return False, "Request not found"

        # Find the uploaded image inside the packet (ignoring subfolders)
        query_image = None
        for f in os.listdir(packet_dir):
            if f.lower().endswith(('.jpg', '.png', '.jpeg')):
                query_image = os.path.join(packet_dir, f)
                break

        if not query_image:
            return "Error: No image found in packet."

        # Logic: existing match vs new turtle
        if match_turtle_id:
            # Move to existing folder (You will need a helper to find where TurtleID lives)
            # For now, we print what we would do
            print(f"Moving {query_image} to Turtle {match_turtle_id} loose_images...")
            # self._add_to_existing_turtle(match_turtle_id, query_image)

        elif new_location:
            # Treat as new turtle
            print(f"Creating new turtle from {query_image} at {new_location}...")
            # self._process_single_turtle(query_image, ..., new_location)

        try:
            shutil.rmtree(packet_dir)
            print(f"🗑️ Queue Item {request_id} deleted (Processed).")
            return True, "Processed successfully"
        except Exception as e:
            print(f"Error deleting packet: {e}")
            return False, str(e)

# --- TEST BLOCK ---
if __name__ == "__main__":
    manager = TurtleManager()
    # 1. Test Queue Persistence
    print("\n--- Checking Queue Status ---")
    manager.get_review_queue()

    # 2. Test Ingest
    path = input("\n(Optional) Enter Flash Drive Path to test Ingest: ")
    if path:
        manager.ingest_flash_drive(path)