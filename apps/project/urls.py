from django.urls import path
from . import views

urlpatterns = [
    path('projects/', views.project_list),
    path('projects/reorder/', views.project_reorder),
    path('projects/<int:pk>/', views.project_detail),
    path('tasks/', views.task_list),
    path('tasks/reorder/', views.task_reorder),
    path('tasks/<int:pk>/done/', views.task_done),
    path('tasks/bulk-update/', views.task_bulk_update),
    path('tasks/<int:pk>/', views.task_detail),
]
