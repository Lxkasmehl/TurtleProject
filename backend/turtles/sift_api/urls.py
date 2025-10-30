from django.urls import path
from .views import SiftUploadView

urlpatterns = [
    # This will make your API available at /api/upload/
    path('upload/', SiftUploadView.as_view(), name='sift-upload'),
]