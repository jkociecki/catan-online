import uuid

from django.http import JsonResponse
from game_engine.board.game_board import GameBoard
from game_engine.common.game_config import GameConfig
from game_engine.board.temp_helpers import print_board
from game_engine.player.player import Player
from game_engine.common.player_color import PlayerColor
from game_engine.common.resources import Resource
from game_engine.board.buildings import Building, BuildingType, Road
from django.views.decorators.csrf import csrf_exempt
import json


###
from .models import Vertex, Edge, BoardState  # ← DODAJ TO
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .models import Vertex, Edge, BoardState
import json

# Global game state
current_player = None
game_board = None

def get_random_board(request):
    global game_board
    config = GameConfig()
    game_board = GameBoard(config)
    print("\n=== GENEROWANIE NOWEJ PLANSZY ===")
    print_board(game_board)
    print("\n=== SZCZEGÓŁY PLANSZY ===")
    for tile in game_board.tiles:
        resource = tile.__class__.__name__.replace('Tile', '')
        number = tile.number if tile.number is not None else "PUSTYNIA"
        coords = tile.get_coordinates()
        print(f"Pole {coords}: {resource} (kość: {number})")
    print("===============================\n")
    board_data = game_board.serialize_board()
    return JsonResponse(board_data)

def create_player_with_resources(request):
    global current_player
    config = GameConfig()
    
    # Only create a new player if one doesn't exist
    if not current_player:
        current_player = Player(PlayerColor.RED, config)  # Creating a player with RED color
        
        # Add 4 of each resource only when creating a new player
        for resource in [Resource.WHEAT, Resource.BRICK, Resource.ORE, Resource.SHEEP, Resource.WOOD]:
            current_player.add_resource(resource, 4)
    
    # Get player's resources
    resources = current_player.player_resources.resources
    
    # Print resources to console
    print("\n=== ZASOBY GRACZA ===")
    print(f"Kolor gracza: {current_player.color.value}")
    for resource, amount in resources.items():
        print(f"{resource.name}: {amount}")
    print("=====================\n")
    
    # Convert resources to a more frontend-friendly format
    resources_data = {
        resource.name: amount for resource, amount in resources.items()
    }
    
    return JsonResponse({
        "player": {
            "color": current_player.color.value,
            "resources": resources_data
        }
    })

@csrf_exempt
def build_road(request):
    global current_player, game_board
    if request.method == 'POST':
        try:
            if not current_player or not game_board:
                return JsonResponse({"status": "error", "message": "Game not initialized"}, status=400)

            data = json.loads(request.body)
            tile_coords_str = data.get('tileCoords')
            edge_index = data.get('edgeIndex')
            
            # Parse tile coordinates from string to tuple
            try:
                tile_coords = tuple(map(int, tile_coords_str.split(',')))
            except (ValueError, AttributeError):
                return JsonResponse({"status": "error", "message": "Invalid tile coordinates format"}, status=400)
            
            print(f"\n=== BUDOWANIE DROGI ===")
            print(f"Pole: {tile_coords}")
            print(f"Indeks krawędzi: {edge_index}")
            
            # Get the tile
            tile = game_board.get_tile_by_coords(tile_coords)
            if not tile:
                return JsonResponse({"status": "error", "message": "Invalid tile coordinates"}, status=400)
            
            # Get the edge coordinates based on the tile and edge index
            q, r, s = tile_coords
            edge_directions = [
                [(0, 0, 0), (1, -1, 0)],  # NE
                [(0, 0, 0), (1, 0, -1)],  # E
                [(0, 0, 0), (0, 1, -1)],  # SE
                [(0, 0, 0), (-1, 1, 0)],  # SW
                [(0, 0, 0), (-1, 0, 1)],  # W
                [(0, 0, 0), (0, -1, 1)],  # NW
            ]
            
            # Get the edge coordinates for the selected edge
            edge_coords = set()
            for dq, dr, ds in edge_directions[edge_index]:
                edge_coords.add((q + dq, r + dr, s + ds))
            
            # Find the edge in the game board
            edge_key = game_board.find_edge_key(list(edge_coords))
            if not edge_key:
                return JsonResponse({"status": "error", "message": "Invalid edge"}, status=400)
            
            edge = game_board.edges[edge_key]
            if edge.road is not None:
                return JsonResponse({"status": "error", "message": "Edge already has a road"}, status=400)
            
            # Check if player can afford a road
            if not current_player.can_afford_road():
                return JsonResponse({"status": "error", "message": "Not enough resources to build a road"}, status=400)
            
            # Create and place the road
            road = Road(current_player)
            if not game_board.place_road(road, edge_coords):
                return JsonResponse({"status": "error", "message": "Failed to place road"}, status=400)
            
            # Pay for the road
            current_player.pay_for_road()
            
            # Get updated resources
            resources = current_player.player_resources.resources
            resources_data = {
                resource.name: amount for resource, amount in resources.items()
            }
            
            print(f"Gracz {current_player.color.value} zbudował drogę")
            print("Zasoby po budowie:")
            for resource, amount in resources.items():
                print(f"{resource.name}: {amount}")
            print("=====================\n")
            
            return JsonResponse({
                "status": "success", 
                "message": "Road built successfully",
                "player": {
                    "color": current_player.color.value,
                    "resources": resources_data
                }
            })
        except Exception as e:
            print(f"Error building road: {str(e)}")
            return JsonResponse({"status": "error", "message": str(e)}, status=400)
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

@csrf_exempt
def build_settlement(request):
    global current_player, game_board
    if request.method == 'POST':
        try:
            if not current_player or not game_board:
                return JsonResponse({"status": "error", "message": "Game not initialized"}, status=400)

            data = json.loads(request.body)
            tile_coords_str = data.get('tileCoords')
            corner_index = data.get('cornerIndex')
            
            # Parse tile coordinates from string to tuple
            try:
                tile_coords = tuple(map(int, tile_coords_str.split(',')))
            except (ValueError, AttributeError):
                return JsonResponse({"status": "error", "message": "Invalid tile coordinates format"}, status=400)
            
            print(f"\n=== BUDOWANIE OSADY ===")
            print(f"Pole: {tile_coords}")
            print(f"Indeks narożnika: {corner_index}")
            
            # Get the tile
            tile = game_board.get_tile_by_coords(tile_coords)
            if not tile:
                return JsonResponse({"status": "error", "message": "Invalid tile coordinates"}, status=400)
            
            # Get the vertex coordinates based on the tile and corner index
            q, r, s = tile_coords
            vertex_directions = [
                [(0, 0, 0), (1, -1, 0), (1, 0, -1)],  # NE
                [(0, 0, 0), (1, 0, -1), (0, 1, -1)],  # SE
                [(0, 0, 0), (0, 1, -1), (-1, 1, 0)],  # SW
                [(0, 0, 0), (-1, 1, 0), (-1, 0, 1)],  # NW
                [(0, 0, 0), (-1, 0, 1), (0, -1, 1)],  # W
                [(0, 0, 0), (0, -1, 1), (1, -1, 0)],  # N
            ]
            
            # Get the vertex coordinates for the selected corner
            vertex_coords = set()
            for dq, dr, ds in vertex_directions[corner_index]:
                vertex_coords.add((q + dq, r + dr, s + ds))
            
            # Find the vertex in the game board
            vertex_key = game_board.find_vertex_key(list(vertex_coords))
            if not vertex_key:
                return JsonResponse({"status": "error", "message": "Invalid vertex"}, status=400)
            
            vertex = game_board.vertices[vertex_key]
            if vertex.building is not None:
                return JsonResponse({"status": "error", "message": "Vertex already has a building"}, status=400)
            
            # Check if player can afford a settlement
            if not current_player.can_afford_building(BuildingType.SETTLEMENT):
                return JsonResponse({"status": "error", "message": "Not enough resources to build a settlement"}, status=400)
            
            # Create and place the settlement
            settlement = Building(BuildingType.SETTLEMENT, current_player)
            if not game_board.place_building(settlement, vertex_coords):
                return JsonResponse({"status": "error", "message": "Failed to place settlement"}, status=400)
            
            # Pay for the settlement
            current_player.pay_for_building(BuildingType.SETTLEMENT)
            
            # Get updated resources
            resources = current_player.player_resources.resources
            resources_data = {
                resource.name: amount for resource, amount in resources.items()
            }
            
            print(f"Gracz {current_player.color.value} zbudował osadę")
            print("Zasoby po budowie:")
            for resource, amount in resources.items():
                print(f"{resource.name}: {amount}")
            print("=====================\n")
            
            return JsonResponse({
                "status": "success", 
                "message": "Settlement built successfully",
                "player": {
                    "color": current_player.color.value,
                    "resources": resources_data
                }
            })
        except Exception as e:
            print(f"Error building settlement: {str(e)}")
            return JsonResponse({"status": "error", "message": str(e)}, status=400)
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

def create_game_room(request):
    room_id = str(uuid.uuid4())[:8]  # Generate a short unique ID
    return JsonResponse({'room_id': room_id})



############
# Dodaj to do backend/game_api/views.py (na koniec pliku)



@csrf_exempt
@require_http_methods(["POST"])
def place_settlement(request, vertex_id):
    """Postaw domek na wierzchołku"""
    try:
        vertex_id = int(vertex_id)
        
        # Sprawdź czy wierzchołek już istnieje
        vertex, created = Vertex.objects.get_or_create(
            vertex_id=vertex_id,
            defaults={'has_settlement': False}
        )
        
        if vertex.has_settlement:
            return JsonResponse({
                'status': 'error',
                'message': f'Settlement already exists at vertex {vertex_id}'
            }, status=400)
        
        # Postaw domek
        vertex.has_settlement = True
        vertex.player_color = 'green'  # Domyślny kolor, można zmienić
        vertex.save()
        
        return JsonResponse({
            'status': 'success',
            'message': f'Settlement placed at vertex {vertex_id}',
            'vertex_id': vertex_id,
            'player_color': vertex.player_color
        })
        
    except ValueError:
        return JsonResponse({
            'status': 'error',
            'message': 'Invalid vertex_id'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def place_road(request, edge_id):
    """Postaw drogę na krawędzi"""
    try:
        edge_id = int(edge_id)
        
        # Sprawdź czy krawędź już istnieje
        edge, created = Edge.objects.get_or_create(
            edge_id=edge_id,
            defaults={'has_road': False}
        )
        
        if edge.has_road:
            return JsonResponse({
                'status': 'error',
                'message': f'Road already exists at edge {edge_id}'
            }, status=400)
        
        # Postaw drogę
        edge.has_road = True
        edge.player_color = 'blue'  # Domyślny kolor, można zmienić
        edge.save()
        
        return JsonResponse({
            'status': 'success',
            'message': f'Road placed at edge {edge_id}',
            'edge_id': edge_id,
            'player_color': edge.player_color
        })
        
    except ValueError:
        return JsonResponse({
            'status': 'error',
            'message': 'Invalid edge_id'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_board_state(request):
    """Pobierz aktualny stan planszy"""
    try:
        # Pobierz wszystkie osady
        settlements = {}
        for vertex in Vertex.objects.filter(has_settlement=True):
            settlements[vertex.vertex_id] = {
                'player_color': vertex.player_color,
                'created_at': vertex.created_at.isoformat()
            }
        
        # Pobierz wszystkie drogi
        roads = {}
        for edge in Edge.objects.filter(has_road=True):
            roads[edge.edge_id] = {
                'player_color': edge.player_color,
                'created_at': edge.created_at.isoformat()
            }
        
        # Statystyki
        board_state, created = BoardState.objects.get_or_create(
            name="Main Board"
        )
        stats = board_state.get_stats()
        
        return JsonResponse({
            'status': 'success',
            'settlements': settlements,
            'roads': roads,
            'stats': stats,
            'board_updated_at': board_state.updated_at.isoformat()
        })
        
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["DELETE"])
def clear_board(request):
    """Wyczyść całą planszę"""
    try:
        vertices_deleted = Vertex.objects.all().delete()[0]
        edges_deleted = Edge.objects.all().delete()[0]
        
        return JsonResponse({
            'status': 'success',
            'message': f'Board cleared: {vertices_deleted} vertices, {edges_deleted} edges deleted'
        })
        
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)