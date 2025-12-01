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
    """Generates the file path with FORWARD SLASHES for database compatibility."""
    turtle = instance.turtle

    # 1. Get Folder Components
    state = turtle.location_state if turtle.location_state else "Unsorted_State"
    specific_loc = turtle.location_specific if turtle.location_specific else "Unsorted_Location"
    bio_id = turtle.biology_id

    # 2. Generate Filename
    ext = filename.split('.')[-1]
    count = turtle.images.count() + 1
    new_filename = f"{bio_id}.[{count}].{ext}"

    # 3. Return path using formatted string with forward slashes
    # DO NOT use os.path.join here
    return f"{state}/{specific_loc}/{bio_id}/{new_filename}"


def turtle_mirror_path(instance, filename):
    """Generates the mirror path with FORWARD SLASHES."""
    # 1. Get Base Path (This now returns forward slashes)
    original_full_path = turtle_image_path(instance, filename)

    # 2. Split path manually to avoid OS-specific separators
    path_parts = original_full_path.split('/')
    folder_path = "/".join(path_parts[:-1])
    name = path_parts[-1]

    # 3. Construct Mirror Filename
    name_root = name.rsplit('.', 1)[0]
    ext = name.rsplit('.', 1)[1]

    # 4. Return full mirror path
    return f"{folder_path}/mirrors/{name_root}_mirror.{ext}"


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