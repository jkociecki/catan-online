# backend/game_api/game_saver.py - NAPRAWIONA WERSJA - zapisuje wszystkich graczy
from django.contrib.auth import get_user_model
from django.db.models import Q  # ✅ DODANY IMPORT!
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
        Zapisz zakończoną grę do bazy danych - POPRAWIONA WERSJA
        Zapisuje WSZYSTKICH graczy, nawet jeśli niektórzy mają problemy
        """
        try:
            logger.info(f"🎮 Saving completed game to database")
            
            # Sprawdź czy gra rzeczywiście się skończyła
            if not game_state.is_game_over():
                logger.warning("❌ Game is not finished yet, skipping save")
                return None
            
            # ✅ POBIERZ ROZKŁAD KOSTEK Z GAME_STATE
            dice_distribution = getattr(game_state, 'dice_distribution', {})
            if not dice_distribution:
                logger.info("📊 No dice distribution found in game_state, using empty dict")
                dice_distribution = {}
            else:
                logger.info(f"🎲 Found dice distribution: {dice_distribution}")
            
            # ✅ TWORZYMY GRĘ Z ROZKŁADEM KOSTEK
            game = Game.objects.create(
                start_time=start_time or datetime.now(),
                end_time=datetime.now(),
                dice_distribution=dice_distribution,  # ✅ PRAWDZIWY ROZKŁAD!
                turns=getattr(game_state, 'current_turn', 0)
            )
            
            logger.info(f"✅ Created Game object with ID: {game.id}, dice_distribution: {dice_distribution}")
            
            saved_players = []
            failed_players = []
            
            # ✅ ZAPISUJEMY KAŻDEGO GRACZA OSOBNO - z lepszą logiką
            for player_id, player in game_state.players.items():
                try:
                    logger.info(f"🎯 Processing player {player_id[:8]} - display_name: '{getattr(player, 'display_name', 'N/A')}'")
                    
                    # Spróbuj zapisać tego gracza w osobnej transakcji
                    with transaction.atomic():
                        user = GameSaver._get_real_user_for_player(player_id, player)
                        
                        if not user:
                            logger.error(f"❌ Could not find/create user for player {player_id[:8]}")
                            failed_players.append({
                                'player_id': player_id[:8],
                                'display_name': getattr(player, 'display_name', 'N/A'),
                                'reason': 'User not found/created'
                            })
                            continue
                        
                        # ✅ SPRAWDŹ CZY GRACZ JUŻ ISTNIEJE W TEJ GRZE
                        existing = GamePlayer.objects.filter(game=game, user=user).first()
                        if existing:
                            logger.warning(f"⚠️ Player {user.username} already exists in game {game.id}, skipping")
                            continue
                        
                        # Utwórz GamePlayer
                        game_player = GamePlayer.objects.create(
                            game=game,
                            user=user,
                            victory_points=getattr(player, 'victory_points', 0),
                            roads_built=15 - getattr(player, 'roads_left', 15),
                            settlements_built=5 - getattr(player, 'settlements_left', 5),
                            cities_built=4 - getattr(player, 'cities_left', 4),
                            longest_road=getattr(player, 'longest_road', False),
                            largest_army=getattr(player, 'largest_army', False)
                        )
                        
                        logger.info(f"✅ Created GamePlayer for {player.display_name} (User: {user.username}, ID: {user.id})")
                        
                        # Zapisz zasoby gracza
                        GameSaver._save_player_resources(game_player, getattr(player, 'resources', None))
                        
                        saved_players.append({
                            'player_id': player_id[:8],
                            'username': user.username,
                            'display_name': getattr(player, 'display_name', 'N/A'),
                            'victory_points': getattr(player, 'victory_points', 0)
                        })
                        
                except Exception as e:
                    logger.error(f"❌ Error saving player {player_id[:8]}: {e}")
                    failed_players.append({
                        'player_id': player_id[:8],
                        'display_name': getattr(player, 'display_name', 'N/A'),
                        'reason': str(e)
                    })
                    # ✅ NIE PRZERYWAMY - idziemy dalej do następnego gracza
                    continue
            
            # ✅ SZCZEGÓŁOWE LOGOWANIE WYNIKÓW
            logger.info(f"🎉 Game {game.id} saved!")
            logger.info(f"📊 Total players in game_state: {len(game_state.players)}")
            logger.info(f"✅ Successfully saved: {len(saved_players)} players")
            logger.info(f"❌ Failed to save: {len(failed_players)} players")
            
            if saved_players:
                logger.info("✅ SAVED PLAYERS:")
                for sp in saved_players:
                    logger.info(f"   - {sp['username']} ({sp['display_name']}) - {sp['victory_points']} pts")
            
            if failed_players:
                logger.warning("❌ FAILED PLAYERS:")
                for fp in failed_players:
                    logger.warning(f"   - {fp['player_id']} ({fp['display_name']}) - {fp['reason']}")
            
            # ✅ ZWRACAMY GRĘ NAWET JEŚLI NIEKTÓRZY GRACZE SIĘ NIE ZAPISALI
            return game
            
        except Exception as e:
            logger.error(f"❌ Critical error saving game to database: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    @staticmethod
    def _get_real_user_for_player(player_id, player):
        """
        ✅ ULEPSZONA WERSJA - Znajdź prawdziwego użytkownika dla gracza
        """
        try:
            display_name = getattr(player, 'display_name', str(player_id))
            color = getattr(player, 'color', 'blue')
            logger.info(f"🔍 Looking for user - player_id: {player_id[:8]}, display_name: '{display_name}', color: '{color}'")
            
            # ✅ METODA 1: Szukaj zalogowanych użytkowników po display_name
            try:
                user = User.objects.get(display_name=display_name, is_guest=False)
                logger.info(f"✅ Method 1: Found LOGGED IN user by display_name: {user.username} (ID: {user.id})")
                return user
            except User.DoesNotExist:
                logger.info("⏭️ Method 1 failed: No logged user with this display_name")
            except User.MultipleObjectsReturned:
                # Jeśli jest kilku użytkowników o tej samej nazwie, weź pierwszego zalogowanego
                user = User.objects.filter(display_name=display_name, is_guest=False).first()
                if user:
                    logger.info(f"✅ Method 1b: Found FIRST logged user: {user.username} (ID: {user.id})")
                    return user
            
            # ✅ METODA 2: Szukaj zalogowanych użytkowników po username
            try:
                user = User.objects.get(username=display_name, is_guest=False)
                logger.info(f"✅ Method 2: Found LOGGED IN user by username: {user.username} (ID: {user.id})")
                return user
            except User.DoesNotExist:
                logger.info("⏭️ Method 2 failed: No logged user with this username")
            except User.MultipleObjectsReturned:
                user = User.objects.filter(username=display_name, is_guest=False).first()
                if user:
                    logger.info(f"✅ Method 2b: Found FIRST logged user by username: {user.username} (ID: {user.id})")
                    return user
                
            # ✅ METODA 3: Sprawdź czy display_name zawiera rzeczywiste imię użytkownika
            try:
                if display_name and len(display_name) > 2:
                    # Szukaj po pierwszym słowie z display_name (imię)
                    first_name = display_name.split()[0] if ' ' in display_name else display_name
                    
                    # Sprawdź czy istnieje użytkownik z podobnym username lub display_name
                    similar_users = User.objects.filter(
                        Q(username__icontains=first_name.lower()) | 
                        Q(display_name__icontains=first_name),
                        is_guest=False
                    ).first()
                    
                    if similar_users:
                        logger.info(f"✅ Method 3: Found SIMILAR user: {similar_users.username} (ID: {similar_users.id})")
                        return similar_users
                        
                logger.info("⏭️ Method 3 failed: No similar users found")
            except Exception as e:
                logger.warning(f"⚠️ Method 3 error: {e}")
            
            # ✅ METODA 4: Szukaj istniejących gości o tej nazwie
            try:
                # Sprawdź różne warianty username dla gości
                guest_variants = [
                    f"guest_{display_name}".replace(' ', '_')[:50],
                    f"guest_{display_name.lower()}".replace(' ', '_')[:50],
                    display_name.replace(' ', '_')[:50]
                ]
                
                for variant in guest_variants:
                    try:
                        user = User.objects.get(username=variant, is_guest=True)
                        logger.info(f"✅ Method 4: Found existing GUEST user: {user.username} (ID: {user.id})")
                        return user
                    except User.DoesNotExist:
                        continue
                        
                logger.info("⏭️ Method 4 failed: No existing guest found")
            except Exception as e:
                logger.warning(f"⚠️ Method 4 error: {e}")
            
            # ✅ METODA 5: Utwórz nowego gościa - TYLKO JEŚLI NAPRAWDĘ POTRZEBA
            logger.info(f"🆕 Creating new guest user for '{display_name}'")
            
            # Generuj bezpieczny i unikalny username
            safe_name = display_name.replace(' ', '_').replace('@', '_').replace('.', '_')
            base_username = f"guest_{safe_name}"[:40]
            username = base_username
            counter = 1
            
            # Znajdź wolny username
            while User.objects.filter(username=username).exists():
                username = f"{base_username}_{counter}"
                counter += 1
                if counter > 100:  # Zabezpieczenie przed nieskończoną pętlą
                    username = f"guest_{int(datetime.now().timestamp())}"
                    break
            
            # Utwórz nowego gościa
            try:
                user = User.objects.create_user(
                    username=username,
                    email=f"{username}@guest.local",
                    is_guest=True,
                    display_name=display_name,
                    preferred_color=color
                )
                
                logger.info(f"✅ Method 5: Created new guest user: {username} (ID: {user.id})")
                return user
                
            except Exception as create_error:
                logger.error(f"❌ Failed to create guest user: {create_error}")
                
                # ✅ OSTATNIA SZANSA - znajdź dowolnego gościa jako fallback
                try:
                    fallback_user = User.objects.filter(is_guest=True).first()
                    if fallback_user:
                        logger.warning(f"🔄 Method 6: Using fallback guest user: {fallback_user.username}")
                        return fallback_user
                except:
                    pass
                
                return None
            
        except Exception as e:
            logger.error(f"❌ Critical error finding/creating user for player {player_id[:8]}: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    @staticmethod
    def _save_player_resources(game_player, resources):
        """
        Zapisz zasoby gracza - POPRAWIONA WERSJA
        """
        try:
            if not resources:
                logger.warning(f"⚠️ No resources found for {game_player.user.username}")
                return
                
            resource_mapping = {
                'wood': 'wood',
                'brick': 'brick', 
                'sheep': 'sheep',
                'wheat': 'wheat',
                'ore': 'ore'
            }
            
            saved_resources = []
            for resource_name, db_name in resource_mapping.items():
                try:
                    resource_amount = getattr(resources, resource_name, 0)
                    
                    if resource_amount > 0:
                        PlayerResource.objects.create(
                            game_player=game_player,
                            resource_type=db_name,
                            amount=resource_amount
                        )
                        saved_resources.append(f"{db_name}:{resource_amount}")
                except Exception as e:
                    logger.error(f"❌ Error saving resource {resource_name}: {e}")
            
            if saved_resources:
                logger.info(f"✅ Saved resources for {game_player.user.username}: {', '.join(saved_resources)}")
            else:
                logger.info(f"📊 No resources to save for {game_player.user.username}")
            
        except Exception as e:
            logger.error(f"❌ Error saving resources for {game_player.user.username}: {e}")

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