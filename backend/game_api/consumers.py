import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from game_engine.game.game_state import GameState
from game_engine.common.game_config import GameConfig
from game_engine.player.player import Player
from game_engine.common.player_color import PlayerColor
import uuid

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
            game_rooms[self.room_id] = {
                'game_state': GameState(config),
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
                    'game_state': self.serialize_game_state(room['game_state'])
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
                            'game_state': self.serialize_game_state(room['game_state'])
                        }
                    )
                elif not room['started']:
                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'message': 'Game has not started yet, need at least 2 players'
                    }))
                    return

                # Handle different game actions
                if action == 'roll_dice':
                    result = await self.process_dice_roll(room['game_state'])

                    if result:
                        # Game state is updated after rolling dice
                        await self.channel_layer.group_send(
                            self.room_group_name,
                            {
                                'type': 'game_update',
                                'action': 'roll_dice',
                                'player_id': self.player_id,
                                'game_state': self.serialize_game_state(room['game_state'])
                            }
                        )

                elif action == 'build_settlement':
                    # Process settlement building
                    coords = data.get('coords')
                    result = await self.process_build_settlement(room['game_state'], self.player_id, coords)

                    if result:
                        # Notify all players about the build
                        await self.channel_layer.group_send(
                            self.room_group_name,
                            {
                                'type': 'game_update',
                                'action': 'build_settlement',
                                'player_id': self.player_id,
                                'coords': coords,
                                'game_state': self.serialize_game_state(room['game_state'])
                            }
                        )

                elif action == 'build_city':
                    coords = data.get('coords')
                    result = await self.process_build_city(room['game_state'], self.player_id, coords)

                    if result:
                        # Notify all players about the build
                        await self.channel_layer.group_send(
                            self.room_group_name,
                            {
                                'type': 'game_update',
                                'action': 'build_city',
                                'player_id': self.player_id,
                                'coords': coords,
                                'game_state': self.serialize_game_state(room['game_state'])
                            }
                        )

                elif action == 'build_road':
                    coords = data.get('coords')
                    result = await self.process_build_road(room['game_state'], self.player_id, coords)

                    if result:
                        # Notify all players about the build
                        await self.channel_layer.group_send(
                            self.room_group_name,
                            {
                                'type': 'game_update',
                                'action': 'build_road',
                                'player_id': self.player_id,
                                'coords': coords,
                                'game_state': self.serialize_game_state(room['game_state'])
                            }
                        )

                elif action == 'end_turn':
                    result = await self.process_end_turn(room['game_state'])
                    if result:
                        await self.channel_layer.group_send(
                            self.room_group_name,
                            {
                                'type': 'game_update',
                                'action': 'end_turn',
                                'player_id': self.player_id,
                                'game_state': self.serialize_game_state(room['game_state'])
                            }
                        )
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

        current_player_index = game_state.current_player_index if hasattr(game_state, 'current_player_index') else 0

        return {
            'board': board_data,
            'players': players_data,
            'current_player_index': current_player_index
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
        if not hasattr(game_state, 'turn_manager'):
            # Initialize turn manager if not already done
            if len(game_state.players) > 1:
                game_state.turn_manager = game_state.players[0]
                return True
            return False

        try:
            dice1, dice2 = game_state.turn_manager.roll_dice()
            dice_total = dice1 + dice2

            # Notify all players about the dice roll
            self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'dice_roll',
                    'result': dice_total
                }
            )

            return True
        except Exception as e:
            print(f"Error rolling dice: {str(e)}")
            return False

    @database_sync_to_async
    def process_end_turn(self, game_state):
        """End the current player's turn"""
        if not hasattr(game_state, 'turn_manager'):
            # Initialize turn manager if not already done
            if len(game_state.players) > 1:
                game_state.turn_manager = game_state.players[0]

            return False

        try:
            game_state.turn_manager.end_turn()
            return True
        except Exception as e:
            print(f"Error ending turn: {str(e)}")
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