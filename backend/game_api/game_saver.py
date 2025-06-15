# backend/game_api/game_saver.py - ODPORNA WERSJA NA BŁĘDY
from django.contrib.auth import get_user_model
from game_api.models import Game, GamePlayer, PlayerResource
import json
from datetime import datetime
import logging
from django.db import transaction

User = get_user_model()
logger = logging.getLogger(__name__)

class GameSaver:
    """Klasa do zapisywania zakończonych gier do bazy danych"""
    
    @staticmethod
    def save_completed_game(game_state, start_time=None):
        """
        Zapisz zakończoną grę do bazy danych - ODPORNA NA BŁĘDY WERSJA
        Zapisuje zalogowanych graczy nawet jeśli goście się nie zapiszą
        """
        try:
            logger.info(f"🎮 Saving completed game to database")
            
            # Sprawdź czy gra rzeczywiście się skończyła
            if not game_state.is_game_over():
                logger.warning("❌ Game is not finished yet, skipping save")
                return None
            
            # ✅ TWORZYMY GRĘ ZAWSZE (nie w transakcji atomowej)
            game = Game.objects.create(
                start_time=start_time or datetime.now(),
                end_time=datetime.now(),
                dice_distribution={},  
                turns=getattr(game_state, 'current_turn', 0)
            )
            
            logger.info(f"✅ Created Game object with ID: {game.id}")
            
            saved_players = []
            failed_players = []
            
            # ✅ ZAPISUJEMY KAŻDEGO GRACZA OSOBNO - bez atomic transaction
            for player_id, player in game_state.players.items():
                try:
                    # Spróbuj zapisać tego gracza w osobnej transakcji
                    with transaction.atomic():
                        user = GameSaver._get_real_user_for_player(player_id, player)
                        
                        if not user:
                            logger.warning(f"❌ Could not find/create user for player {player_id}")
                            failed_players.append(player_id)
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
                        
                        logger.info(f"✅ Created GamePlayer for {player.display_name} (User ID: {user.id})")
                        
                        # Zapisz zasoby gracza
                        GameSaver._save_player_resources(game_player, player.resources)
                        
                        saved_players.append(player_id)
                        
                except Exception as e:
                    logger.error(f"❌ Error saving player {player_id}: {e}")
                    failed_players.append(player_id)
                    # ✅ NIE PRZERYWAMY - idziemy dalej do następnego gracza
                    continue
            
            # ✅ LOGUJEMY WYNIKI
            logger.info(f"🎉 Game {game.id} saved with {len(saved_players)} players")
            if saved_players:
                logger.info(f"✅ Successfully saved players: {[p[:8] for p in saved_players]}")
            if failed_players:
                logger.warning(f"❌ Failed to save players: {[p[:8] for p in failed_players]}")
            
            # ✅ ZWRACAMY GRĘ NAWET JEŚLI NIEKTÓRZY GRACZE SIĘ NIE ZAPISALI
            return game
            
        except Exception as e:
            logger.error(f"❌ Critical error saving game to database: {e}")
            return None
    
    @staticmethod
    def _get_real_user_for_player(player_id, player):
        """
        ✅ ULEPSZONA - Znajdź prawdziwego użytkownika dla gracza
        Priorytet: zalogowani użytkownicy > goście
        """
        try:
            display_name = getattr(player, 'display_name', str(player_id))
            logger.info(f"🔍 Looking for user - player_id: {player_id[:8]}, display_name: '{display_name}'")
            
            # ✅ METODA 1: Szukaj zalogowanych użytkowników po display_name
            try:
                user = User.objects.get(display_name=display_name, is_guest=False)
                logger.info(f"✅ Found LOGGED IN user by display_name: {user.username} (ID: {user.id})")
                return user
            except User.DoesNotExist:
                pass
            
            # ✅ METODA 2: Szukaj zalogowanych użytkowników po username
            try:
                user = User.objects.get(username=display_name, is_guest=False)
                logger.info(f"✅ Found LOGGED IN user by username: {user.username} (ID: {user.id})")
                return user
            except User.DoesNotExist:
                pass
            
            # ✅ METODA 3: Szukaj istniejących gości
            try:
                guest_username = f"guest_{display_name}".replace(' ', '_')[:50]
                user = User.objects.get(username=guest_username, is_guest=True)
                logger.info(f"✅ Found existing GUEST user: {user.username} (ID: {user.id})")
                return user
            except User.DoesNotExist:
                pass
            
            # ✅ METODA 4: Utwórz nowego gościa - ALE TYLKO JEŚLI TO KONIECZNE
            logger.info(f"🆕 Creating new guest user for {display_name}")
            
            # Generuj unikalny username
            base_username = f"guest_{display_name}".replace(' ', '_')[:40]
            username = base_username
            counter = 1
            
            while User.objects.filter(username=username).exists():
                username = f"{base_username}_{counter}"
                counter += 1
                if counter > 100:  # Zabezpieczenie
                    username = f"guest_{int(datetime.now().timestamp())}"
                    break
            
            # ✅ SPRAWDŹ CZY TABELA users_user ISTNIEJE
            try:
                user = User.objects.create_user(
                    username=username,
                    email=f"{username}@guest.local",
                    is_guest=True,
                    display_name=display_name,
                    preferred_color=getattr(player, 'color', 'blue')
                )
                
                logger.info(f"✅ Created new guest user: {username} (ID: {user.id})")
                return user
                
            except Exception as create_error:
                logger.error(f"❌ Failed to create guest user: {create_error}")
                
                # ✅ OSTATNIA SZANSA - znajdź dowolnego istniejącego użytkownika 
                try:
                    fallback_user = User.objects.filter(is_guest=True).first()
                    if fallback_user:
                        logger.warning(f"🔄 Using fallback guest user: {fallback_user.username}")
                        return fallback_user
                except:
                    pass
                
                return None
            
        except Exception as e:
            logger.error(f"❌ Error finding/creating user for player {player_id}: {e}")
            return None
    
    @staticmethod
    def _save_player_resources(game_player, resources):
        """
        Zapisz zasoby gracza - BEZ ZMIAN
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
        Pobierz statystyki gier dla użytkownika - BEZ ZMIAN
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
            wins = game_players.filter(victory_points__gte=4).count()  # ✅ 4 punkty dla testowania
            
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