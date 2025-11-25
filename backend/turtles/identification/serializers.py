from rest_framework import serializers
from .models import TurtleImage

class TurtleImageUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = TurtleImage
        fields = ['image']