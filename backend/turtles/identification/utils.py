import os
import sys
from django.conf import settings
from .models import Turtle

# Fix import path to find image_processing in parent directory
try:
    import turtles.image_processing as image_processing
except ImportError:
    sys.path.append(str(settings.BASE_DIR))
    import image_processing


def get_abs_path(django_file_field):
    return os.path.join(settings.MEDIA_ROOT, django_file_field.name)


def process_turtle_image(turtle_image_instance):
    """
    Generates SIFT .npz for the uploaded image AND its mirror.
    """
    try:
        # 1. Process Original
        original_path = get_abs_path(turtle_image_instance.image)
        npz_path = os.path.splitext(original_path)[0] + ".npz"
        os.makedirs(os.path.dirname(npz_path), exist_ok=True)

        success, _ = image_processing.process_image_through_SIFT(original_path, npz_path)

        # 2. Process Mirror (if exists)
        if turtle_image_instance.mirror_image:
            mirror_path = get_abs_path(turtle_image_instance.mirror_image)
            mirror_npz_path = os.path.splitext(mirror_path)[0] + ".npz"
            os.makedirs(os.path.dirname(mirror_npz_path), exist_ok=True)
            image_processing.process_image_through_SIFT(mirror_path, mirror_npz_path)

        if success:
            turtle_image_instance.is_processed = True
            turtle_image_instance.save()
        return success
    except Exception as e:
        print(f"Processing Error: {e}")
        return False


def find_near_matches(turtle_image_instance, top_k=5):
    """
    Strategy: Search Original -> RANSAC -> If score < 15 -> Search Mirror -> Return Best.
    """
    MATCH_THRESHOLD = 15

    # Initialize Engine if needed
    if not image_processing.GLOBAL_RESOURCES['vocab']:
        data_dir = os.path.dirname(image_processing.DEFAULT_VOCAB_PATH)
        image_processing.load_or_generate_persistent_data(data_dir)

    # --- PASS 1: Original ---
    query_path = get_abs_path(turtle_image_instance.image)
    candidates = image_processing.smart_search(query_path, k_results=20)
    results_normal = []

    if candidates:
        results_normal = image_processing.rerank_results_with_spatial_verification(query_path, candidates)

    best_score = results_normal[0].get('spatial_score', 0) if results_normal else 0

    if best_score >= MATCH_THRESHOLD:
        return _format_results(results_normal[:top_k])

    # --- PASS 2: Mirror ---
    if turtle_image_instance.mirror_image:
        mirror_path = get_abs_path(turtle_image_instance.mirror_image)
        candidates_mirror = image_processing.smart_search(mirror_path, k_results=20)
        results_mirror = []

        if candidates_mirror:
            results_mirror = image_processing.rerank_results_with_spatial_verification(mirror_path, candidates_mirror)

        mirror_score = results_mirror[0].get('spatial_score', 0) if results_mirror else 0

        if mirror_score > best_score:
            return _format_results(results_mirror[:top_k], is_mirrored=True)

    return _format_results(results_normal[:top_k])


def _format_results(results_list, is_mirrored=False):
    formatted = []
    for res in results_list:
        raw_id = res.get('site_id', 'Unknown')

        # Look up details in SQL DB
        turtle_obj = None
        try:
            if raw_id and raw_id[0].isalpha():
                g = raw_id[0].upper()
                n = int(raw_id[1:])
                turtle_obj = Turtle.objects.filter(gender=g, turtle_number=n).first()
        except:
            pass

        # Build URL
        abs_path = res.get('file_path', '')
        img_url = ""
        if settings.MEDIA_ROOT in abs_path:
            rel = os.path.relpath(abs_path, settings.MEDIA_ROOT).replace("\\", "/")
            img_url = settings.MEDIA_URL + rel

        formatted.append({
            "turtle_id": turtle_obj.id if turtle_obj else 0,
            "biology_id": raw_id,
            "gender": turtle_obj.gender if turtle_obj else "?",
            "location": res.get('location', 'Unknown'),
            "match_score": res.get('spatial_score', 0),
            "image_url": img_url,
            "preview_image": img_url,
            "is_mirrored_match": is_mirrored
        })
    return formatted