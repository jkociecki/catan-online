# backend/game_api/views.py - POPRAWIONA WERSJA
import uuid
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Avg, Count, Sum, Q
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Game, GamePlayer, PlayerResource
from .serializers import UserSerializer, GameSerializer, GamePlayerSerializer, PlayerResourceSerializer
from game_api.game_saver import GameSaver
import random

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
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['get'])
    def games(self, request, pk=None):
        """Pobierz wszystkie gry danego użytkownika"""
        user = self.get_object()
        # Sprawdź czy użytkownik próbuje pobrać swoje gry
        if request.user.id != user.id and not request.user.is_staff:
            return Response({'error': 'Unauthorized'}, status=403)
            
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
        print(f"📊 Found {len(games_data)} games for user {user.username}")
        return Response(games_data)

    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Pobierz statystyki danego użytkownika"""
        user = self.get_object()
        
        # ✅ SPRAWDŹ AUTORYZACJĘ  
        if request.user.id != user.id and not request.user.is_staff:
            return Response({'error': 'Unauthorized'}, status=403)
        
        # ✅ UŻYJ GAMESAVER DO POBRANIA STATYSTYK
        stats = GameSaver.get_game_statistics_for_user(user.id)
        
        if stats is None:
            return Response({'error': 'Failed to calculate statistics'}, status=500)
        
        print(f"📈 Statistics for user {user.username}: {stats}")
        return Response(stats)


class GameViewSet(viewsets.ModelViewSet):
    queryset = Game.objects.all()
    serializer_class = GameSerializer
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

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
    permission_classes = [AllowAny]  # Globalne statystyki są publiczne

    @action(detail=False, methods=['get'])
    def global_stats(self, request):
        """Globalne statystyki wszystkich graczy"""
        total_games = Game.objects.count()
        total_players = User.objects.count()
        total_game_sessions = GamePlayer.objects.count()

        if total_game_sessions == 0:
            return Response({
                'total_games': 0,
                'total_players': total_players,
                'total_game_sessions': 0,
                'leaderboard': []
            })

        # Najlepsi gracze
        user_stats = []
        for user in User.objects.all():
            stats = GameSaver.get_game_statistics_for_user(user.id)
            if stats and stats['total_games'] > 0:
                user_stats.append({
                    'user_id': user.id,
                    'username': user.display_name or user.username,
                    'total_games': stats['total_games'],
                    'wins': stats['wins'],
                    'win_rate': round(stats['win_rate'], 1),
                    'avg_points': round(stats['average_victory_points'], 1)
                })

        # Posortuj według win rate, potem według liczby gier
        user_stats.sort(key=lambda x: (x['win_rate'], x['total_games']), reverse=True)

        return Response({
            'total_games': total_games,
            'total_players': total_players,
            'total_game_sessions': total_game_sessions,
            'leaderboard': user_stats[:10]  # Top 10
        })

    # ✅ POPRAWIONE WCIĘCIE - metoda na właściwym poziomie klasy
    @action(detail=False, methods=['post'])
    def create_test_game(self, request):
        """ENDPOINT DO TESTOWANIA - tworzy przykładową grę"""
        try:
            # Utwórz testową grę
            game = Game.objects.create(
                start_time=timezone.now() - timezone.timedelta(hours=1),
                end_time=timezone.now(),
                turns=45,
                dice_distribution={'6': 8, '8': 7, '5': 6, '9': 5}
            )
            
            # Utwórz testowych graczy
            test_players = [
                {'username': 'test_player_1', 'points': 10, 'won': True},
                {'username': 'test_player_2', 'points': 8, 'won': False},
                {'username': 'test_player_3', 'points': 6, 'won': False},
            ]
            
            for player_data in test_players:
                # Znajdź lub utwórz użytkownika
                user, created = User.objects.get_or_create(
                    username=player_data['username'],
                    defaults={
                        'email': f"{player_data['username']}@test.com",
                        'is_guest': True,
                        'display_name': player_data['username']
                    }
                )
                
                # Utwórz GamePlayer
                GamePlayer.objects.create(
                    game=game,
                    user=user,
                    victory_points=player_data['points'],
                    roads_built=random.randint(5, 12),
                    settlements_built=random.randint(2, 4),
                    cities_built=random.randint(0, 3),
                    longest_road=player_data['won'],
                    largest_army=False
                )
            
            return Response({
                'message': f'Test game {game.id} created successfully',
                'game_id': game.id
            })
            
        except Exception as e:
            return Response({
                'error': f'Failed to create test game: {str(e)}'
            }, status=500)
        
    @action(detail=False, methods=['get'])
    def resource_analysis(self, request):
        """Analiza zasobów - które są najczęściej zbierane"""
        resources = PlayerResource.objects.values('resource_type').annotate(
            total_amount=Sum('amount'),
            avg_amount=Avg('amount'),
            count=Count('id')
        ).order_by('-total_amount')

        return Response(list(resources))