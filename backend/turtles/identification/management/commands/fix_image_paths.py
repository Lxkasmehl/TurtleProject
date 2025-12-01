from django.core.management.base import BaseCommand
from identification.models import TurtleImage


class Command(BaseCommand):
    help = 'Fixes database records that have Windows-style backslashes in file paths.'

    def handle(self, *args, **options):
        images = TurtleImage.objects.all()
        fixed_count = 0

        for img in images:
            changed = False

            # Fix Main Image Path
            if img.image and '\\' in img.image.name:
                clean_name = img.image.name.replace('\\', '/')
                self.stdout.write(f"Fixing: {img.image.name} -> {clean_name}")
                img.image.name = clean_name
                changed = True

            # Fix Mirror Image Path
            if img.mirror_image and '\\' in img.mirror_image.name:
                clean_mirror = img.mirror_image.name.replace('\\', '/')
                self.stdout.write(f"Fixing Mirror: {img.mirror_image.name} -> {clean_mirror}")
                img.mirror_image.name = clean_mirror
                changed = True

            if changed:
                # We use update_fields to avoid triggering other save logic (like file generation)
                img.save(update_fields=['image', 'mirror_image'])
                fixed_count += 1

        self.stdout.write(self.style.SUCCESS(f"Done! Fixed {fixed_count} image records."))