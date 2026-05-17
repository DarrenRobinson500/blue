from django.urls import path
from .views import (
    FunctionListView, FunctionDetailView,
    UserListView, UserDetailView, AssignFunctionView, RemoveFunctionView,
    AuthorityView,
    ProvisionedUserListView, ProvisionedUserDetailView,
    PlatformSettingsView,
    DataExportView, DataImportView,
    AccessibleAppsView,
)

urlpatterns = [
    path('functions/', FunctionListView.as_view()),
    path('functions/<int:pk>/', FunctionDetailView.as_view()),
    path('users/', UserListView.as_view()),
    path('users/<int:pk>/', UserDetailView.as_view()),
    path('users/<int:pk>/assign-function/', AssignFunctionView.as_view()),
    path('users/<int:pk>/remove-function/', RemoveFunctionView.as_view()),
    path('authority/', AuthorityView.as_view()),
    path('provisioned-users/', ProvisionedUserListView.as_view()),
    path('provisioned-users/<int:pk>/', ProvisionedUserDetailView.as_view()),
    path('settings/', PlatformSettingsView.as_view()),
    path('data/export/', DataExportView.as_view()),
    path('data/import/', DataImportView.as_view()),
    path('accessible-apps/', AccessibleAppsView.as_view()),
]
