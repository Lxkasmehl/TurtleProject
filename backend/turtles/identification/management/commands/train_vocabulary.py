import os
from django.core.management.base import BaseCommand
from django.conf import settings
from identification.models import TurtleImage
from identification.utils import KMEANS_VOCAB_PATH

# We only import the master rebuild function, which handles all data prep internally
from image_processing import rebuild_faiss_index_from_folders


class Command(BaseCommand):
    help = 'Generates SIFT features for existing images and trains the VLAD/FAISS index.'

    def handle(self, *args, **options):
        # Ensure at least one image exists, otherwise there's nothing to train.
        if not TurtleImage.objects.exists():
            self.stdout.write(self.style.ERROR("No images found. Upload images via the Admin panel first."))
            return

        # The master function needs the base directory to recursively scan all data.
        # This is the MEDIA_ROOT where Django saves all image files.
        target_dir = settings.MEDIA_ROOT

        self.stdout.write("🐢 Starting FULL Master Rebuild of VLAD Vocabulary and FAISS Index...")
        self.stdout.write(f"Scanning data root: {target_dir}")

        # This function handles: 1. NPZ generation, 2. KMeans training, 3. VLAD generation, 4. FAISS building.
        vocab = rebuild_faiss_index_from_folders(
            data_directory=target_dir,
            vocab_save_path=KMEANS_VOCAB_PATH,
            num_clusters=32
        )

        if vocab is not None:
            self.stdout.write(self.style.SUCCESS("\n🎉 Master Rebuild Complete. System is ready."))
        else:
            self.stdout.write(self.style.ERROR(
                "\n❌ Master Rebuild Failed. Check console for specific errors (e.g., missing dependencies)."))