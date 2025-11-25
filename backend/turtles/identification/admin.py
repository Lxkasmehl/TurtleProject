from django.contrib import admin
from .models import Turtle, TurtleImage


class TurtleImageInline(admin.TabularInline):
    model = TurtleImage
    extra = 0
    readonly_fields = ('created_at',)


@admin.register(Turtle)
class TurtleAdmin(admin.ModelAdmin):
    # Updated list_display to use valid fields/properties
    list_display = ('id', 'get_biology_id', 'gender', 'location_specific', 'location_state', 'created_at')

    # Updated search fields
    search_fields = ('id', 'location_specific', 'location_state')

    # Updated filters
    list_filter = ('gender', 'location_state', 'created_at')

    inlines = [TurtleImageInline]

    # Helper to display the biology_id property in the admin list
    def get_biology_id(self, obj):
        return obj.biology_id

    get_biology_id.short_description = 'Biology ID'


@admin.register(TurtleImage)
class TurtleImageAdmin(admin.ModelAdmin):
    list_display = ('id', 'turtle', 'is_processed', 'created_at')
    list_filter = ('is_processed', 'created_at')
    readonly_fields = ('vlad_blob_original', 'vlad_blob_mirror', 'created_at')