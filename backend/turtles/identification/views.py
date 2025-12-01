import os
import shutil
from django.conf import settings
from django.db.models import Max
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.generics import GenericAPIView

from .models import Turtle, TurtleImage
from .utils import process_turtle_image, find_near_matches
from .serializers import TurtleImageUploadSerializer


class UploadAndIdentifyView(GenericAPIView):
    """
    Step 1: User uploads an image.
    - Image is saved to a temporary/unidentified turtle.
    - Image is processed (Original + Mirror).
    - Returns top 5 near matches to the frontend.
    """
    parser_classes = (MultiPartParser, FormParser)
    serializer_class = TurtleImageUploadSerializer

    def post(self, request, *args, **kwargs):
        file_obj = request.FILES.get('image')
        if not file_obj:
            return Response({"error": "No image provided"}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Create a TEMPORARY placeholder Turtle
        temp_turtle = Turtle.objects.create(
            gender='U',
            location_state='Unknown',
            location_specific='Pending_Review',
            turtle_number=0
        )

        # 2. Create the Image linked to this temp turtle
        turtle_image = TurtleImage.objects.create(
            turtle=temp_turtle,
            image=file_obj
        )

        # 3. Process the Image (SIFT/VLAD + Mirror Generation)
        success = process_turtle_image(turtle_image)
        if not success:
            return Response({"message": "Processing failed"}, status=500)

        # 4. Find Top 5 Near Matches
        near_matches = find_near_matches(turtle_image, top_k=5)

        return Response({
            "status": "queued",
            "message": "Image received and added to the review queue.",
            "uploaded_image_id": turtle_image.id,
            "matches": near_matches
        }, status=status.HTTP_201_CREATED)


class ReviewMatchView(APIView):
    """
    Step 2: Process the first item in the queue based on a provided Turtle ID.
    - If ID matches the queue item -> Update Metadata & Move Files (New Turtle).
    - If ID matches an existing turtle -> Link image to Existing (Merge & Delete Temp).
    """

    def post(self, request, *args, **kwargs):
        provided_id = request.data.get('turtle_id')

        # New Data from Frontend
        new_sex = request.data.get('sex')  # e.g., 'F'
        new_site = request.data.get('site')  # e.g., 'Wakarusa'

        if provided_id is None:
            return Response({"error": "No turtle_id provided"}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Get the current first item in the queue
        pending_turtle = Turtle.objects.filter(
            location_specific='Pending_Review'
        ).order_by('created_at').first()

        if not pending_turtle:
            return Response({"error": "Queue is empty."}, status=status.HTTP_404_NOT_FOUND)

        # =========================================================
        # SCENARIO A: IDs Match (Confirmed as NEW Turtle)
        # =========================================================
        if int(provided_id) == pending_turtle.id:

            # A1. Determine new Turtle Number (Auto-Increment)
            if pending_turtle.turtle_number == 0:
                max_num = Turtle.objects.aggregate(Max('turtle_number'))['turtle_number__max'] or 0
                pending_turtle.turtle_number = max_num + 1

            # A2. Update Database Record
            if new_sex:
                pending_turtle.gender = new_sex
            if new_site:
                pending_turtle.location_specific = new_site

            # Hardcode State to Kansas
            pending_turtle.location_state = 'Kansas'

            pending_turtle.save()

            # A3. Move & Rename Files
            images = pending_turtle.images.all()

            for i, img_obj in enumerate(images, start=1):
                # Construct paths
                ext = os.path.splitext(img_obj.image.name)[1]
                new_filename = f"{pending_turtle.biology_id}.[{i}]{ext}"
                new_rel_path = f"{pending_turtle.location_state}/{pending_turtle.location_specific}/{pending_turtle.biology_id}/{new_filename}"

                old_abs_path = os.path.join(settings.MEDIA_ROOT, img_obj.image.name)
                new_abs_path = os.path.join(settings.MEDIA_ROOT, new_rel_path)

                # Move Main Image
                if os.path.exists(old_abs_path):
                    os.makedirs(os.path.dirname(new_abs_path), exist_ok=True)
                    try:
                        shutil.move(old_abs_path, new_abs_path)
                        img_obj.image.name = new_rel_path
                    except Exception as e:
                        print(f"Error moving file: {e}")

                # Move Mirror Image
                if img_obj.mirror_image:
                    old_mirror_path = os.path.join(settings.MEDIA_ROOT, img_obj.mirror_image.name)
                    path_parts = new_rel_path.split('/')
                    folder = "/".join(path_parts[:-1])
                    name_root = os.path.splitext(path_parts[-1])[0]
                    new_mirror_rel = f"{folder}/mirrors/{name_root}_mirror{ext}"
                    new_mirror_abs = os.path.join(settings.MEDIA_ROOT, new_mirror_rel)

                    if os.path.exists(old_mirror_path):
                        os.makedirs(os.path.dirname(new_mirror_abs), exist_ok=True)
                        try:
                            shutil.move(old_mirror_path, new_mirror_abs)
                            img_obj.mirror_image.name = new_mirror_rel
                        except Exception as e:
                            print(f"Error moving mirror: {e}")

                img_obj.save()

            return Response({
                "status": "confirmed_new",
                "message": f"Turtle {pending_turtle.biology_id} created in {pending_turtle.location_specific}.",
                "turtle_id": pending_turtle.id
            })

        # =========================================================
        # SCENARIO B: IDs Do Not Match (Matched to EXISTING)
        # =========================================================
        else:
            try:
                target_turtle = Turtle.objects.get(id=provided_id)
            except Turtle.DoesNotExist:
                return Response({"error": f"Target Turtle {provided_id} does not exist."},
                                status=status.HTTP_404_NOT_FOUND)

            # Move images to target
            images = pending_turtle.images.all()
            for img in images:
                img.turtle = target_turtle
                img.save()

            # Delete temp
            temp_id = pending_turtle.id
            pending_turtle.delete()

            return Response({
                "status": "merged",
                "message": f"Image moved to Turtle {target_turtle.biology_id}.",
                "final_turtle_id": target_turtle.id
            })


class RetrieveReviewItemView(APIView):
    """
    Step 3: Admin fetches the next item in the review queue.
    - Finds the oldest 'Pending_Review' turtle.
    - Recalculates matches dynamically (so they are fresh).
    - Returns the turtle image, ID, and list of matches.
    """

    def get(self, request, *args, **kwargs):
        # 1. Find the first (oldest) turtle in the queue
        pending_turtle = Turtle.objects.filter(
            location_specific='Pending_Review'
        ).order_by('created_at').first()

        if not pending_turtle:
            return Response({"message": "Review queue is empty"}, status=status.HTTP_204_NO_CONTENT)

        # 2. Get the image associated with this turtle
        turtle_image = pending_turtle.images.first()
        if not turtle_image:
            return Response({"error": "Turtle found but has no image"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 3. Find matches
        matches = find_near_matches(turtle_image, top_k=5)

        # Build absolute URL for the main image
        full_image_url = request.build_absolute_uri(turtle_image.image.url)

        # Build absolute URLs for match images
        matches_data = []
        for m in matches:
            # Ensure we construct the full URL for the frontend
            img_url = m.get('image_url') or m.get('preview_image')
            if img_url:
                img_url = request.build_absolute_uri(img_url)

            m_copy = m.copy()
            m_copy['image_url'] = img_url
            matches_data.append(m_copy)

        # 4. Return the data
        return Response({
            "turtle_id": pending_turtle.id,
            "image_url": full_image_url,
            "date_uploaded": pending_turtle.created_at,
            "matches": matches_data
        })