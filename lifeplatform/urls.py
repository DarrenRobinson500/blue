from pathlib import Path
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse, FileResponse, Http404


def health(request):
    return JsonResponse({'status': 'ok'})


def _spa_view(spa_name):
    def view(request, path=''):
        index = Path(settings.STATIC_ROOT) / spa_name / 'index.html'
        if not index.exists():
            raise Http404
        return FileResponse(open(index, 'rb'), content_type='text/html')
    return view


urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health),
    path('api/auth/', include('apps.core.urls')),
    path('api/core/', include('apps.core.api_urls')),
    path('api/risk/', include('apps.risk.urls')),
    path('api/actuarial/', include('apps.actuarial.urls')),
    path('api/', include('apps.risks.urls')),
    path('riskcore/', _spa_view('riskcore')),
    re_path(r'^riskcore/.*$', _spa_view('riskcore')),
    path('actuarialcore/', _spa_view('actuarialcore')),
    re_path(r'^actuarialcore/.*$', _spa_view('actuarialcore')),
    path('coreadmin/', _spa_view('coreadmin')),
    re_path(r'^coreadmin/.*$', _spa_view('coreadmin')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
