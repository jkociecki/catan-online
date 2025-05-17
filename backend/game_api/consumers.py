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
                print(f"Received game action: {action} with data: {data}")

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
                print(f"Current game phase: {current_phase}")

                # Pobranie player_id z wiadomości jeśli dostępne, w przeciwnym razie użyj ID klienta websocket
                player_id = data.get('player_id', self.player_id)

                # Znajdź gracza na podstawie ID
                player = None
                for p in game_state.players:
                    if p.id == player_id:
                        player = p
                        break

                if not player:
                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'message': f'Player with ID {player_id} not found'
                    }))
                    return

                # Handle actions based on game phase
                # Sprawdź czy jesteśmy w fazie setup
                is_setup_phase = False
                if isinstance(current_phase, str):
                    is_setup_phase = current_phase.lower() == "setup"
                else:
                    is_setup_phase = current_phase == GamePhase.SETUP

                print(f"Is setup phase: {is_setup_phase}")

                if is_setup_phase:
                    # Setup phase - limited actions available
                    if action == 'roll_dice':
                        # Cannot roll dice in setup phase
                        await self.send(text_data=json.dumps({
                            'type': 'error',
                            'message': 'Cannot roll dice in the setup phase'
                        }))
                        return

                    elif action == 'build_settlement':
                        # Obsługa budowania osady
                        # Pobierz albo współrzędne albo tileId i cornerIndex
                        coords = data.get('coords')
                        tile_id = data.get('tileId')
                        corner_index = data.get('cornerIndex')

                        print(
                            f"Build settlement request: coords={coords}, tileId={tile_id}, cornerIndex={corner_index}")

                        # Obsługa budowania na podstawie tileId i cornerIndex
                        if tile_id is not None and corner_index is not None:
                            print(f"Building settlement using tileId={tile_id} and cornerIndex={corner_index}")

                            # Konwertuj tile_id na współrzędne
                            try:
                                tile_coords = tuple(map(int, tile_id.split(',')))

                                # Użyj współrzędnych kafelka jako koordynatów
                                coords = [list(tile_coords)]
                                print(f"Converted tileId to coords: {coords}")
                            except Exception as e:
                                print(f"Error converting tileId to coordinates: {str(e)}")
                                await self.send(text_data=json.dumps({
                                    'type': 'error',
                                    'message': f'Invalid tileId format: {str(e)}'
                                }))
                                return

                        # Kontynuuj standardową obsługę budowania osady
                        if not coords:
                            await self.send(text_data=json.dumps({
                                'type': 'error',
                                'message': 'Missing coordinates for settlement'
                            }))
                            return

                        print(f"Building settlement with coords: {coords}")
                        result = await self.process_build_settlement(game_state, player_id, coords,
                                                                     is_setup=is_setup_phase)

                        if result:
                            # Notify all players about the build
                            await self.channel_layer.group_send(
                                self.room_group_name,
                                {
                                    'type': 'game_update',
                                    'action': 'build_settlement',
                                    'player_id': player_id,
                                    'coords': coords,
                                    'game_state': self.serialize_game_state(game_state)
                                }
                            )
                        else:
                            await self.send(text_data=json.dumps({
                                'type': 'error',
                                'message': 'Cannot build settlement at this location'
                            }))
                    elif action == 'build_road':
                        coords = data.get('coords')
                        tile_id = data.get('tileId')
                        edge_index = data.get('edgeIndex')

                        print(f"Build road request: coords={coords}, tileId={tile_id}, edgeIndex={edge_index}")

                        # Obsługa budowania na podstawie tileId i edgeIndex
                        if tile_id is not None and edge_index is not None:
                            print(f"Building road using tileId={tile_id} and edgeIndex={edge_index}")

                            # Konwertuj tile_id na współrzędne
                            try:
                                tile_coords = tuple(map(int, tile_id.split(',')))

                                # Użyj współrzędnych kafelka jako koordynatów
                                coords = [list(tile_coords)]
                                print(f"Converted tileId to coords: {coords}")
                            except Exception as e:
                                print(f"Error converting tileId to coordinates: {str(e)}")
                                await self.send(text_data=json.dumps({
                                    'type': 'error',
                                    'message': f'Invalid tileId format: {str(e)}'
                                }))
                                return

                        # Kontynuuj standardową obsługę budowania drogi
                        if not coords:
                            await self.send(text_data=json.dumps({
                                'type': 'error',
                                'message': 'Missing coordinates for road'
                            }))
                            return

                        print(f"Building road with coords: {coords} by player {player_id}")
                        result = await self.process_build_road(game_state, player_id, coords, is_setup=is_setup_phase)

                        if result:
                            # Notify all players about the build
                            await self.channel_layer.group_send(
                                self.room_group_name,
                                {
                                    'type': 'game_update',
                                    'action': 'build_road',
                                    'player_id': player_id,
                                    'coords': coords,
                                    'game_state': self.serialize_game_state(game_state)
                                }
                            )
                        else:
                            await self.send(text_data=json.dumps({
                                'type': 'error',
                                'message': 'Cannot build road at this location'
                            }))

                    elif action == 'end_turn':
                        # End turn in setup phase
                        # Check if setup phase is complete after this turn
                        if hasattr(game_state, 'check_setup_progress'):
                            print("Checking setup progress before end turn")
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
                                    'player_id': player_id,
                                    'game_state': self.serialize_game_state(game_state)
                                }
                            )

                            print(f"Updated phase after end turn: {updated_phase}")
                            if updated_phase != GamePhase.SETUP and updated_phase != "setup":
                                # Bezpiecznie pobierz wartość fazy
                                phase_value = updated_phase
                                if hasattr(updated_phase, 'value'):
                                    phase_value = updated_phase.value

                                print(f"Phase changed to: {phase_value}")
                                await self.channel_layer.group_send(
                                    self.room_group_name,
                                    {
                                        'type': 'phase_change',
                                        'phase': phase_value,
                                        'game_state': self.serialize_game_state(game_state)
                                    }
                                )
                        else:
                            await self.send(text_data=json.dumps({
                                'type': 'error',
                                'message': 'Failed to end turn'
                            }))

                    else:
                        # Unknown action for setup phase
                        await self.send(text_data=json.dumps({
                            'type': 'error',
                            'message': f'Unknown action in setup phase: {action}'
                        }))

                # Pozostała część metody receive pozostaje bez zmian...

        except Exception as e:
            print(f"Error processing WebSocket message: {str(e)}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': f'Server error: {str(e)}'
            }))

    # Helper methods
    def serialize_game_state(self, game_state):
        try:
            print("Serializing game state")
            # Serializacja planszy
            board_data = game_state.game_board.serialize_board() if hasattr(game_state.game_board,
                                                                            'serialize_board') else {}

            # Jeśli board_data jest puste, spróbuj alternatywnej serializacji
            if not board_data:
                board_data = {
                    'tiles': [],
                    'vertices': {},
                    'edges': {}
                }

                # Serializacja kafelków
                if hasattr(game_state.game_board, 'tiles'):
                    for tile in game_state.game_board.tiles:
                        tile_data = {
                            'coordinates': {'q': tile.coords[0], 'r': tile.coords[1], 's': tile.coords[2]},
                            'resource': str(tile.resource) if hasattr(tile, 'resource') else 'desert',
                            'number': tile.number if hasattr(tile, 'number') else None,
                            'has_robber': tile.has_robber if hasattr(tile, 'has_robber') else False
                        }
                        board_data['tiles'].append(tile_data)

                # Serializacja wierzchołków (vertices) z budynkami
                if hasattr(game_state.game_board, 'vertices'):
                    for vertex_key, vertex in game_state.game_board.vertices.items():
                        coords_list = [list(coord) if isinstance(coord, tuple) else coord for coord in vertex_key]
                        building_data = None

                        if hasattr(vertex, 'building') and vertex.building:
                            building_player = vertex.building.player
                            building_data = {
                                'type': 'CITY' if vertex.building.building_type == BuildingType.CITY else 'SETTLEMENT',
                                'player_id': building_player.id if hasattr(building_player, 'id') else str(
                                    building_player),
                                'player_color': building_player.color.value if hasattr(building_player,
                                                                                       'color') else 'red'
                            }

                        board_data['vertices'][str(vertex_key)] = {
                            'coordinates': coords_list,
                            'building': building_data
                        }

                # Serializacja krawędzi (edges) z drogami
                if hasattr(game_state.game_board, 'edges'):
                    for edge_key, edge in game_state.game_board.edges.items():
                        coords_list = [list(coord) if isinstance(coord, tuple) else coord for coord in edge_key]
                        road_data = None

                        if hasattr(edge, 'road') and edge.road:
                            road_player = edge.road.player
                            road_data = {
                                'player_id': road_player.id if hasattr(road_player, 'id') else str(road_player),
                                'player_color': road_player.color.value if hasattr(road_player, 'color') else 'red'
                            }

                        board_data['edges'][str(edge_key)] = {
                            'coordinates': coords_list,
                            'road': road_data
                        }

            # Serializacja graczy
            players_data = []
            for player in game_state.players:
                player_data = {
                    'id': player.id,
                    'color': player.color.value if hasattr(player.color, 'value') else str(player.color),
                    'resources': player.player_resources.serialize() if hasattr(player.player_resources,
                                                                                'serialize') else (
                        player.player_resources.resources if hasattr(player.player_resources, 'resources') else {}
                    ),
                    'victory_points': player.victory_points if hasattr(player, 'victory_points') else 0,
                    'settlements_left': player.settlements_left if hasattr(player, 'settlements_left') else 5,
                    'cities_left': player.cities_left if hasattr(player, 'cities_left') else 4,
                    'roads_left': player.roads_left if hasattr(player, 'roads_left') else 15
                }
                players_data.append(player_data)
                print(f"Serialized player: {player_data['id']} with color {player_data['color']}")

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
                current_player_index = game_state.current_player_index if hasattr(game_state,
                                                                                  'current_player_index') else 0

            # Określ fazę gry
            if hasattr(game_state, 'phase'):
                if isinstance(game_state.phase, str):
                    phase = game_state.phase
                else:
                    # Zakładając, że to enum z atrybutem value
                    phase = game_state.phase.value if hasattr(game_state.phase, 'value') else str(game_state.phase)
            else:
                phase = "setup"  # Domyślnie faza setup

            # Debugging info
            print(f"Current game phase: {phase}")
            print(f"Current player index: {current_player_index}")
            print(f"Number of players: {len(players_data)}")
            print(f"Board tiles count: {len(board_data.get('tiles', []))}")
            print(f"Board vertices count: {len(board_data.get('vertices', {}))}")
            print(f"Board edges count: {len(board_data.get('edges', {}))}")

            return {
                'board': board_data,
                'players': players_data,
                'current_player_index': current_player_index,
                'phase': phase
            }
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Error serializing game state: {str(e)}")
            # Zwróć minimalny stan gry, aby uniknąć błędów na kliencie
            return {
                'board': {'tiles': [], 'vertices': {}, 'edges': {}},
                'players': [],
                'current_player_index': 0,
                'phase': 'setup'
            }
    @database_sync_to_async
    def process_build_settlement(self, game_state, player_id, coords, is_setup=False):
        # Find player by ID
        player = None
        for p in game_state.players:
            if p.id == player_id:
                player = p
                break

        if not player:
            print(f"Player with ID {player_id} not found")
            return False

        try:
            print(f"Processing build settlement with coords: {coords}")
            # Convert coords to the format expected by the game engine
            vertex_coords = set()

            # Sprawdź format przekazanych koordynatów
            if isinstance(coords, list):
                for coord in coords:
                    # Koordynaty mogą być listą list lub listą krotek
                    if isinstance(coord, list) and len(coord) == 3:
                        vertex_coords.add(tuple(coord))
                    elif isinstance(coord, tuple) and len(coord) == 3:
                        vertex_coords.add(coord)
            elif isinstance(coords, tuple) and len(coords) == 3:
                # Pojedyncza krotka
                vertex_coords.add(coords)
            elif isinstance(coords, dict) and 'type' in coords:
                # Obsługa specjalnego formatu z frontendu
                print(f"Received special format from frontend: {coords}")
                # Tu dodaj odpowiednią obsługę

            print(f"Vertex coordinates after processing: {vertex_coords}")

            if not vertex_coords:
                print("No valid vertex coordinates found")
                return False

            # Obsługa stawiania osady
            result = False

            # Jeśli jesteśmy w fazie setup, użyj specjalnej logiki
            if is_setup or getattr(game_state, 'phase', None) == GamePhase.SETUP or getattr(game_state, 'phase',
                                                                                            None) == "setup":
                print("Building settlement in setup phase")
                if hasattr(game_state, 'place_initial_settlement'):
                    print("Using place_initial_settlement method")
                    result = game_state.place_initial_settlement(player, vertex_coords)
                else:
                    print("Using fallback settlement building method")
                    # Fallback, jeśli metoda place_initial_settlement nie istnieje
                    from game_engine.board.buildings import Building, BuildingType
                    from game_engine.common.resources import Resource

                    # Znajdź wierzchołek w tablicy wierzchołków
                    vertex_key = None
                    for key in game_state.game_board.vertices.keys():
                        if any(coord in key for coord in vertex_coords):
                            vertex_key = key
                            break

                    if not vertex_key:
                        print(f"Could not find a valid vertex for coordinates {vertex_coords}")
                        return False

                    settlement = Building(BuildingType.SETTLEMENT, player)
                    result = game_state.game_board.place_building(settlement, vertex_key, free=True)
                    if result:
                        player.settlements_left -= 1
                        player.victory_points += 1

                        # Aktualizuj licznik w setup_placed
                        if not hasattr(game_state, 'setup_placed'):
                            game_state.setup_placed = {}
                        if player.id not in game_state.setup_placed:
                            game_state.setup_placed[player.id] = [0, 0]
                        game_state.setup_placed[player.id][0] += 1

                        # Sprawdź czy druga osada - przyznaj zasoby
                        if game_state.setup_placed[player.id][0] == 2:
                            adjacent_tiles = game_state.game_board.get_adjacent_tiles(vertex_key)
                            for tile in adjacent_tiles:
                                resource = tile.get_resource()
                                if resource != Resource.DESERT and resource is not None:
                                    player.add_resource(resource, 1)
            else:
                print("Building settlement in normal game phase")
                # Normalna gra - użyj standardowej metody
                if hasattr(game_state, 'turn_manager'):
                    # Znajdź wierzchołek w tablicy wierzchołków
                    vertex_key = None
                    for key in game_state.game_board.vertices.keys():
                        if any(coord in key for coord in vertex_coords):
                            vertex_key = key
                            break

                    if not vertex_key:
                        print(f"Could not find a valid vertex for coordinates {vertex_coords}")
                        return False

                    result = game_state.turn_manager.build_settlement(player, vertex_key)

            # Po każdej akcji w fazie setup sprawdź postęp
            if hasattr(game_state, 'check_setup_progress'):
                print("Checking setup progress after building settlement")
                game_state.check_setup_progress()

            return result
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Error building settlement: {str(e)}")
            return False
    @database_sync_to_async
    def process_dice_roll(self, game_state):
        """Roll dice and distribute resources"""
        # Sprawdź czy jesteśmy w fazie setup
        if not hasattr(game_state, 'phase') or game_state.phase == "setup" or game_state.phase == GamePhase.SETUP:
            raise Exception("Cannot roll dice in the setup phase")

        # Sprawdź czy gra jest prawidłowo zainicjowana
        if not hasattr(game_state, 'turn_manager'):
            # Utwórz turn_manager, jeśli nie istnieje
            if hasattr(game_state, 'players') and hasattr(game_state, 'game_board') and hasattr(game_state,
                                                                                                'game_config'):
                from game_engine.game.turn_manager import TurnManager
                game_state.turn_manager = TurnManager(game_state.game_board, game_state.game_config, game_state.players)
            else:
                raise Exception("Game not properly initialized")

        try:
            # Roll dice
            dice1, dice2 = game_state.turn_manager.roll_dice()
            dice_total = dice1 + dice2

            # Distribute resources based on dice roll
            if dice_total != 7:  # Standardowe przydzielanie zasobów
                if hasattr(game_state, 'distribute_resources'):
                    game_state.distribute_resources(dice_total)
                elif hasattr(game_state.turn_manager, '_distribute_resources'):
                    game_state.turn_manager._distribute_resources(dice_total)
            else:  # Obsługa rabusia (7)
                if hasattr(game_state, 'handle_robber_roll'):
                    game_state.handle_robber_roll()
                elif hasattr(game_state.turn_manager, '_handle_robber'):
                    game_state.turn_manager._handle_robber()

            # Zmień fazę na MAIN po rzucie kośćmi
            game_state.phase = GamePhase.MAIN

            return {
                'dice1': dice1,
                'dice2': dice2,
                'total': dice_total
            }
        except Exception as e:
            print(f"Error rolling dice: {str(e)}")
            raise e

    async def process_end_turn(self, game_state):
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
                print("Jesteśmy w fazie setup - obsługa końca tury w fazie setup")
                # W fazie setup, przechowujemy indeks aktualnego gracza w atrybucie pokoju
                current_room = game_rooms[self.room_id]

                # Upewnij się, że klucz istnieje
                if 'setup_player_index' not in current_room:
                    current_room['setup_player_index'] = 0

                # Sprawdź aktualny indeks gracza
                current_player_index = current_room['setup_player_index']
                print(f"Current player index before update: {current_player_index}")

                # Przejdź do następnego gracza
                current_room['setup_player_index'] = (current_player_index + 1) % len(game_state.players)
                print(f"Updated player index: {current_room['setup_player_index']}")

                # Sprawdź czy po zmianie tury powinniśmy zaktualizować fazę
                if hasattr(game_state, 'check_setup_progress'):
                    print("Checking setup progress after end turn")
                    game_state.check_setup_progress()

                # Sprawdź czy po zmianie gracza zmieniliśmy też fazę
                new_phase = getattr(game_state, 'phase', None)
                print(f"New phase after end turn: {new_phase}")

                if new_phase != GamePhase.SETUP and new_phase != "setup":
                    print(f"Faza gry zmieniła się z SETUP na {new_phase}")
                    # Wyślij powiadomienie o zmianie fazy
                    phase_value = new_phase
                    if hasattr(new_phase, 'value'):
                        phase_value = new_phase.value
                    else:
                        phase_value = str(new_phase)

                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'phase_change',
                            'phase': phase_value,
                            'game_state': self.serialize_game_state(game_state)
                        }
                    )

                return True

            # W innych fazach
            print("Jesteśmy poza fazą setup - standardowa obsługa końca tury")
            # Zapisz poprzednią fazę
            prev_phase = getattr(game_state, 'phase', GamePhase.MAIN)

            # Używaj istniejących metod
            if hasattr(game_state, 'next_turn'):
                print("Using game_state.next_turn method")
                game_state.next_turn()
                result = True
            elif hasattr(game_state, 'turn_manager') and hasattr(game_state.turn_manager, 'next_player'):
                print("Using turn_manager.next_player method")
                game_state.turn_manager.next_player()
                result = True
            else:
                print("No valid method found to end turn")
                result = False

            # Sprawdź czy faza się zmieniła i powiadom klientów
            new_phase = getattr(game_state, 'phase', None)
            print(f"New phase after end turn: {new_phase}")

            if new_phase != prev_phase:
                print(f"Faza gry zmieniła się z {prev_phase} na {new_phase}")
                # Wyślij powiadomienie o zmianie fazy
                phase_value = new_phase
                if hasattr(new_phase, 'value'):
                    phase_value = new_phase.value
                else:
                    phase_value = str(new_phase)

                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'phase_change',
                        'phase': phase_value,
                        'game_state': self.serialize_game_state(game_state)
                    }
                )

            return result
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Błąd podczas kończenia tury: {str(e)}")
            return False
    @database_sync_to_async
    def process_build_road(self, game_state, player_id, coords, is_setup=False):
        """Process road building"""
        player = None
        for p in game_state.players:
            if p.id == player_id:
                player = p
                break

        if not player:
            print(f"Player with ID {player_id} not found")
            return False

        try:
            print(f"Processing build road with coords: {coords}")
            # Convert coords to the format expected by the game engine
            edge_coords = set()

            # Sprawdź format przekazanych koordynatów
            if isinstance(coords, list):
                for coord in coords:
                    # Koordynaty mogą być listą list lub listą krotek
                    if isinstance(coord, list) and len(coord) == 3:
                        edge_coords.add(tuple(coord))
                    elif isinstance(coord, tuple) and len(coord) == 3:
                        edge_coords.add(coord)
            elif isinstance(coords, tuple) and len(coords) == 3:
                # Pojedyncza krotka
                edge_coords.add(coords)
            elif isinstance(coords, dict) and 'type' in coords:
                # Obsługa specjalnego formatu z frontendu
                print(f"Received special format from frontend: {coords}")
                # Tu dodaj odpowiednią obsługę

            print(f"Edge coordinates after processing: {edge_coords}")

            if not edge_coords:
                print("No valid edge coordinates found")
                return False

            # Obsługa stawiania drogi
            result = False

            # Jeśli jesteśmy w fazie setup, użyj specjalnej logiki
            if is_setup or getattr(game_state, 'phase', None) == GamePhase.SETUP or getattr(game_state, 'phase',
                                                                                            None) == "setup":
                print("Building road in setup phase")
                if hasattr(game_state, 'place_initial_road'):
                    print("Using place_initial_road method")
                    result = game_state.place_initial_road(player, edge_coords)
                else:
                    print("Using fallback road building method")
                    # Fallback, jeśli metoda place_initial_road nie istnieje
                    from game_engine.board.buildings import Road

                    # Znajdź krawędź w tablicy krawędzi
                    edge_key = None
                    for key in game_state.game_board.edges.keys():
                        if any(coord in key for coord in edge_coords):
                            edge_key = key
                            break

                    if not edge_key:
                        print(f"Could not find a valid edge for coordinates {edge_coords}")
                        return False

                    road = Road(player)
                    result = game_state.game_board.place_road(road, edge_key, free=True)
                    if result:
                        player.roads_left -= 1

                        # Aktualizuj licznik w setup_placed
                        if not hasattr(game_state, 'setup_placed'):
                            game_state.setup_placed = {}
                        if player.id not in game_state.setup_placed:
                            game_state.setup_placed[player.id] = [0, 0]
                        game_state.setup_placed[player.id][1] += 1
            else:
                print("Building road in normal game phase")
                # Normalna gra - użyj standardowej metody
                if hasattr(game_state, 'turn_manager'):
                    # Znajdź krawędź w tablicy krawędzi
                    edge_key = None
                    for key in game_state.game_board.edges.keys():
                        if any(coord in key for coord in edge_coords):
                            edge_key = key
                            break

                    if not edge_key:
                        print(f"Could not find a valid edge for coordinates {edge_coords}")
                        return False

                    result = game_state.turn_manager.build_road(player, edge_key)

            # Po każdej akcji w fazie setup sprawdź postęp
            if hasattr(game_state, 'check_setup_progress'):
                print("Checking setup progress after building road")
                game_state.check_setup_progress()

            return result
        except Exception as e:
            import traceback
            traceback.print_exc()
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