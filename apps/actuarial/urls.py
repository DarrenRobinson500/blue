from django.urls import path
from . import views

urlpatterns = [
    path('stats/', views.StatsView.as_view()),
    path('schemas/', views.SchemaListView.as_view()),
    path('schemas/<int:pk>/', views.SchemaDetailView.as_view()),
    path('schemas/<int:pk>/new-version/', views.SchemaNewVersionView.as_view()),
    path('schemas/<int:pk>/fields/', views.SchemaFieldListView.as_view()),
    path('schemas/<int:pk>/fields/<int:field_id>/', views.SchemaFieldDeleteView.as_view()),
    path('imports/', views.ImportListView.as_view()),
    path('imports/<int:pk>/', views.ImportDetailView.as_view()),
    path('imports/<int:pk>/errors/', views.ImportErrorListView.as_view()),
    path('imports/<int:pk>/records/', views.ImportRecordListView.as_view()),
    path('imports/<int:pk>/records/<int:record_id>/', views.ImportRecordDetailView.as_view()),
]
