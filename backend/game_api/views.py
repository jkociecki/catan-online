# backend/game_api/views.py
import uuid
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Avg, Count, Sum, Q
from django.contrib.auth import get_user_model
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Game, GamePlayer, PlayerResource
from .serializers import UserSerializer, GameSerializer, GamePlayerSerializer, PlayerResourceSerializer

# ✅ Używaj właściwego modelu User
User = get_user_model()

@csrf_exempt
def create_room(request):
    if request.method in ['GET', 'POST']:
        room_id = str(uuid.uuid4())[:8]
        return JsonResponse({'room_id': room_id})
    return JsonResponse({'error': 'Method not allowed'}, status=405)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    @action(detail=True, methods=['get'])
    def games(self, request, pk=None):
        """Pobierz wszystkie gry danego użytkownika"""
        user = self.get_object()
        game_players = GamePlayer.objects.filter(user=user).select_related('game')
        games_data = []

        for gp in game_players:
            games_data.append({
                'game_id': gp.game.id,
                'start_time': gp.game.start_time,
                'end_time': gp.game.end_time,
                'turns': gp.game.turns,
                'victory_points': gp.victory_points,
                'roads_built': gp.roads_built,
                'settlements_built': gp.settlements_built,
                'cities_built': gp.cities_built,
                'longest_road': gp.longest_road,
                'largest_army': gp.largest_army,
                'won': gp.victory_points >= 10
            })

        return Response(games_data)

    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Pobierz statystyki danego użytkownika"""
        user = self.get_object()
        game_players = GamePlayer.objects.filter(user=user)

        if not game_players.exists():
            return Response({'message': 'Brak danych o grach'})

        # Podstawowe statystyki
        total_games = game_players.count()
        wins = game_players.filter(victory_points__gte=10).count()
        win_rate = (wins / total_games) * 100 if total_games > 0 else 0

        # Średnie wartości
        avg_stats = game_players.aggregate(
            avg_points=Avg('victory_points'),
            avg_roads=Avg('roads_built'),
            avg_settlements=Avg('settlements_built'),
            avg_cities=Avg('cities_built')
        )

        # Bonusy
        longest_road_count = game_players.filter(longest_road=True).count()
        largest_army_count = game_players.filter(largest_army=True).count()

        return Response({
            'total_games': total_games,
            'wins': wins,
            'losses': total_games - wins,
            'win_rate': round(win_rate, 2),
            'average_victory_points': round(avg_stats['avg_points'], 2),
            'average_roads': round(avg_stats['avg_roads'], 2),
            'average_settlements': round(avg_stats['avg_settlements'], 2),
            'average_cities': round(avg_stats['avg_cities'], 2),
            'longest_road_awards': longest_road_count,
            'largest_army_awards': largest_army_count
        })


class GameViewSet(viewsets.ModelViewSet):
    queryset = Game.objects.all()
    serializer_class = GameSerializer

    def get_queryset(self):
        queryset = Game.objects.all()
        user_id = self.request.query_params.get('user_id', None)

        if user_id is not None:
            # Filtruj gry w których uczestniczył dany użytkownik
            queryset = queryset.filter(gameplayer__user_id=user_id).distinct()

        return queryset.order_by('-start_time')

    @action(detail=True, methods=['get'])
    def players(self, request, pk=None):
        """Pobierz wszystkich graczy z danej gry wraz z ich statystykami"""
        game = self.get_object()
        game_players = GamePlayer.objects.filter(game=game).select_related('user')

        players_data = []
        for gp in game_players:
            # Pobierz zasoby gracza
            resources = PlayerResource.objects.filter(game_player=gp)
            resources_dict = {res.resource_type: res.amount for res in resources}

            players_data.append({
                'user_id': gp.user.id,
                'username': gp.user.username,
                'victory_points': gp.victory_points,
                'roads_built': gp.roads_built,
                'settlements_built': gp.settlements_built,
                'cities_built': gp.cities_built,
                'longest_road': gp.longest_road,
                'largest_army': gp.largest_army,
                'resources': resources_dict,
                'won': gp.victory_points >= 10
            })

        # Posortuj według punktów zwycięstwa (malejąco)
        players_data.sort(key=lambda x: x['victory_points'], reverse=True)

        return Response({
            'game_info': {
                'id': game.id,
                'start_time': game.start_time,
                'end_time': game.end_time,
                'turns': game.turns,
                'dice_distribution': game.dice_distribution
            },
            'players': players_data
        })

    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Pobierz ostatnie gry"""
        limit = int(request.query_params.get('limit', 10))
        games = Game.objects.all().order_by('-start_time')[:limit]
        return Response(GameSerializer(games, many=True).data)


class GamePlayerViewSet(viewsets.ModelViewSet):
    queryset = GamePlayer.objects.all()
    serializer_class = GamePlayerSerializer

    def get_queryset(self):
        queryset = GamePlayer.objects.all().select_related('user', 'game')
        user_id = self.request.query_params.get('user_id', None)
        game_id = self.request.query_params.get('game_id', None)

        if user_id is not None:
            queryset = queryset.filter(user_id=user_id)

        if game_id is not None:
            queryset = queryset.filter(game_id=game_id)

        return queryset.order_by('-game__start_time')


class PlayerResourceViewSet(viewsets.ModelViewSet):
    queryset = PlayerResource.objects.all()
    serializer_class = PlayerResourceSerializer

    def get_queryset(self):
        queryset = PlayerResource.objects.all().select_related('game_player__user', 'game_player__game')
        user_id = self.request.query_params.get('user_id', None)
        game_id = self.request.query_params.get('game_id', None)
        resource_type = self.request.query_params.get('resource_type', None)

        if user_id is not None:
            queryset = queryset.filter(game_player__user_id=user_id)

        if game_id is not None:
            queryset = queryset.filter(game_player__game_id=game_id)

        if resource_type is not None:
            queryset = queryset.filter(resource_type=resource_type)

        return queryset


# Dodatkowe widoki dla globalnych statystyk
class StatsViewSet(viewsets.ViewSet):

    @action(detail=False, methods=['get'])
    def global_stats(self, request):
        """Globalne statystyki wszystkich graczy"""
        total_games = Game.objects.count()
        total_players = User.objects.count()
        total_game_sessions = GamePlayer.objects.count()

        if total_game_sessions == 0:
            return Response({'message': 'Brak danych o grach'})

        # Najlepsi gracze
        user_stats = []
        for user in User.objects.all():
            game_players = GamePlayer.objects.filter(user=user)
            if game_players.exists():
                total_user_games = game_players.count()
                wins = game_players.filter(victory_points__gte=10).count()
                win_rate = (wins / total_user_games) * 100
                avg_points = game_players.aggregate(avg=Avg('victory_points'))['avg']

                user_stats.append({
                    'user_id': user.id,
                    'username': user.username,
                    'total_games': total_user_games,
                    'wins': wins,
                    'win_rate': round(win_rate, 2),
                    'avg_points': round(avg_points, 2)
                })

        # Posortuj według win rate
        user_stats.sort(key=lambda x: x['win_rate'], reverse=True)

        return Response({
            'total_games': total_games,
            'total_players': total_players,
            'total_game_sessions': total_game_sessions,
            'leaderboard': user_stats[:10]  # Top 10
        })

    @action(detail=False, methods=['get'])
    def resource_analysis(self, request):
        """Analiza zasobów - które są najczęściej zbierane"""
        resources = PlayerResource.objects.values('resource_type').annotate(
            total_amount=Sum('amount'),
            avg_amount=Avg('amount'),
            count=Count('id')
        ).order_by('-total_amount')

        return Response(list(resources))