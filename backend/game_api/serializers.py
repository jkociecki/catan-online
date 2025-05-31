from rest_framework import serializers
from game_api.models import User, GamePlayer, Game, PlayerResource


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = '__all__'

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