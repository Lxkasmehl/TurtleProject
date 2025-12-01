import os
from django.contrib import admin
from django.contrib import messages
from django.utils.safestring import mark_safe
from .models import Turtle, TurtleImage


class TurtleImageInline(admin.TabularInline):
    model = TurtleImage
    extra = 0
    readonly_fields = ('created_at',)


# --- CUSTOM ACTION: DELETE FILES & RECORDS ---
@admin.action(description="Delete selected images AND their files")
def delete_images_and_files(modeladmin, request, queryset):
    """
    Deletes the selected TurtleImage records AND removes the physical files from disk.
    """
    deleted_count = 0
    for img_obj in queryset:
        # 1. Delete Original File
        if img_obj.image:
            try:
                if os.path.isfile(img_obj.image.path):
                    os.remove(img_obj.image.path)
            except Exception as e:
                print(f"Error deleting file {img_obj.image}: {e}")

        # 2. Delete Mirror File
        if img_obj.mirror_image:
            try:
                if os.path.isfile(img_obj.mirror_image.path):
                    os.remove(img_obj.mirror_image.path)
            except Exception as e:
                print(f"Error deleting mirror {img_obj.mirror_image}: {e}")

        # 3. Delete Database Record
        img_obj.delete()
        deleted_count += 1

    modeladmin.message_user(request, f"Successfully deleted {deleted_count} images and files.", messages.SUCCESS)


@admin.register(Turtle)
class TurtleAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_biology_id', 'gender', 'location_specific', 'location_state', 'created_at')
    search_fields = ('id', 'location_specific', 'location_state')
    list_filter = ('gender', 'location_state', 'created_at')
    readonly_fields = ('id', 'created_at')
    inlines = [TurtleImageInline]

    def get_biology_id(self, obj):
        return obj.biology_id

    get_biology_id.short_description = 'Biology ID'


@admin.register(TurtleImage)
class TurtleImageAdmin(admin.ModelAdmin):
    # Shows ID, Parent Turtle ID, Image Preview, etc.
    list_display = ('id', 'get_turtle_id', 'turtle', 'image_preview', 'is_processed', 'created_at')
    list_filter = ('is_processed', 'created_at')
    readonly_fields = ('id', 'vlad_blob_original', 'vlad_blob_mirror', 'created_at')

    # This registers the mass delete action
    actions = [delete_images_and_files]

    def get_turtle_id(self, obj):
        return obj.turtle.id

    get_turtle_id.short_description = 'Turtle PK'

    def image_preview(self, obj):
        if obj.image:
            # Displays a small thumbnail in the admin list
            return mark_safe(
                f'<img src="{obj.image.url}" style="max-height:100px; max-width:100px; border-radius: 4px;" />')
        return "(No Image)"

    image_preview.short_description = 'Image'