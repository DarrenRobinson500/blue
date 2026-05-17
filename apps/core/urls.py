from django.urls import path
from .views import LoginView, LogoutView, RegisterView

urlpatterns = [
    path('login/', LoginView.as_view()),
    path('logout/', LogoutView.as_view()),
    path('register/', RegisterView.as_view()),
]
