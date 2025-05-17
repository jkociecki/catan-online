import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from game_engine.game.game_state import GameState
from game_engine.common.game_config import GameConfig
from game_engine.player.player import Player
from game_engine.common.player_color import PlayerColor
import uuid
from game_engine.game.game_phase import GamePhase


# Store active game rooms
game_rooms = {}


class GameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'game_{self.room_id}'
        self.player_id = str(uuid.uuid4())

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Initialize game room if it doesn't exist
        if self.room_id not in game_rooms:
            config = GameConfig()
            game_state = GameState(config)
            game_state.phase = "setup"  # Jawnie ustawiamy fazę gry
            game_state.setup_placed = {}  # Słownik do śledzenia postępu fazy setup
            
            game_rooms[self.room_id] = {
                'game_state': game_state,
                'players': [],
                'max_players': 4,
                'started': False
            }

        # Add player to the room
        room = game_rooms[self.room_id]
        if len(room['players']) < room['max_players'] and not room['started']:
            player_colors = [PlayerColor.RED, PlayerColor.BLUE, PlayerColor.GREEN, PlayerColor.YELLOW]
            used_colors = [p.color for p in room['game_state'].players]
            available_colors = [c for c in player_colors if c not in used_colors]

            if available_colors:
                player_color = available_colors[0]
                player = Player(player_color, room['game_state'].game_config)
                player.id = self.player_id
                room['game_state'].add_player(player)
                room['players'].append(self.player_id)

                # Send client_id to the new player
                await self.send(text_data=json.dumps({
                    'type': 'client_id',
                    'player_id': self.player_id
                }))

                # Notify about new player
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'player_joined',
                        'player_id': self.player_id,
                        'player_color': player_color.value,
                        'player_count': len(room['players'])
                    }
                )

                # Check if game can start (4 players)
                if len(room['players']) == room['max_players']:
                    room['started'] = True
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'game_start',
                            'game_state': self.serialize_game_state(room['game_state'])
                        }
                    )
            else:
                # No colors available
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'No player colors available'
                }))
        else:
            # Room is full or game already started
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Room is full or game already started'
            }))

    async def disconnect(self, close_code):
        print(f"WebSocket disconnected with code: {close_code}")

        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

        # Remove player from room
        if self.room_id in game_rooms:
            room = game_rooms[self.room_id]
            if self.player_id in room['players']:
                room['players'].remove(self.player_id)

                # Remove player from game state
                for i, player in enumerate(room['game_state'].players):
                    if player.id == self.player_id:
                        room['game_state'].players.pop(i)
                        break

                # Notify about player leaving
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'player_left',
                        'player_id': self.player_id,
                        'player_count': len(room['players'])
                    }
                )

                # Remove room if empty
                if not room['players']:
                    del game_rooms[self.room_id]

    # Receive message from WebSocket
    # Receive message from WebSocket
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            print(f"Received message type: {message_type} from player {self.player_id}")

            if self.room_id not in game_rooms:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Game room not found'
                }))
                return

            room = game_rooms[self.room_id]
            game_state = room['game_state']

            if message_type == 'create_room':
                # Room already created on connect
                await self.send(text_data=json.dumps({
                    'type': 'room_created',
                    'room_id': self.room_id,
                    'player_id': self.player_id
                }))

            elif message_type == 'join_room':
                # Already handled in connect
                pass

            elif message_type == 'get_game_state':
                await self.send(text_data=json.dumps({
                    'type': 'game_state',
                    'game_state': self.serialize_game_state(game_state)
                }))

            elif message_type == 'get_client_id':
                await self.send(text_data=json.dumps({
                    'type': 'client_id',
                    'player_id': self.player_id
                }))

            elif message_type == 'enter_build_mode':
                build_type = data.get('build_type')

                # Notify all players about the build mode
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'build_mode',
                        'player_id': self.player_id,
                        'build_type': build_type
                    }
                )

            elif message_type == 'game_action':
                # Process game actions (build, trade, etc.)
                action = data.get('action')

                # Only process actions if game has started
                if not room['started'] and len(room['players']) >= 2:
                    # If we have at least 2 players, we can start the game manually
                    room['started'] = True
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'game_start',
                            'game_state': self.serialize_game_state(game_state)
                        }
                    )
                elif not room['started']:
                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'message': 'Game has not started yet, need at least 2 players'
                    }))
                    return

                # Get current game phase
                current_phase = getattr(game_state, 'phase', GamePhase.SETUP)

                # Handle actions based on game phase
                #if current_phase == GamePhase.SETUP:
                if current_phase == "setup":

                    # Setup phase - limited actions available
                    
                    if action == 'roll_dice':
                        # Cannot roll dice in setup phase
                        await self.send(text_data=json.dumps({
                            'type': 'error',
                            'message': 'Cannot roll dice in the setup phase'
                        }))
                        return
                    
                    elif action == 'build_settlement':
                        # Process settlement building in setup phase (free)
                        coords = data.get('coords')
                        result = await self.process_build_settlement(game_state, self.player_id, coords, is_setup=True)

                        if result:
                            # Notify all players about the build
                            await self.channel_layer.group_send(
                                self.room_group_name,
                                {
                                    'type': 'game_update',
                                    'action': 'build_settlement',
                                    'player_id': self.player_id,
                                    'coords': coords,
                                    'game_state': self.serialize_game_state(game_state)
                                }
                            )
                    
                    elif action == 'build_road':
                        # Process road building in setup phase (free)
                        coords = data.get('coords')
                        result = await self.process_build_road(game_state, self.player_id, coords, is_setup=True)

                        if result:
                            # Notify all players about the build
                            await self.channel_layer.group_send(
                                self.room_group_name,
                                {
                                    'type': 'game_update',
                                    'action': 'build_road',
                                    'player_id': self.player_id,
                                    'coords': coords,
                                    'game_state': self.serialize_game_state(game_state)
                                }
                            )
                    
                    elif action == 'end_turn':
                        # End turn in setup phase
                        # Check if setup phase is complete after this turn
                        if hasattr(game_state, 'check_setup_progress'):
                            game_state.check_setup_progress()
                        
                        # Process end turn
                        result = await self.process_end_turn(game_state)
                        if result:
                            # Get updated game phase after processing end turn
                            updated_phase = getattr(game_state, 'phase', GamePhase.SETUP)
                            
                            # Notify all players about the turn end
                            await self.channel_layer.group_send(
                                self.room_group_name,
                                {
                                    'type': 'game_update',
                                    'action': 'end_turn',
                                    'player_id': self.player_id,
                                    'game_state': self.serialize_game_state(game_state)
                                }
                            )
                            
                            if updated_phase != GamePhase.SETUP and updated_phase != "setup":
                                # Bezpiecznie pobierz wartość fazy
                                phase_value = updated_phase
                                if hasattr(updated_phase, 'value'):
                                    phase_value = updated_phase.value
                                
                                await self.channel_layer.group_send(
                                    self.room_group_name,
                                    {
                                        'type': 'phase_change',
                                        'phase': phase_value,  
                                        'game_state': self.serialize_game_state(game_state)
                                    }
                                )
                    
                    else:
                        # Unknown action for setup phase
                        await self.send(text_data=json.dumps({
                            'type': 'error',
                            'message': f'Unknown action in setup phase: {action}'
                        }))
                
                elif current_phase == GamePhase.ROLL_DICE:
                    # Roll dice phase - only dice rolling allowed
                    
                    if action == 'roll_dice':
                        try:
                            dice_result = await self.process_dice_roll(game_state)
                            await self.channel_layer.group_send(
                                self.room_group_name,
                                {
                                    'type': 'dice_roll',
                                    'player_id': self.player_id,
                                    'dice_result': dice_result,
                                    'game_state': self.serialize_game_state(game_state)
                                }
                            )
                        except Exception as e:
                            print(f"Error rolling dice: {str(e)}")
                            await self.send(text_data=json.dumps({
                                'type': 'error',
                                'message': f'Error rolling dice: {str(e)}'
                            }))
                    
                    else:
                        # Must roll dice first
                        await self.send(text_data=json.dumps({
                            'type': 'error',
                            'message': 'You must roll the dice first'
                        }))
                
                elif current_phase == GamePhase.MOVE_ROBBER:
                    # Move robber phase - after rolling 7
                    
                    if action == 'move_robber':
                        # Handle robber movement
                        tile_coords = data.get('tile_coords')
                        player_to_steal_from = data.get('player_to_steal_from')
                        
                        # Process robber movement
                        # This would need a proper implementation in your game logic
                        
                        # For now, just send a placeholder response
                        await self.send(text_data=json.dumps({
                            'type': 'error',
                            'message': 'Robber movement not fully implemented yet'
                        }))
                    
                    else:
                        # Must move robber first
                        await self.send(text_data=json.dumps({
                            'type': 'error',
                            'message': 'You must move the robber'
                        }))
                
                elif current_phase == GamePhase.DISCARD:
                    # Discard phase - after rolling 7, players with >7 cards must discard
                    
                    if action == 'discard_cards':
                        # Handle card discarding
                        resources = data.get('resources')
                        
                        # Process discarding
                        # This would need a proper implementation in your game logic
                        
                        # For now, just send a placeholder response
                        await self.send(text_data=json.dumps({
                            'type': 'error',
                            'message': 'Card discarding not fully implemented yet'
                        }))
                    
                    else:
                        # Must discard cards first
                        await self.send(text_data=json.dumps({
                            'type': 'error',
                            'message': 'You must discard cards'
                        }))
                
                elif current_phase == GamePhase.MAIN:
                    # Main phase - most actions available
                    
                    if action == 'build_settlement':
                        # Process settlement building
                        coords = data.get('coords')
                        result = await self.process_build_settlement(game_state, self.player_id, coords)

                        if result:
                            # Notify all players about the build
                            await self.channel_layer.group_send(
                                self.room_group_name,
                                {
                                    'type': 'game_update',
                                    'action': 'build_settlement',
                                    'player_id': self.player_id,
                                    'coords': coords,
                                    'game_state': self.serialize_game_state(game_state)
                                }
                            )

                    elif action == 'build_city':
                        coords = data.get('coords')
                        result = await self.process_build_city(game_state, self.player_id, coords)

                        if result:
                            # Notify all players about the build
                            await self.channel_layer.group_send(
                                self.room_group_name,
                                {
                                    'type': 'game_update',
                                    'action': 'build_city',
                                    'player_id': self.player_id,
                                    'coords': coords,
                                    'game_state': self.serialize_game_state(game_state)
                                }
                            )

                    elif action == 'build_road':
                        coords = data.get('coords')
                        result = await self.process_build_road(game_state, self.player_id, coords)

                        if result:
                            # Notify all players about the build
                            await self.channel_layer.group_send(
                                self.room_group_name,
                                {
                                    'type': 'game_update',
                                    'action': 'build_road',
                                    'player_id': self.player_id,
                                    'coords': coords,
                                    'game_state': self.serialize_game_state(game_state)
                                }
                            )
                    
                    elif action == 'buy_development_card':
                        # Handle buying development card
                        # This would need a proper implementation in your game logic
                        
                        # For now, just send a placeholder response
                        await self.send(text_data=json.dumps({
                            'type': 'error',
                            'message': 'Buying development cards not fully implemented yet'
                        }))
                    
                    elif action == 'play_development_card':
                        # Handle playing development card
                        card_type = data.get('card_type')
                        # Additional parameters based on card type
                        
                        # This would need a proper implementation in your game logic
                        
                        # For now, just send a placeholder response
                        await self.send(text_data=json.dumps({
                            'type': 'error',
                            'message': 'Playing development cards not fully implemented yet'
                        }))
                    
                    elif action == 'trade_offer':
                        # Handle trade offers
                        offer = data.get('offer')
                        request = data.get('request')
                        
                        # This would need a proper implementation in your game logic
                        
                        # For now, just send a placeholder response
                        await self.send(text_data=json.dumps({
                            'type': 'error',
                            'message': 'Trading not fully implemented yet'
                        }))
                    
                    elif action == 'end_turn':
                        result = await self.process_end_turn(game_state)
                        if result:
                            await self.channel_layer.group_send(
                                self.room_group_name,
                                {
                                    'type': 'game_update',
                                    'action': 'end_turn',
                                    'player_id': self.player_id,
                                    'game_state': self.serialize_game_state(game_state)
                                }
                            )
                    
                    else:
                        # Unknown action for main phase
                        await self.send(text_data=json.dumps({
                            'type': 'error',
                            'message': f'Unknown action in main phase: {action}'
                        }))
                
                elif current_phase == GamePhase.TRADE:
                    # Trade phase
                    # Handle trade-specific actions
                    
                    # For now, just send a placeholder response
                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'message': 'Trade phase not fully implemented yet'
                    }))
                
                elif current_phase == GamePhase.END_TURN:
                    # End turn phase
                    
                    if action == 'end_turn':
                        result = await self.process_end_turn(game_state)
                        if result:
                            await self.channel_layer.group_send(
                                self.room_group_name,
                                {
                                    'type': 'game_update',
                                    'action': 'end_turn',
                                    'player_id': self.player_id,
                                    'game_state': self.serialize_game_state(game_state)
                                }
                            )
                    
                    else:
                        # Only end_turn action is valid here
                        await self.send(text_data=json.dumps({
                            'type': 'error',
                            'message': 'Only end turn action is allowed in this phase'
                        }))
                
                else:
                    # Unknown game phase
                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'message': f'Unknown game phase: {current_phase}'
                    }))
            
            else:
                # Unknown message type
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': f'Unknown message type: {message_type}'
                }))
                    
        except Exception as e:
            print(f"Error processing WebSocket message: {str(e)}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': f'Server error: {str(e)}'
            }))

    # Helper methods
    def serialize_game_state(self, game_state):
        board_data = game_state.game_board.serialize_board()

        players_data = []
        for player in game_state.players:
            players_data.append({
                'id': player.id,
                'color': player.color.value,
                'resources': player.player_resources.serialize() if hasattr(player.player_resources,
                                                                            'serialize') else player.player_resources.resources,
                'victory_points': player.victory_points,
                'settlements_left': player.settlements_left,
                'cities_left': player.cities_left,
                'roads_left': player.roads_left
            })

        # Określ bieżący indeks gracza w zależności od fazy
        is_setup_phase = False
        if hasattr(game_state, 'phase'):
            if isinstance(game_state.phase, str):
                is_setup_phase = game_state.phase.lower() == "setup"
            else:
                is_setup_phase = game_state.phase == GamePhase.SETUP
        
        current_player_index = 0
        if is_setup_phase:
            # W fazie setup, użyj indeksu z pokoju
            current_room = game_rooms[self.room_id]
            current_player_index = current_room.get('setup_player_index', 0)
        else:
            # W innych fazach, użyj wartości z GameState
            current_player_index = game_state.current_player_index if hasattr(game_state, 'current_player_index') else 0

        # Określ fazę gry
        if hasattr(game_state, 'phase'):
            if isinstance(game_state.phase, str):
                phase = game_state.phase
            else:
                # Zakładając, że to enum z atrybutem value
                phase = game_state.phase.value
        else:
            phase = "setup"  # Domyślnie faza setup

        return {
            'board': board_data,
            'players': players_data,
            'current_player_index': current_player_index,
            'phase': phase
        }
    @database_sync_to_async
    def process_build_settlement(self, game_state, player_id, coords):
        # Find player by ID
        player = None
        for p in game_state.players:
            if p.id == player_id:
                player = p
                break

        if not player:
            return False

        try:
            # Convert coords to the format expected by the game engine
            vertex_coords = set([tuple(coord) for coord in coords])

            # Assuming your game has a method to handle settlement building
            if hasattr(game_state, 'turn_manager'):
                return game_state.turn_manager.build_settlement(player, vertex_coords)
            return False
        except Exception as e:
            print(f"Error building settlement: {str(e)}")
            return False

    @database_sync_to_async
    def process_dice_roll(self, game_state):
        """Roll dice and distribute resources"""
        # Sprawdź czy jesteśmy w fazie setup
        if not hasattr(game_state, 'phase') or game_state.phase == "setup":
            raise Exception("Cannot roll dice in the setup phase")
        
        if not hasattr(game_state, 'turn_manager'):
            raise Exception("Game not properly initialized")

        try:
            # Roll dice
            dice1, dice2 = game_state.turn_manager.roll_dice()
            dice_total = dice1 + dice2

            # Distribute resources based on dice roll
            game_state.distribute_resources(dice_total)

            return {
                'dice1': dice1,
                'dice2': dice2,
                'total': dice_total
            }
        except Exception as e:
            print(f"Error rolling dice: {str(e)}")
            raise e

    @database_sync_to_async
    def process_end_turn(self, game_state):
        """Zakończ turę aktualnego gracza"""
        try:
            print("Rozpoczynam process_end_turn")
            
            # Sprawdź, czy jesteśmy w fazie setup
            is_setup_phase = False
            if hasattr(game_state, 'phase'):
                if isinstance(game_state.phase, str):
                    is_setup_phase = game_state.phase.lower() == "setup"
                else:
                    is_setup_phase = game_state.phase == GamePhase.SETUP
            
            if is_setup_phase:
                print("Jesteśmy w fazie setup")
                # W fazie setup, przechowujemy indeks aktualnego gracza w atrybucie pokoju
                current_room = game_rooms[self.room_id]
                
                # Upewnij się, że klucz istnieje
                if 'setup_player_index' not in current_room:
                    current_room['setup_player_index'] = 0
                
                # Przejdź do następnego gracza
                current_room['setup_player_index'] = (current_room['setup_player_index'] + 1) % len(game_state.players)
                
                # Sprawdź czy po zmianie tury powinniśmy zaktualizować fazę
                if hasattr(game_state, 'check_setup_progress'):
                    game_state.check_setup_progress()
                
                return True
            
            # W innych fazach
            print("Jesteśmy poza fazą setup")
            # Używaj istniejących metod
            if hasattr(game_state, 'next_turn'):
                game_state.next_turn()
                return True
            elif hasattr(game_state, 'turn_manager') and game_state.turn_manager:
                game_state.turn_manager.next_player()
                return True
            
            return False
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Błąd podczas kończenia tury: {str(e)}")
            return False

    @database_sync_to_async
    def process_build_road(self, game_state, player_id, coords):
        """Process road building"""
        player = None
        for p in game_state.players:
            if p.id == player_id:
                player = p
                break

        if not player:
            return False

        try:
            # Convert coords to the format expected by the game engine
            edge_coords = set([tuple(coord) for coord in coords])

            if hasattr(game_state, 'turn_manager'):
                return game_state.turn_manager.build_road(player, edge_coords)
            return False
        except Exception as e:
            print(f"Error building road: {str(e)}")
            return False

    @database_sync_to_async
    def process_build_city(self, game_state, player_id, coords):
        """Process city building (upgrading settlement)"""
        player = None
        for p in game_state.players:
            if p.id == player_id:
                player = p
                break

        if not player:
            return False

        try:
            # Convert coords to the format expected by the game engine
            vertex_coords = set([tuple(coord) for coord in coords])

            if hasattr(game_state, 'turn_manager'):
                return game_state.turn_manager.build_city(player, vertex_coords)
            return False
        except Exception as e:
            print(f"Error building city: {str(e)}")
            return False

    # Event handlers
    async def player_joined(self, event):
        await self.send(text_data=json.dumps({
            'type': 'player_joined',
            'player_id': event['player_id'],
            'player_color': event['player_color'],
            'player_count': event['player_count']
        }))

    async def player_left(self, event):
        await self.send(text_data=json.dumps({
            'type': 'player_left',
            'player_id': event['player_id'],
            'player_count': event['player_count']
        }))

    async def game_start(self, event):
        await self.send(text_data=json.dumps({
            'type': 'game_start',
            'game_state': event['game_state']
        }))

    async def game_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'game_update',
            'action': event['action'],
            'player_id': event['player_id'],
            'coords': event.get('coords'),
            'game_state': event['game_state']
        }))

    async def dice_roll(self, event):
        """Send dice roll result to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'dice_roll',
            'result': event['result']
        }))

    async def build_mode(self, event):
        """Send build mode information to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'build_mode',
            'player_id': event['player_id'],
            'build_type': event['build_type']
        }))

    async def phase_change(self, event):
        """Send phase change information to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'phase_change',
            'phase': event['phase'],
            'game_state': event.get('game_state')
        }))