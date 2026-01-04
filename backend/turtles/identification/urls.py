from django.urls import path
from .views import UploadAndIdentifyView, ReviewMatchView, RetrieveReviewItemView

urlpatterns = [
    # Step 1: Upload & Get Matches
    path('upload/', UploadAndIdentifyView.as_view(), name='upload_identify'),

    # Step 2: Make Decision
    path('review/', ReviewMatchView.as_view(), name='review_match'),

    path('queue/next/', RetrieveReviewItemView.as_view(), name='queue_next'),
]