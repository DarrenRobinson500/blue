from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.core.urls')),
    path('api/risk/', include('apps.risk.urls')),
    path('api/actuarial/', include('apps.actuarial.urls')),
    path('api/', include('apps.risks.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
