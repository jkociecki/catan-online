# backend/game_engine/board/game_board.py
import random
from typing import List, Dict, Optional, Tuple

from game_engine.board.buildings import Building, BuildingType, Road
from game_engine.board.game_tile import Tile
from game_engine.board.tile_factory import TileFactory
from game_engine.common.resources import Resource
from game_engine.common.game_config import GameConfig
from game_engine.board.vertex import Vertex, Edge, BoardGeometry
from game_engine.player.player import Player


class GameBoard:
    """Plansza gry Catan z nowym systemem indeksów"""

    def __init__(self, config: GameConfig, board_radius: int = 2):
        self.config: GameConfig = config
        self.board_radius = board_radius
        
        # Tablice zamiast słowników
        self.tiles: List[Tile] = []
        self.vertices: List[Vertex] = []
        self.edges: List[Edge] = []
        
        # Mapowania dla łatwiejszego dostępu
        self.tile_to_vertices: Dict[int, List[int]] = {}  # tile_id -> [vertex_ids]
        self.tile_to_edges: Dict[int, List[int]] = {}     # tile_id -> [edge_ids]
        
        # Wygeneruj planszę
        self._generate_board()

    def _generate_board(self):
        """Wygeneruj całą planszę - kafelki, wierzchołki i krawędzie"""
        
        # 1. Wygeneruj geometrię planszy
        self.vertices, self.edges, self.tile_to_vertices, self.tile_to_edges = \
            BoardGeometry.generate_vertices_and_edges(self.board_radius)
        
        # 2. Wygeneruj kafelki z zasobami
        self._generate_tiles()
        
        print(f"Generated board: {len(self.tiles)} tiles, {len(self.vertices)} vertices, {len(self.edges)} edges")

    def _generate_tiles(self):
        """Wygeneruj kafelki z losowymi zasobami i numerami"""
        
        # Przygotuj zasoby do rozłożenia
        tiles_to_place = {
            Resource.WOOD: self.config.wood_tiles,
            Resource.BRICK: self.config.brick_tiles,
            Resource.DESERT: self.config.desert_tiles,
            Resource.SHEEP: self.config.sheep_tiles,
            Resource.ORE: self.config.ore_tiles,
            Resource.WHEAT: self.config.wheat_tiles
        }

        # Stwórz listę kafelków
        tile_resources = []
        for resource, count in tiles_to_place.items():
            for _ in range(count):
                tile_resources.append(resource)

        # Wymieszaj zasoby
        random.shuffle(tile_resources)

        # Przygotuj numery kości
        available_numbers = self.config.tiles_numbers.copy()
        random.shuffle(available_numbers)

        # Wygeneruj kafelki na pozycjach heksagonalnych
        tile_id = 0
        for q in range(-self.board_radius, self.board_radius + 1):
            for r in range(-self.board_radius, self.board_radius + 1):
                s = -q - r
                if abs(s) <= self.board_radius:
                    
                    # Wybierz zasób
                    resource = tile_resources[tile_id] if tile_id < len(tile_resources) else Resource.DESERT
                    
                    # Wybierz numer (pustynia nie ma numeru)
                    if resource == Resource.DESERT:
                        tile_number = None
                    else:
                        tile_number = available_numbers.pop() if available_numbers else None

                    # Stwórz kafelek
                    tile = TileFactory.create_tile(resource, number=tile_number)
                    tile.set_coordinates(q, r, s)
                    
                    self.tiles.append(tile)
                    tile_id += 1
                # W _generate_tiles(), po pętli generowania
        print("=== GENERATED TILES ===")
        for tile_id, tile in enumerate(self.tiles):
            q, r, s = tile.get_coordinates()
            print(f"Tile {tile_id}: ({q}, {r}, {s}) - {tile.get_resource()}")
        print("=======================")

    # ========== NOWE METODY Z PROSTYMI INDEKSAMI ==========

    def place_settlement(self, vertex_id: int, player: Player, is_setup: bool = False) -> bool:
        """Postaw osadę na wierzchołku o danym ID"""
        
        # Sprawdź czy wierzchołek istnieje
        if vertex_id >= len(self.vertices):
            print(f"Vertex {vertex_id} does not exist")
            return False
        
        # Sprawdź czy można tam budować
        if not BoardGeometry.can_place_settlement_here(vertex_id, self.vertices, self.edges, player, is_setup):
            print(f"Cannot place settlement at vertex {vertex_id}")
            return False
        
        # Stwórz i postaw osadę
        settlement = Building(BuildingType.SETTLEMENT, player)
        self.vertices[vertex_id].building = settlement
        
        print(f"Placed settlement for player {player.id} at vertex {vertex_id}")
        return True

    def place_city(self, vertex_id: int, player: Player) -> bool:
        """Ulepsz osadę do miasta na wierzchołku o danym ID"""
        
        # Sprawdź czy wierzchołek istnieje
        if vertex_id >= len(self.vertices):
            return False
        
        vertex = self.vertices[vertex_id]
        
        # Sprawdź czy tam jest osada tego gracza
        if (not vertex.has_building() or 
            vertex.building.player != player or 
            vertex.building.building_type != BuildingType.SETTLEMENT):
            print(f"Cannot upgrade to city at vertex {vertex_id} - no settlement found")
            return False
        
        # Ulepsz do miasta
        city = Building(BuildingType.CITY, player)
        vertex.building = city
        
        print(f"Upgraded settlement to city for player {player.id} at vertex {vertex_id}")
        return True

    def place_road(self, edge_id: int, player: Player, is_setup: bool = False) -> bool:
        """Postaw drogę na krawędzi o danym ID"""
        
        # Sprawdź czy krawędź istnieje
        if edge_id >= len(self.edges):
            print(f"Edge {edge_id} does not exist")
            return False
        
        # Sprawdź czy można tam budować
        if not BoardGeometry.can_place_road_here(edge_id, self.vertices, self.edges, player, is_setup):
            print(f"Cannot place road at edge {edge_id}")
            return False
        
        # Stwórz i postaw drogę
        road = Road(player)
        self.edges[edge_id].road = road
        
        print(f"Placed road for player {player.id} at edge {edge_id}")
        return True

    # ========== METODY POMOCNICZE ==========

    def get_tile_by_id(self, tile_id: int) -> Optional[Tile]:
        """Pobierz kafelek po ID"""
        if 0 <= tile_id < len(self.tiles):
            return self.tiles[tile_id]
        return None

    def get_tile_by_coords(self, coords: Tuple[int, int, int]) -> Optional[Tuple[int, Tile]]:
        """Pobierz kafelek i jego ID po współrzędnych"""
        for tile_id, tile in enumerate(self.tiles):
            if tile.get_coordinates() == coords:
                return tile_id, tile
        return None

    def get_vertices_for_tile(self, tile_id: int) -> List[int]:
        """Pobierz IDs wierzchołków dla danego kafelka"""
        return self.tile_to_vertices.get(tile_id, [])

    def get_edges_for_tile(self, tile_id: int) -> List[int]:
        """Pobierz IDs krawędzi dla danego kafelka"""
        return self.tile_to_edges.get(tile_id, [])

    def get_adjacent_tiles_for_vertex(self, vertex_id: int) -> List[int]:
        """Pobierz IDs kafelków przylegających do wierzchołka"""
        if vertex_id < len(self.vertices):
            return self.vertices[vertex_id].adjacent_tiles
        return []

    # ========== KONWERSJA Z FRONTENDU ==========

    def find_vertex_by_tile_and_corner(self, tile_id: int, corner_index: int) -> Optional[int]:
        """
        Znajdź ID wierzchołka na podstawie ID kafelka i indeksu narożnika (0-5)
        Corner index: 0=N, 1=NE, 2=SE, 3=S, 4=SW, 5=NW
        """
        if tile_id >= len(self.tiles) or tile_id < 0:
            print(f"Invalid tile_id: {tile_id} (max: {len(self.tiles)-1})")
            return None
        
        vertex_ids = self.get_vertices_for_tile(tile_id)
        if corner_index < 0 or corner_index >= len(vertex_ids):
            print(f"Invalid corner_index: {corner_index} for tile {tile_id} (max: {len(vertex_ids)-1})")
            return None
        
        vertex_id = vertex_ids[corner_index]
        print(f"Mapped tile {tile_id}, corner {corner_index} -> vertex {vertex_id}")
        return vertex_id
    
    def get_tile_id_by_coords(self, coords: Tuple[int, int, int]) -> Optional[int]:
        """Znajdź tile_id na podstawie współrzędnych heksagonalnych"""
        for tile_id, tile in enumerate(self.tiles):
            if tile.get_coordinates() == coords:
                print(f"Found tile_id {tile_id} for coords {coords}")
                return tile_id
        print(f"No tile found for coords {coords}")
        return None

    def find_edge_by_tile_and_edge(self, tile_id: int, edge_index: int) -> Optional[int]:
        """
        Znajdź ID krawędzi na podstawie ID kafelka i indeksu krawędzi (0-5)  
        Edge index: 0=NE, 1=E, 2=SE, 3=SW, 4=W, 5=NW
        """
        if tile_id >= len(self.tiles) or tile_id < 0:
            print(f"Invalid tile_id: {tile_id} (max: {len(self.tiles)-1})")
            return None
        
        edge_ids = self.get_edges_for_tile(tile_id)
        if edge_index < 0 or edge_index >= len(edge_ids):
            print(f"Invalid edge_index: {edge_index} for tile {tile_id} (max: {len(edge_ids)-1})")
            return None
        
        edge_id = edge_ids[edge_index]
        print(f"Mapped tile {tile_id}, edge {edge_index} -> edge {edge_id}")
        return edge_id

    # ========== STARA KOMPATYBILNOŚĆ (do usunięcia później) ==========
    
    def find_vertex_key(self, coords_list: list) -> Optional[int]:
        """Stara metoda - zwraca pierwszy pasujący vertex_id"""
        # Tymczasowa implementacja dla kompatybilności
        if coords_list and len(coords_list) > 0:
            tile_coords = coords_list[0]
            if isinstance(tile_coords, (list, tuple)) and len(tile_coords) == 3:
                result = self.get_tile_by_coords(tuple(tile_coords))
                if result:
                    tile_id, _ = result
                    vertex_ids = self.get_vertices_for_tile(tile_id)
                    return vertex_ids[0] if vertex_ids else None
        return None

    def find_edge_key(self, coords_list: list) -> Optional[int]:
        """Stara metoda - zwraca pierwszy pasujący edge_id"""
        # Tymczasowa implementacja dla kompatybilności
        if coords_list and len(coords_list) > 0:
            tile_coords = coords_list[0]
            if isinstance(tile_coords, (list, tuple)) and len(tile_coords) == 3:
                result = self.get_tile_by_coords(tuple(tile_coords))
                if result:
                    tile_id, _ = result
                    edge_ids = self.get_edges_for_tile(tile_id)
                    return edge_ids[0] if edge_ids else None
        return None

    # ========== SERIALIZACJA ==========

    def serialize_board(self) -> Dict:
        """Serializuj planszę do JSON w formacie kompatybilnym z frontendem"""
        
        # Serializuj kafelki
        tiles_data = []
        for tile_id, tile in enumerate(self.tiles):
            q, r, s = tile.get_coordinates()
            tile_data = {
                "id": tile_id,
                "coordinates": {"q": q, "r": r, "s": s},
                "resource": str(tile.get_resource()),
                "number": tile.number if hasattr(tile, 'number') else None,
                "has_robber": getattr(tile, 'is_robber_placed', False)
            }
            tiles_data.append(tile_data)

        # ========== KOMPATYBILNY FORMAT DLA FRONTENDU ==========
        
        # Serializuj wierzchołki w starym formacie (coordinates zamiast adjacent_tiles)
        vertices_data = {}
        for vertex_id, vertex in enumerate(self.vertices):
            building_data = None
            if vertex.has_building():
                building = vertex.building
                building_data = {
                    "type": building.building_type.name,
                    "player_id": getattr(building.player, 'id', 'unknown'),
                    "player_color": getattr(building.player.color, 'value', 'red') if hasattr(building.player, 'color') else 'red'
                }

            # Konwertuj adjacent_tiles na coordinates (stary format)
            coordinates = []
            for tile_id in vertex.adjacent_tiles:
                if tile_id < len(self.tiles):
                    tile = self.tiles[tile_id]
                    q, r, s = tile.get_coordinates()
                    coordinates.append([q, r, s])

            vertices_data[f"vertex_{vertex_id}"] = {
                "coordinates": coordinates,  # Frontend oczekuje tego pola
                "building": building_data
            }

            if vertex.has_building():
                print(f"SERIALIZE: Vertex {vertex_id} with building:")
                print(f"  Adjacent tiles: {vertex.adjacent_tiles}")
                print(f"  Coordinates sent to frontend: {coordinates}")

        # Serializuj krawędzie w starym formacie  
        edges_data = {}
        for edge_id, edge in enumerate(self.edges):
            road_data = None
            if edge.has_road():
                road = edge.road
                road_data = {
                    "player_id": getattr(road.player, 'id', 'unknown'),
                    "player_color": getattr(road.player.color, 'value', 'red') if hasattr(road.player, 'color') else 'red'
                }

            # Konwertuj adjacent_tiles na coordinates (stary format)
            coordinates = []
            for tile_id in edge.adjacent_tiles:
                if tile_id < len(self.tiles):
                    tile = self.tiles[tile_id]
                    q, r, s = tile.get_coordinates()
                    coordinates.append([q, r, s])

            edges_data[f"edge_{edge_id}"] = {
                "coordinates": coordinates,  # Frontend oczekuje tego pola
                "road": road_data
            }

        return {
            "tiles": tiles_data,
            "vertices": vertices_data,
            "edges": edges_data
        }