from django.contrib import admin
from django.utils.html import mark_safe
from .models import Turtle, TurtleImage


class TurtleImageInline(admin.StackedInline):
    model = TurtleImage
    extra = 0  # Don't show extra empty slots by default

    # Fields to show for each image
    fields = ('image', 'image_preview', 'mirror_image', 'mirror_image_preview',
              'is_processed', 'vlad_blob_original', 'vlad_blob_mirror', 'created_at')

    # Protect calculated fields
    readonly_fields = ('image_preview', 'mirror_image_preview',
                       'vlad_blob_original', 'vlad_blob_mirror', 'created_at')

    # Helper to preview the image
    def image_preview(self, obj):
        if obj.image:
            return mark_safe(f'<img src="{obj.image.url}" style="height: 100px; border-radius: 5px;" />')
        return "No Image"

    image_preview.short_description = "Image Preview"

    def mirror_image_preview(self, obj):
        if obj.mirror_image:
            return mark_safe(f'<img src="{obj.mirror_image.url}" style="height: 100px; border-radius: 5px;" />')
        return "No Mirror"

    mirror_image_preview.short_description = "Mirror Preview"


class TurtleAdmin(admin.ModelAdmin):
    # 'biology_id' replaces the old 'turtle_id'
    list_display = ('id', 'biology_id', 'name', 'created_at')

    search_fields = ('biology_id', 'name', 'id')

    # This adds the images section inside the Turtle page
    inlines = [TurtleImageInline]


admin.site.register(Turtle, TurtleAdmin)