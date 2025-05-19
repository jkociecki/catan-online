from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
import uuid
import random

from .models import User
from .serializers import UserSerializer, UserCreateSerializer

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
        
        # Create random password for the guest user
        random_password = uuid.uuid4().hex
        
        # Available colors for random assignment
        colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple']
        preferred_color = request.data.get('preferred_color', random.choice(colors))
        
        # Create the guest user
        user = User.objects.create_user(
            username=guest_name,
            password=random_password,
            is_guest=True,
            display_name=guest_name,
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