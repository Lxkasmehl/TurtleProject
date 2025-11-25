import os
from django.core.management.base import BaseCommand
from django.conf import settings
from identification.models import TurtleImage
from identification.utils import KMEANS_VOCAB_PATH
from image_processing import process_image_through_SIFT, train_and_save_vocabulary


class Command(BaseCommand):
    help = 'Generates SIFT features for existing images and trains the KMeans vocabulary.'

    def handle(self, *args, **options):
        # 1. Check for images
        images = TurtleImage.objects.all()
        if not images.exists():
            self.stdout.write(self.style.ERROR("No images found. Upload images via the Admin panel first."))
            return

        self.stdout.write(f"Found {images.count()} images. Checking for SIFT descriptors...")

        processed_count = 0

        # 2. Generate SIFT descriptors for any image that lacks them
        for img_obj in images:
            if not img_obj.image:
                continue

            image_path = img_obj.image.path
            base_dir = os.path.dirname(image_path)
            # Use the TurtleImage ID for unique filenames
            npz_path = os.path.join(base_dir, f"img_{img_obj.id}_orig.npz")

            if not os.path.exists(npz_path):
                self.stdout.write(f"  Generating features for Image {img_obj.id} (Turtle {img_obj.turtle_id})...")
                success, _ = process_image_through_SIFT(image_path, npz_path)
                if success:
                    processed_count += 1
                else:
                    self.stdout.write(self.style.WARNING(f"  Failed to process {image_path}"))
            else:
                processed_count += 1

        if processed_count == 0:
            self.stdout.write(self.style.ERROR("No valid descriptors could be generated. Cannot train."))
            return

        # 3. Train the Vocabulary
        # We assume all images are stored in MEDIA_ROOT/turtles/original/
        target_dir = os.path.join(settings.MEDIA_ROOT, 'turtles', 'original')

        self.stdout.write(f"Training vocabulary using descriptors in {target_dir}...")

        vocab = train_and_save_vocabulary(target_dir, KMEANS_VOCAB_PATH, num_clusters=32)

        if vocab is not None:
            self.stdout.write(self.style.SUCCESS(f"Successfully created vocabulary at: {KMEANS_VOCAB_PATH}"))
        else:
            self.stdout.write(self.style.ERROR("Training failed."))