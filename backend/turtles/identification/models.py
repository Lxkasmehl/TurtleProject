from django.db import models
import random
from PIL import Image, ImageOps
from io import BytesIO
from django.core.files.base import ContentFile
import os


def generate_turtle_id():
    """Generates a random integer ID between 1,000,000 and 1,000,000,000."""
    return random.randint(1_000_000, 1_000_000_000)


class Turtle(models.Model):
    """
    Represents the unique identity of a physical turtle.
    """
    # Primary Key: Internal random ID
    id = models.BigIntegerField(
        primary_key=True,
        default=generate_turtle_id,
        editable=False,
        unique=True
    )

    # Biology Dept ID (Gender + Number, e.g., "F101")
    biology_id = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Biology Dept ID (e.g., F101)"
    )

    # Friendly Name (e.g., "Crush")
    name = models.CharField(max_length=100, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        display_name = self.name or "Unnamed"
        bio_id = self.biology_id or "No Bio ID"
        return f"Turtle {self.id} ({display_name} - {bio_id})"


class TurtleImage(models.Model):
    """
    Represents a specific photo/sighting of a turtle.
    """
    turtle = models.ForeignKey(
        Turtle,
        on_delete=models.CASCADE,
        related_name='images'
    )

    # The actual image file
    image = models.ImageField(upload_to='turtles/original/')
    mirror_image = models.ImageField(upload_to='turtles/mirror/', blank=True, null=True)

    # Computed VLAD vectors (The "Fingerprint")
    vlad_blob_original = models.BinaryField(blank=True, null=True)
    vlad_blob_mirror = models.BinaryField(blank=True, null=True)

    is_processed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # Generate Mirror Image if it doesn't exist
        if self.image and not self.mirror_image:
            self._generate_mirror_image()
        super().save(*args, **kwargs)

    def _generate_mirror_image(self):
        try:
            self.image.open()
            img = Image.open(self.image)
            img = ImageOps.exif_transpose(img)
            mirror_img = ImageOps.mirror(img)

            blob = BytesIO()
            img_format = img.format if img.format else 'JPEG'
            mirror_img.save(blob, format=img_format)

            file_name = os.path.basename(self.image.name)
            name, ext = os.path.splitext(file_name)
            mirror_file_name = f"{name}_mirror{ext}"

            self.mirror_image.save(mirror_file_name, ContentFile(blob.getvalue()), save=False)
        except Exception as e:
            print(f"Error generating mirror image: {e}")

    def __str__(self):
        return f"Image {self.id} for Turtle {self.turtle_id}"