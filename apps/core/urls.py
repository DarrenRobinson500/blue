from django.urls import path
from .views import LoginView, LogoutView, UserListView

urlpatterns = [
    path('login/', LoginView.as_view()),
    path('logout/', LogoutView.as_view()),
    path('users/', UserListView.as_view()),
]
