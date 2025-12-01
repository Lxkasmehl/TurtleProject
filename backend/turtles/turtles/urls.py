# backend/turtles/turtles/urls.py

from django.contrib import admin
from django.urls import path, include
from django.conf import settings             # <--- Add this
from django.conf.urls.static import static   # <--- Add this

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/identify/', include('identification.urls')),
]

# This part tells Django: "If in DEBUG mode, serve files from MEDIA_ROOT at MEDIA_URL"
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)