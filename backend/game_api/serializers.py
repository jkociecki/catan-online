from rest_framework import serializers
from django.contrib.auth import get_user_model
from game_api.models import GamePlayer, Game, PlayerResource

# ✅ Używaj właściwego modelu User
User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'display_name', 'avatar_url', 'is_guest']

class GameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Game
        fields = '__all__'

class GamePlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = GamePlayer
        fields = '__all__'

class PlayerResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlayerResource
        fields = '__all__'