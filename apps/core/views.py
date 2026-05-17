import io
import os
import tempfile
from django.core.management import call_command
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser
from django.core.exceptions import ValidationError
from django.db.models.deletion import ProtectedError

from .models import Function, User, FunctionAppAccess, ProvisionedUser, PlatformSettings
from .serialisers import (
    LoginSerializer, UserSerializer,
    FunctionListSerializer, FunctionDetailSerializer, FunctionWriteSerializer,
    UserListSerializer, UserDetailSerializer, AssignFunctionSerializer,
    ProvisionedUserSerializer, PlatformSettingsSerializer,
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


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip().lower()
        password = request.data.get('password', '')
        if not username or not password:
            return Response({'detail': 'Username and password are required.'}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(username=username).exists():
            return Response({'detail': 'That username is already registered.'}, status=status.HTTP_400_BAD_REQUEST)
        domain = PlatformSettings.get().email_domain
        email = f'{username}@{domain}'
        user = User.objects.create_user(email=email, password=password, username=username)
        try:
            provisioned = ProvisionedUser.objects.select_related('function').get(username=username)
            assign_function(user, provisioned.function, assigned_by=None)
            provisioned.delete()
        except ProvisionedUser.DoesNotExist:
            pass
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data,
        }, status=status.HTTP_201_CREATED)


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

    def delete(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if user == request.user:
            return Response({'detail': 'You cannot delete your own account.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user.delete()
        except ProtectedError:
            return Response(
                {'detail': 'This user cannot be deleted because they have associated records (e.g. risk assessments or function history). Remove those records first, or deactivate the user instead.'},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


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


class AuthorityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        access = FunctionAppAccess.objects.values_list('function_id', 'app')
        return Response([{'function_id': f, 'app': a} for f, a in access])

    def post(self, request):
        function_id = request.data.get('function_id')
        app = request.data.get('app')
        granted = request.data.get('granted')
        if not function_id or not app:
            return Response({'detail': 'function_id and app required.'}, status=status.HTTP_400_BAD_REQUEST)
        if granted:
            FunctionAppAccess.objects.get_or_create(function_id=function_id, app=app)
        else:
            FunctionAppAccess.objects.filter(function_id=function_id, app=app).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


_BUSINESS_APPS = ['core', 'risk', 'risks', 'project', 'actuarial']


class DataExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        buf = io.StringIO()
        call_command('dumpdata', *_BUSINESS_APPS, indent=2, stdout=buf)
        response = HttpResponse(buf.getvalue(), content_type='application/json')
        response['Content-Disposition'] = 'attachment; filename="lifeplatform_data.json"'
        return response


class DataImportView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)
        suffix = '.json' if file.name.endswith('.json') else '.json'
        tmp_fd, tmp_path = tempfile.mkstemp(suffix=suffix)
        try:
            with os.fdopen(tmp_fd, 'wb') as tmp:
                for chunk in file.chunks():
                    tmp.write(chunk)
            call_command('loaddata', tmp_path, verbosity=0)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
        return Response({'detail': 'Data imported successfully.'})


class AccessibleAppsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.function_id:
            return Response([])
        apps = list(
            FunctionAppAccess.objects.filter(function_id=request.user.function_id)
            .values_list('app', flat=True)
        )
        return Response(apps)


class PlatformSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(PlatformSettingsSerializer(PlatformSettings.get()).data)

    def patch(self, request):
        settings = PlatformSettings.get()
        ser = PlatformSettingsSerializer(settings, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)


class ProvisionedUserListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        users = ProvisionedUser.objects.select_related('function')
        return Response(ProvisionedUserSerializer(users, many=True).data)

    def post(self, request):
        ser = ProvisionedUserSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        pu = ser.save()
        return Response(ProvisionedUserSerializer(pu).data, status=status.HTTP_201_CREATED)


class ProvisionedUserDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            pu = ProvisionedUser.objects.get(pk=pk)
        except ProvisionedUser.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        pu.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


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
