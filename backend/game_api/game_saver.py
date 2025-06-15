# backend/game_api/game_saver.py - NOWY PLIK DO ZAPISYWANIA GIER
from django.contrib.auth import get_user_model
from game_api.models import Game, GamePlayer, PlayerResource
import json
from datetime import datetime
import logging

User = get_user_model()
logger = logging.getLogger(__name__)

class GameSaver:
    """Klasa do zapisywania zakończonych gier do bazy danych"""
    
    @staticmethod
    def save_completed_game(game_state, start_time=None):
        """
        Zapisz zakończoną grę do bazy danych
        """
        try:
            logger.info(f"🎮 Saving completed game to database")
            
            # Sprawdź czy gra rzeczywiście się skończyła
            if not game_state.is_game_over():
                logger.warning("❌ Game is not finished yet, skipping save")
                return None
            
            # Utwórz obiekt Game
            game = Game.objects.create(
                start_time=start_time or datetime.now(),
                end_time=datetime.now(),
                dice_distribution={},  # Można dodać później jeśli śledzimy rzuty
                turns=getattr(game_state, 'current_turn', 0)
            )
            
            logger.info(f"✅ Created Game object with ID: {game.id}")
            
            # Zapisz każdego gracza
            for player_id, player in game_state.players.items():
                try:
                    # Znajdź lub utwórz użytkownika
                    user = GameSaver._get_or_create_user_for_player(player_id, player)
                    
                    if not user:
                        logger.warning(f"❌ Could not create user for player {player_id}")
                        continue
                    
                    # Utwórz GamePlayer
                    game_player = GamePlayer.objects.create(
                        game=game,
                        user=user,
                        victory_points=player.victory_points,
                        roads_built=15 - player.roads_left,
                        settlements_built=5 - player.settlements_left,
                        cities_built=4 - player.cities_left,
                        longest_road=getattr(player, 'longest_road', False),
                        largest_army=getattr(player, 'largest_army', False)
                    )
                    
                    logger.info(f"✅ Created GamePlayer for {player.display_name}")
                    
                    # Zapisz zasoby gracza
                    GameSaver._save_player_resources(game_player, player.resources)
                    
                except Exception as e:
                    logger.error(f"❌ Error saving player {player_id}: {e}")
                    continue
            
            logger.info(f"🎉 Successfully saved game {game.id} to database")
            return game
            
        except Exception as e:
            logger.error(f"❌ Error saving game to database: {e}")
            return None
    
    @staticmethod
    def _get_or_create_user_for_player(player_id, player):
        """
        Znajdź lub utwórz użytkownika dla gracza z gry
        """
        try:
            # Spróbuj najpierw znaleźć istniejącego użytkownika
            # Jeśli player_id to rzeczywisty ID użytkownika z Django
            if player_id.isdigit():
                try:
                    return User.objects.get(id=int(player_id))
                except User.DoesNotExist:
                    pass
            
            # Spróbuj znaleźć po username/display_name
            display_name = getattr(player, 'display_name', player_id)
            try:
                return User.objects.get(username=display_name)
            except User.DoesNotExist:
                pass
            
            # Jako ostateczność, utwórz nowego użytkownika gościa
            username = f"guest_{player_id[:8]}"
            counter = 1
            base_username = username
            
            # Upewnij się, że username jest unikalny
            while User.objects.filter(username=username).exists():
                username = f"{base_username}_{counter}"
                counter += 1
            
            user = User.objects.create_user(
                username=username,
                email=f"{username}@guest.local",
                is_guest=True,
                display_name=display_name,
                preferred_color=getattr(player, 'color', 'blue')
            )
            
            logger.info(f"✅ Created new guest user: {username}")
            return user
            
        except Exception as e:
            logger.error(f"❌ Error creating user for player {player_id}: {e}")
            return None
    
    @staticmethod
    def _save_player_resources(game_player, resources):
        """
        Zapisz zasoby gracza
        """
        try:
            resource_mapping = {
                'wood': 'wood',
                'brick': 'brick', 
                'sheep': 'sheep',
                'wheat': 'wheat',
                'ore': 'ore'
            }
            
            for resource_name, amount in resource_mapping.items():
                resource_amount = getattr(resources, resource_name, 0)
                
                if resource_amount > 0:
                    PlayerResource.objects.create(
                        game_player=game_player,
                        resource_type=resource_name,
                        amount=resource_amount
                    )
            
            logger.info(f"✅ Saved resources for {game_player.user.username}")
            
        except Exception as e:
            logger.error(f"❌ Error saving resources: {e}")

    @staticmethod
    def get_game_statistics_for_user(user_id):
        """
        Pobierz statystyki gier dla użytkownika
        """
        try:
            game_players = GamePlayer.objects.filter(user_id=user_id)
            
            if not game_players.exists():
                return {
                    'total_games': 0,
                    'wins': 0,
                    'losses': 0,
                    'win_rate': 0,
                    'average_victory_points': 0,
                    'average_roads': 0,
                    'average_settlements': 0,
                    'average_cities': 0,
                    'longest_road_awards': 0,
                    'largest_army_awards': 0,
                }
            
            total_games = game_players.count()
            wins = game_players.filter(victory_points__gte=10).count()
            
            # Oblicz średnie
            avg_points = sum(gp.victory_points for gp in game_players) / total_games
            avg_roads = sum(gp.roads_built for gp in game_players) / total_games
            avg_settlements = sum(gp.settlements_built for gp in game_players) / total_games
            avg_cities = sum(gp.cities_built for gp in game_players) / total_games
            
            return {
                'total_games': total_games,
                'wins': wins,
                'losses': total_games - wins,
                'win_rate': (wins / total_games * 100) if total_games > 0 else 0,
                'average_victory_points': round(avg_points, 2),
                'average_roads': round(avg_roads, 2),
                'average_settlements': round(avg_settlements, 2),
                'average_cities': round(avg_cities, 2),
                'longest_road_awards': game_players.filter(longest_road=True).count(),
                'largest_army_awards': game_players.filter(largest_army=True).count(),
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting statistics for user {user_id}: {e}")
            return None