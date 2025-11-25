from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Turtle, TurtleImage
from .utils import process_turtle_image, find_best_matching_turtle


class IdentifyTurtleView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        file_obj = request.FILES.get('image')
        if not file_obj:
            return Response({"error": "No image provided"}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Create a TEMPORARY new Turtle for this upload
        # We assume it's new until proven otherwise.
        temp_turtle = Turtle.objects.create(
            name=request.data.get('name') or "Unknown",
            biology_id=request.data.get('biology_id')  # Nullable
        )

        # 2. Create the Image linked to this temp turtle
        turtle_image = TurtleImage.objects.create(
            turtle=temp_turtle,
            image=file_obj
        )

        # 3. Process the Image
        success = process_turtle_image(turtle_image)
        if not success:
            return Response({"message": "Processing failed"}, status=500)

        # 4. Check for Matches
        match_result = find_best_matching_turtle(turtle_image)

        final_turtle_id = temp_turtle.id
        action_taken = "created_new"

        if match_result['match_found']:
            # MATCH FOUND!
            # 1. Get the existing turtle
            existing_turtle = Turtle.objects.get(id=match_result['matched_turtle_id'])

            # 2. Move the image to the existing turtle
            turtle_image.turtle = existing_turtle
            turtle_image.save()

            # 3. Delete the temporary turtle we just created
            temp_turtle.delete()

            final_turtle_id = existing_turtle.id
            action_taken = "merged_to_existing"

        return Response({
            "message": "Processed successfully",
            "action": action_taken,
            "turtle_id": final_turtle_id,
            "identification_result": match_result
        })