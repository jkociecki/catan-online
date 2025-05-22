import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from game_engine.game.game_state import GameState
from game_engine.common.game_config import GameConfig
from game_engine.player.player import Player
from game_engine.common.player_color import PlayerColor
import uuid
from game_engine.game.game_phase import GamePhase
from game_engine.board.buildings import Building, BuildingType, Road  # Dodaj ten import
import time
from game_engine.common.resources import Resource  # Dodaj ten import

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
                        # ZAPISZ informacje o kliknięciu dla frontendu
                        tile_id = data.get('tileId')
                        corner_index = data.get('cornerIndex')
                        
                        if tile_id is not None and corner_index is not None:
                            # Zapisz w game_state informacje o ostatnim kliknięciu
                            if not hasattr(game_state, 'last_click_info'):
                                game_state.last_click_info = {}
                            
                            game_state.last_click_info = {
                                'tile_id': tile_id,
                                'corner_index': corner_index,
                                'player_id': player_id
                            }
                            print(f"Saved click info: tile={tile_id}, corner={corner_index}")

                        # Obsługa budowania osady
                        coords = data.get('coords')

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
                        # ZAPISZ informacje o kliknięciu dla frontendu (dla dróg)
                        tile_id = data.get('tileId')
                        edge_index = data.get('edgeIndex')
                        
                        if tile_id is not None and edge_index is not None:
                            # Zapisz w game_state informacje o ostatnim kliknięciu drogi
                            if not hasattr(game_state, 'last_road_click_info'):
                                game_state.last_road_click_info = {}
                            
                            game_state.last_road_click_info = {
                                'tile_id': tile_id,
                                'edge_index': edge_index,
                                'player_id': player_id
                            }
                            print(f"Saved road click info: tile={tile_id}, edge={edge_index}")

                        coords = data.get('coords')

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

        except Exception as e:
            print(f"Error processing WebSocket message: {str(e)}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': f'Server error: {str(e)}'
            }))

    # Helper methods
    def serialize_game_state(self, game_state):
        try:
            print("Serializing game state with new system")
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

                # Serializacja wierzchołków (vertices) z budynkami - POPRAWIONA WERSJA
                if hasattr(game_state.game_board, 'vertices'):
                    vertices_with_buildings = 0
                    for vertex_id, vertex in enumerate(game_state.game_board.vertices):
                        building_data = None

                        if hasattr(vertex, 'building') and vertex.building:
                            vertices_with_buildings += 1
                            building_player = vertex.building.player
                            
                            print(f"=== SERIALIZE VERTEX {vertex_id} ===")
                            print(f"Vertex adjacent_tiles: {vertex.adjacent_tiles}")
                            print(f"Building type: {vertex.building.building_type}")
                            print(f"Building player: {building_player.id}")
                            
                            # SPRAWDŹ: czy mamy frontend_info
                            frontend_info = getattr(vertex.building, 'frontend_info', {})
                            print(f"Frontend info: {frontend_info}")
                            
                            # Konwertuj adjacent_tiles na coordinates dla frontendu
                            coordinates = []
                            for tile_id in vertex.adjacent_tiles:
                                if tile_id < len(game_state.game_board.tiles):
                                    tile = game_state.game_board.tiles[tile_id]
                                    q, r, s = tile.get_coordinates()
                                    coordinates.append([q, r, s])
                                    print(f"  Tile {tile_id}: ({q}, {r}, {s})")
                            
                            building_data = {
                                'type': 'CITY' if vertex.building.building_type == BuildingType.CITY else 'SETTLEMENT',
                                'player_id': building_player.id,
                                'player_color': building_player.color.value if hasattr(building_player, 'color') else 'red',
                                # POPRAWKA: Dodaj tile_id i corner_index
                                'tile_id': frontend_info.get('tile_id'),
                                'corner_index': frontend_info.get('corner_index'),
                                'vertex_id': vertex_id  # DODAJ to dla debugowania
                            }
                            
                            print(f"Building data being sent: {building_data}")
                            print("==========================")
                        else:
                            # Dla wierzchołków bez budynków, nadal generuj coordinates
                            coordinates = []
                            for tile_id in vertex.adjacent_tiles:
                                if tile_id < len(game_state.game_board.tiles):
                                    tile = game_state.game_board.tiles[tile_id]
                                    q, r, s = tile.get_coordinates()
                                    coordinates.append([q, r, s])

                        board_data['vertices'][f"vertex_{vertex_id}"] = {
                            'coordinates': coordinates,
                            'building': building_data
                        }
                    
                print(f"TOTAL vertices with buildings: {vertices_with_buildings}")

            # PODOBNIE dla edges (krawędzi):
            if hasattr(game_state.game_board, 'edges'):
                edges_with_roads = 0
                for edge_id, edge in enumerate(game_state.game_board.edges):
                    road_data = None

                    if hasattr(edge, 'road') and edge.road:
                        edges_with_roads += 1
                        road_player = edge.road.player
                        
                        print(f"=== SERIALIZE EDGE {edge_id} ===")
                        print(f"Edge adjacent_tiles: {edge.adjacent_tiles}")
                        print(f"Road player: {road_player.id}")
                        
                        # SPRAWDŹ: czy mamy frontend_info
                        frontend_info = getattr(edge.road, 'frontend_info', {})
                        print(f"Road frontend info: {frontend_info}")
                        
                        # Konwertuj adjacent_tiles na coordinates dla frontendu
                        coordinates = []
                        for tile_id in edge.adjacent_tiles:
                            if tile_id < len(game_state.game_board.tiles):
                                tile = game_state.game_board.tiles[tile_id]
                                q, r, s = tile.get_coordinates()
                                coordinates.append([q, r, s])
                                print(f"  Tile {tile_id}: ({q}, {r}, {s})")
                        
                        road_data = {
                            'player_id': road_player.id,
                            'player_color': road_player.color.value if hasattr(road_player, 'color') else 'red',
                            # POPRAWKA: Dodaj tile_id i edge_index
                            'tile_id': frontend_info.get('tile_id'),
                            'edge_index': frontend_info.get('edge_index'),
                            'edge_id': edge_id  # DODAJ to dla debugowania
                        }
                        
                        print(f"Road data being sent: {road_data}")
                        print("==========================")
                    else:
                        # Dla krawędzi bez dróg, nadal generuj coordinates
                        coordinates = []
                        for tile_id in edge.adjacent_tiles:
                            if tile_id < len(game_state.game_board.edges):
                                tile = game_state.game_board.tiles[tile_id]
                                q, r, s = tile.get_coordinates()
                                coordinates.append([q, r, s])

                    board_data['edges'][f"edge_{edge_id}"] = {
                        'coordinates': coordinates,
                        'road': road_data
                    }
                
                print(f"TOTAL edges with roads: {edges_with_roads}")

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

            print(f"Serialized game state: {len(board_data.get('tiles', []))} tiles, {len(players_data)} players")

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
        # Find player
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

            # NOWY SYSTEM: Użyj tileId + cornerIndex zamiast coords
            if hasattr(game_state, 'last_click_info'):
                tile_id = game_state.last_click_info.get('tile_id')
                corner_index = game_state.last_click_info.get('corner_index')
                
                if tile_id is not None and corner_index is not None:
                    print(f"Using new system: tile_id={tile_id}, corner_index={corner_index}")
                    
                    # Konwertuj tile_id string na współrzędne
                    tile_coords = tuple(map(int, tile_id.split(',')))
                    
                    # Użyj nowej metody z game_state
                    result = game_state.place_settlement_by_tile_coords(
                        player, tile_coords, corner_index, is_setup=is_setup
                    )
                    
                    return result

            # FALLBACK: Stary system (dla kompatybilności)
            print("Falling back to old coordinate system")
            
            # Convert coordinates to a format that the backend understands
            if isinstance(coords, list) and len(coords) > 0:
                first_coord = coords[0]
                if isinstance(first_coord, list) and len(first_coord) == 3:
                    tile_coords = tuple(first_coord)
                    
                    # Użyj corner_index = 0 jako domyślny
                    result = game_state.place_settlement_by_tile_coords(
                        player, tile_coords, 0, is_setup=is_setup
                    )
                    
                    return result

            print("No valid coordinates found")
            return False

        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Error building settlement: {str(e)}")
            return False

    @database_sync_to_async
    def process_build_road(self, game_state, player_id, coords, is_setup=False):
        # Find player
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

            # NOWY SYSTEM: Użyj tileId + edgeIndex zamiast coords
            if hasattr(game_state, 'last_road_click_info'):
                tile_id = game_state.last_road_click_info.get('tile_id')
                edge_index = game_state.last_road_click_info.get('edge_index')
                
                if tile_id is not None and edge_index is not None:
                    print(f"Using new system: tile_id={tile_id}, edge_index={edge_index}")
                    
                    # Konwertuj tile_id string na współrzędne
                    tile_coords = tuple(map(int, tile_id.split(',')))
                    
                    # Użyj nowej metody z game_state
                    result = game_state.place_road_by_tile_coords(
                        player, tile_coords, edge_index, is_setup=is_setup
                    )
                    
                    return result

            # FALLBACK: Stary system (dla kompatybilności)
            print("Falling back to old coordinate system")
            
            # Convert coordinates to a format that the backend understands
            if isinstance(coords, list) and len(coords) > 0:
                first_coord = coords[0]
                if isinstance(first_coord, list) and len(first_coord) == 3:
                    tile_coords = tuple(first_coord)
                    
                    # Użyj edge_index = 0 jako domyślny
                    result = game_state.place_road_by_tile_coords(
                        player, tile_coords, 0, is_setup=is_setup
                    )
                    
                    return result

            print("No valid coordinates found")
            return False

        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Error building road: {str(e)}")
            return False
    async def process_end_turn(self, game_state):
        """Zakończ turę aktualnego gracza"""
        try:
            print("Processing end turn")

            # Sprawdź, czy jesteśmy w fazie setup
            is_setup_phase = False
            if hasattr(game_state, 'phase'):
                if isinstance(game_state.phase, str):
                    is_setup_phase = game_state.phase.lower() == "setup"
                else:
                    is_setup_phase = game_state.phase == GamePhase.SETUP

            if is_setup_phase:
                print("Setup phase - handling setup end turn")
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
        # Niestandardowy enkoder JSON dla typów, które nie są domyślnie serializowalne
        class CustomJSONEncoder(json.JSONEncoder):
            def default(self, obj):
                # Obsługa enumów (jak PlayerColor)
                if hasattr(obj, 'value'):
                    return obj.value
                # Obsługa innych niestandardowych typów
                try:
                    return super().default(obj)
                except:
                    return str(obj)  # Ostatecznie konwertuj wszystko na string
        
        await self.send(text_data=json.dumps({
            'type': 'game_update',
            'action': event['action'],
            'player_id': event['player_id'],
            'coords': event.get('coords'),
            'game_state': event['game_state']
        }, cls=CustomJSONEncoder))

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