from django.urls import path
from .views import (
    FunctionListView, FunctionDetailView,
    UserListView, UserDetailView, AssignFunctionView, RemoveFunctionView,
)

urlpatterns = [
    path('functions/', FunctionListView.as_view()),
    path('functions/<int:pk>/', FunctionDetailView.as_view()),
    path('users/', UserListView.as_view()),
    path('users/<int:pk>/', UserDetailView.as_view()),
    path('users/<int:pk>/assign-function/', AssignFunctionView.as_view()),
    path('users/<int:pk>/remove-function/', RemoveFunctionView.as_view()),
]
