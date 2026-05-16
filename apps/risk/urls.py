from django.urls import path
from . import views

urlpatterns = [
    path('stats/', views.StatsView.as_view()),
    path('sources/', views.ObligationSourceListView.as_view()),
    path('sources/<int:pk>/', views.ObligationSourceDetailView.as_view()),
    path('obligations/', views.ObligationListView.as_view()),
    path('obligations/<int:pk>/', views.ObligationDetailView.as_view()),
    path('obligations/<int:pk>/history/', views.ObligationHistoryView.as_view()),
    path('obligations/<int:pk>/controls/', views.ObligationControlLinkView.as_view()),
    path('obligations/<int:pk>/controls/<int:control_id>/', views.ObligationControlUnlinkView.as_view()),
    path('controls/', views.ControlListView.as_view()),
    path('controls/<int:pk>/', views.ControlDetailView.as_view()),
]
