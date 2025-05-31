from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count, Avg
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend

from .models import User, Game, GamePlayer, PlayerResource, GameAction, Vertex, Edge
from .serializers import (
    UserSerializer, GameSerializer, GameListSerializer, GamePlayerSerializer,
    PlayerResourceSerializer, GameActionSerializer, GameStatsSerializer,
    VertexSerializer, EdgeSerializer
)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email']
    ordering_fields = ['created_at', 'username']
    ordering = ['-created_at']

    @action(detail=True, methods=['get'])
    def games(self, request, pk=None):
        """Pobierz wszystkie gry użytkownika"""
        user = self.get_object()
        games = Game.objects.filter(gameplayer__user=user).distinct()
        serializer = GameListSerializer(games, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Pobierz statystyki użytkownika"""
        user = self.get_object()
        game_players = GamePlayer.objects.filter(user=user)

        stats = {
            'total_games': game_players.count(),
            'wins': game_players.filter(victory_points__gte=10).count(),
            'avg_victory_points': game_players.aggregate(avg=Avg('victory_points'))['avg'] or 0,
            'total_settlements': game_players.aggregate(total=Count('settlements_built'))['total'] or 0,
            'total_roads': game_players.aggregate(total=Count('roads_built'))['total'] or 0,
            'longest_road_wins': game_players.filter(longest_road=True).count(),
            'largest_army_wins': game_players.filter(largest_army=True).count(),
        }
        return Response(stats)



