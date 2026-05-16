from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated, AllowAny
from .serialisers import LoginSerializer, UserSerializer


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


class UserListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import User
        users = User.objects.filter(is_active=True).values('id', 'email', 'role')
        return Response(list(users))
