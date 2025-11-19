from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from identification.views import IdentifyTurtleView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/identify/', IdentifyTurtleView.as_view(), name='identify_turtle'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
