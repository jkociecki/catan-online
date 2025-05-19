from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_guest', 'display_name', 
                  'preferred_color', 'avatar_url', 'games_played', 'games_won']
        read_only_fields = ['id', 'is_guest', 'games_played', 'games_won']

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'display_name', 'preferred_color']
    
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            display_name=validated_data.get('display_name', validated_data['username']),
            preferred_color=validated_data.get('preferred_color', None)
        )
        return user