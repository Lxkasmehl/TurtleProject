from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static

# IMPORT YOUR VIEW HERE
# This assumes your 'IdentifyTurtleView' is inside 'backend/turtles/identification/views.py'
from identification.views import IdentifyTurtleView

urlpatterns = [
    path('admin/', admin.site.urls),

    # THE API ENDPOINT
    # .as_view() converts the class-based view into a function Django can use
    path('api/identify/', IdentifyTurtleView.as_view(), name='identify_turtle'),
]

# This block allows Django to serve uploaded images (media) during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)