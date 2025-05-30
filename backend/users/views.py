from rest_framework import viewsets, status, permissions, generics
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import authenticate, get_user_model
from django.shortcuts import get_object_or_404
import uuid
import random

from .models import User
from .serializers import UserSerializer, UserCreateSerializer

User = get_user_model()

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_permissions(self):
        # Allow anyone to create a user or login as guest
        if self.action in ['create', 'login', 'guest_login', 'sso_login']:
            return [permissions.AllowAny()]
        return super().get_permissions()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer
    
    @action(detail=False, methods=['post'])
    def login(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        user = authenticate(username=username, password=password)
        
        if user:
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user': UserSerializer(user).data
            })
        else:
            return Response(
                {'error': 'Invalid credentials'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
    
    @action(detail=False, methods=['post'])
    def guest_login(self, request):
        # Create a unique guest username
        guest_name = request.data.get('guest_name', f"Guest_{uuid.uuid4().hex[:8]}")
        preferred_color = request.data.get('preferred_color', random.choice(['red', 'blue', 'green', 'yellow', 'orange', 'purple']))
        
        # Ensure unique username
        base_username = guest_name
        counter = 1
        while User.objects.filter(username=base_username).exists():
            base_username = f"{guest_name}_{counter}"
            counter += 1
        
        # Create random password for the guest user
        random_password = uuid.uuid4().hex
        
        # Create the guest user
        user = User.objects.create_user(
            username=base_username,  # Use unique username
            password=random_password,
            is_guest=True,
            display_name=guest_name,  # Keep original name for display
            preferred_color=preferred_color
        )
        
        # Create auth token
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data
        })
    
    @action(detail=False, methods=['post'])
    def sso_login(self, request):
        # This is a simplified version - in reality you'd verify the token with
        # the provider (Google, Facebook, etc.)
        provider = request.data.get('provider')
        external_id = request.data.get('external_id')
        email = request.data.get('email')
        name = request.data.get('name')
        avatar_url = request.data.get('avatar_url')
        
        if not provider or not external_id or not email:
            return Response(
                {'error': 'Missing required SSO information'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Try to find an existing user with this external ID
        try:
            user = User.objects.get(external_id=external_id, provider=provider)
            # Update user info in case it changed
            user.email = email
            user.display_name = name
            user.avatar_url = avatar_url
            user.save()
        except User.DoesNotExist:
            # Create a new user
            username = f"{provider}_{external_id}"
            # Generate a random password since we'll authenticate via the provider
            random_password = uuid.uuid4().hex
            
            user = User.objects.create_user(
                username=username,
                email=email,
                password=random_password,
                external_id=external_id,
                provider=provider,
                display_name=name,
                avatar_url=avatar_url
            )
        
        # Create or get auth token
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data
        })
    
    @action(detail=False, methods=['get'])
    def profile(self, request):
        # Return current user profile
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    try:
        user = request.user
        serializer = UserSerializer(user)
        return Response(serializer.data)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserProfileView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def test_token(request):
    return Response({
        'success': True,
        'message': 'Token is valid',
        'user_id': request.user.id,
        'username': request.user.username,
        'email': request.user.email
    })