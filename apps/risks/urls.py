from django.urls import path
from . import views

urlpatterns = [
    path('risk-stats/', views.RiskStatsView.as_view()),
    path('categories/', views.RiskCategoryListView.as_view()),
    path('categories/<int:pk>/', views.RiskCategoryDetailView.as_view()),
    path('matrix/', views.MatrixView.as_view()),
    path('risks/', views.RiskListView.as_view()),
    path('risks/<int:pk>/', views.RiskDetailView.as_view()),
    path('risks/<int:pk>/activate/', views.RiskActivateView.as_view()),
    path('risks/<int:pk>/close/', views.RiskCloseView.as_view()),
    path('risks/<int:pk>/assess/', views.RiskAssessView.as_view()),
    path('risks/<int:pk>/assessments/', views.RiskAssessmentHistoryView.as_view()),
    path('risks/<int:pk>/controls/', views.RiskControlsView.as_view()),
    path('risks/<int:pk>/link_control/', views.RiskLinkControlView.as_view()),
    path('risks/<int:pk>/unlink_control/', views.RiskUnlinkControlView.as_view()),
    path('risks/<int:pk>/treatments/', views.RiskTreatmentsView.as_view()),
    path('treatments/<int:pk>/', views.TreatmentDetailView.as_view()),
    path('controls-list/', views.ControlsForLinkView.as_view()),
    path('obligations-list/', views.ObligationsForLinkView.as_view()),
]
