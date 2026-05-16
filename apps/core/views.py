from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.core.exceptions import ValidationError

from .models import Function, User
from .serialisers import (
    LoginSerializer, UserSerializer,
    FunctionListSerializer, FunctionDetailSerializer, FunctionWriteSerializer,
    UserListSerializer, UserDetailSerializer, AssignFunctionSerializer,
)
from .services.function_service import assign_function, remove_function


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serialiser = LoginSerializer(data=request.data)
        serialiser.is_valid(raise_exception=True)
        user = serialiser.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data,
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request.user.auth_token.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Functions ─────────────────────────────────────────────────────────────────

class FunctionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        is_active_param = request.query_params.get('is_active', 'true').lower()
        qs = Function.objects.all()
        if is_active_param != 'all':
            qs = qs.filter(is_active=(is_active_param != 'false'))
        return Response(FunctionListSerializer(qs, many=True).data)

    def post(self, request):
        serialiser = FunctionWriteSerializer(data=request.data)
        serialiser.is_valid(raise_exception=True)
        fn = serialiser.save()
        return Response(FunctionDetailSerializer(fn).data, status=status.HTTP_201_CREATED)


class FunctionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_object(self, pk):
        try:
            return Function.objects.get(pk=pk)
        except Function.DoesNotExist:
            return None

    def get(self, request, pk):
        fn = self._get_object(pk)
        if fn is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(FunctionDetailSerializer(fn).data)

    def patch(self, request, pk):
        fn = self._get_object(pk)
        if fn is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serialiser = FunctionWriteSerializer(fn, data=request.data, partial=True)
        serialiser.is_valid(raise_exception=True)
        fn = serialiser.save()
        return Response(FunctionDetailSerializer(fn).data)


# ── Users ─────────────────────────────────────────────────────────────────────

class UserListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        users = User.objects.select_related('function').prefetch_related('function_history')
        return Response(UserListSerializer(users, many=True).data)


class UserDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_object(self, pk):
        try:
            return User.objects.select_related('function').prefetch_related(
                'function_history__function', 'function_history__assigned_by'
            ).get(pk=pk)
        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        user = self._get_object(pk)
        if user is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(UserDetailSerializer(user).data)


class AssignFunctionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serialiser = AssignFunctionSerializer(data=request.data)
        serialiser.is_valid(raise_exception=True)

        fn = Function.objects.get(pk=serialiser.validated_data['function_id'])
        start_date = serialiser.validated_data.get('start_date')
        notes = serialiser.validated_data.get('notes', '')

        try:
            assign_function(user, fn, request.user, start_date=start_date, notes=notes)
        except ValidationError as e:
            return Response({'detail': e.message}, status=status.HTTP_400_BAD_REQUEST)

        user.refresh_from_db()
        return Response(UserDetailSerializer(user).data)


class RemoveFunctionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        try:
            remove_function(user, request.user)
        except ValidationError as e:
            return Response({'detail': e.message}, status=status.HTTP_400_BAD_REQUEST)

        user.refresh_from_db()
        return Response(UserDetailSerializer(user).data)
