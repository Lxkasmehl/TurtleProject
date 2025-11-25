from django.db import models
import random
from PIL import Image, ImageOps
from io import BytesIO
from django.core.files.base import ContentFile
import os


def generate_turtle_id():
    """Generates a random integer ID between 100,000 and 1,000,000."""
    return random.randint(100_000, 1_000_000)


def turtle_image_path(instance, filename):
    """Generates the file path:
    State / Specific Location / Gender+ID / Gender+ID.[Count].ext
    Example: Kansas/Lawrence/F1/F1.[1].jpg"""
    turtle = instance.turtle

    # 1. Get Folder Components
    # Default to "Unsorted" if location is missing to prevent errors
    state = turtle.location_state if turtle.location_state else "Unsorted_State"
    specific_loc = turtle.location_specific if turtle.location_specific else "Unsorted_Location"
    bio_id = turtle.biology_id  # e.g., "F1"

    # 2. Generate Filename: F1.[1].jpg
    ext = filename.split('.')[-1]

    # Determine the increment number (count existing images + 1)
    # Note: This is a simple count. If images are deleted, numbers might be reused
    # or out of sync with total historical uploads, but it fits the requested format.
    count = turtle.images.count() + 1

    new_filename = f"{bio_id}.[{count}].{ext}"

    # 3. Return full path
    return os.path.join(state, specific_loc, bio_id, new_filename)


def turtle_mirror_path(instance, filename):
    """
    Generates the mirror file path.
    Stores mirrors in a 'mirrors' subfolder to keep the main folder clean.
    Example: Kansas/Lawrence/F1/mirrors/F1.[1]_mirror.jpg
    """
    # Re-use the logic from the main image path to get the base folder
    original_path = turtle_image_path(instance, filename)
    folder, name = os.path.split(original_path)
    name_root, ext = os.path.splitext(name)

    # Construct mirror path
    return os.path.join(folder, "mirrors", f"{name_root}_mirror{ext}")


class Turtle(models.Model):
    """
    Represents the unique identity of a physical turtle.
    """
    GENDER_CHOICES = [
        ('F', 'Female'),
        ('M', 'Male'),
        ('J', 'Juvenile'),
        ('U', 'Unknown'),
    ]

    # Primary Key: Internal random ID (The database PK)
    id = models.BigIntegerField(
        primary_key=True,
        default=generate_turtle_id,
        editable=False,
        unique=True
    )

    # Biology Dept ID Components
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, default='U')
    turtle_number = models.IntegerField(help_text="The ID number assigned by Bio Dept")

    # Location Data
    location_state = models.CharField(max_length=100, help_text="State (e.g., Kansas)")
    location_specific = models.CharField(max_length=100, help_text="Specific Location (e.g., Lawrence)")

    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def biology_id(self):
        """Returns the combined ID, e.g., 'F1'."""
        return f"{self.gender}{self.turtle_number}"

    def __str__(self):
        return f"Turtle {self.biology_id} ({self.location_specific}, {self.location_state})"


class TurtleImage(models.Model):
    """
    Represents a specific photo/sighting of a turtle.
    """
    turtle = models.ForeignKey(
        Turtle,
        on_delete=models.CASCADE,
        related_name='images'
    )

    # The actual image file with dynamic pathing
    image = models.ImageField(upload_to=turtle_image_path)

    # Mirror image (Stored in a subfolder to maintain organization)
    mirror_image = models.ImageField(upload_to=turtle_mirror_path, blank=True, null=True)

    # Computed VLAD vectors (The "Fingerprint") - Kept for identification logic
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

            # Use the original filename logic to determine the mirror name
            # The upload_to function for mirror_image will handle the folder placement
            file_name = os.path.basename(self.image.name)

            self.mirror_image.save(file_name, ContentFile(blob.getvalue()), save=False)
        except Exception as e:
            print(f"Error generating mirror image: {e}")

    def __str__(self):
        return f"Image for {self.turtle.biology_id}"