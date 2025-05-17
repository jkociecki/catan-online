import random
from typing import List

from xlwings.constants import directions

from game_engine.board.buildings import Building, BuildingType, Road
from game_engine.board.game_tile import Tile
from game_engine.board.tile_factory import TileFactory
from game_engine.common.resources import Resource
from game_engine.common.game_config import GameConfig
from game_engine.board.vertex import Vertex, Edge
from game_engine.player.player import Player


class GameBoard:

    def __init__(self, config):

        self.config: GameConfig = config
        self.tiles: List[Tile] = []
        self.tiles_coords: List[tuple[int, int, int]] = []

        #to sa osady/miasta klucz to sa wspolrzedne tego punktu to widac na tym zdjecu lepiej
        # a w klasie Vertex jest info czy cos tam juz jest postawione i kto postawil
        self.vertices: dict[frozenset[tuple[int, int, int]], Vertex] = {}
        #tutaj podobnie ale to sa drogi po prostu
        self.edges: dict[frozenset[tuple[int, int, int]], Edge] = {}


        self._generate_board()
        self._generate_edges()
        self._generate_vertices()


    def _generate_board(self):

        tiles_to_be_places = {
            Resource.WOOD: self.config.wood_tiles,
            Resource.BRICK: self.config.brick_tiles,
            Resource.DESERT: self.config.desert_tiles,
            Resource.SHEEP: self.config.sheep_tiles,
            Resource.ORE: self.config.ore_tiles,
            Resource.WHEAT: self.config.wheat_tiles
        }

        tiles: List[Tile] = []
        available_numbers: List[int] = self.config.tiles_numbers.copy()

        for resource, count in tiles_to_be_places.items():
            for _ in range(count):

                if resource == Resource.DESERT:
                    tile_number = None
                else:
                    tile_number = random.choice(available_numbers)

                if tile_number:
                    available_numbers.remove(tile_number)

                tile: Tile = TileFactory.create_tile(resource, number=tile_number)
                tiles.append(tile)

        random.shuffle(tiles)


        index = 0
        for q in range(-2, 3):
            for r in range(-2, 3):
                s = -q - r
                if -2 <= s <= 2:
                    tile = tiles[index]
                    tile.set_coordinates(q,r,s)
                    self.tiles.append(tile)
                    tile_cords: tuple[int, int, int] = (q, r, s)
                    self.tiles_coords.append(tile_cords)
                    index += 1


    def _generate_vertices(self):
        vertex_directions = [
            [(0, 0, 0), (1, -1, 0), (1, 0, -1)],
            [(0, 0, 0), (1, 0, -1), (0, 1, -1)],
            [(0, 0, 0), (0, 1, -1), (-1, 1, 0)],
            [(0, 0, 0), (-1, 1, 0), (-1, 0, 1)],
            [(0, 0, 0), (-1, 0, 1), (0, -1, 1)],
            [(0, 0, 0), (0, -1, 1), (1, -1, 0)],
        ]

        for tile in self.tiles:
            q, r, s = tile.get_coordinates()

            for offset_group in vertex_directions:
                coords = set()
                for dq, dr, ds in offset_group:
                    coords.add((q + dq, r + dr, s + ds))
                key = frozenset(coords)

                if key not in self.vertices:
                    self.vertices[key] = Vertex(tiles=coords)



    def _generate_edges(self):
        edge_directions = [
            [(0, 0, 0), (1, -1, 0)],
            [(0, 0, 0), (1, 0, -1)],
            [(0, 0, 0), (0, 1, -1)],
            [(0, 0, 0), (-1, 1, 0)],
            [(0, 0, 0), (-1, 0, 1)],
            [(0, 0, 0), (0, -1, 1)],
        ]

        for tile in self.tiles:
            q, r, s = tile.get_coordinates()

            for offset_pair in edge_directions:
                coords = set()
                for dq, dr, ds in offset_pair:
                    coords.add((q + dq, r + dr, s + ds))
                key = frozenset(coords)

                if key not in self.edges:
                    self.edges[key] = Edge(tiles=coords)

    def place_road(self, road: Road, edge_coords: set[tuple[int, int, int]], free=False):
        """
        Postaw drogę na planszy
        
        Args:
            road: Droga do postawienia (obiekt Road)
            edge_coords: Koordynaty krawędzi
            free: Czy droga ma być postawiona za darmo (faza setup)
        
        Returns:
            bool: Czy udało się postawić drogę
        """
        edge_key = frozenset(edge_coords)

        if edge_key not in self.edges:
            return False

        edge = self.edges[edge_key]

        if edge.road is not None:
            return False
            
        # W fazie setup pomijamy sprawdzanie połączenia, w normalnej fazie sprawdzamy
        if not free and not self._has_adjacent_building_or_road(edge_key, road.player):
            return False

        edge.road = road
        return True

    def place_building(self, building: Building, vertex_coords: set[tuple[int, int, int]], free=False):
        """
        Postaw budynek (osadę lub miasto) na planszy
        
        Args:
            building: Obiekt budynku do postawienia
            vertex_coords: Koordynaty wierzchołka
            free: Czy budynek ma być postawiony za darmo (faza setup)
        
        Returns:
            bool: Czy udało się postawić budynek
        """
        vertex_key = frozenset(vertex_coords)

        if vertex_key not in self.vertices:
            return False

        vertex = self.vertices[vertex_key]

        # to jest proba ulepsza z osady na miasto
        if vertex.building is not None:
            if (vertex.building.player == building.player and
                    vertex.building.building_type.SETTLEMENT and
                    building.building_type.CITY):
                vertex.building = building
                return True
            else:
                return False

        # ato patrzy czy nie ma w poblizu czegos juz
        for neighbor_key in self._get_neighboring_vertices(vertex_key):
            if neighbor_key in self.vertices and self.vertices[neighbor_key].building is not None:
                return False
                
        # W normalnej fazie sprawdź połączenie z drogą, w fazie setup pomijamy
        if not free and not self._has_connected_road(vertex_key, building.player):
            return False

        vertex.building = building
        return True

    def can_place_road(self, player: Player, edge_coords: set[tuple[int, int, int]], free=False):
        """
        Sprawdź, czy można postawić drogę na danej krawędzi
        
        Args:
            player: Gracz stawiający drogę
            edge_coords: Koordynaty krawędzi
            free: Czy pomijamy sprawdzanie połączenia (faza setup)
        
        Returns:
            bool: Czy można postawić drogę
        """
        # edge_key = frozenset(edge_coords)
        #
        # # Sprawdź, czy krawędź istnieje
        # if edge_key not in self.edges:
        #     return False
        #
        # edge = self.edges[edge_key]
        #
        # # Sprawdź, czy krawędź jest wolna
        # if edge.road is not None:
        #     return False
        #
        # # W fazie setup pomijamy sprawdzanie połączenia
        # if free:
        #     return True
        #
        # # Sprawdź, czy istnieje połączenie z inną drogą lub budynkiem gracza
        # return self._has_adjacent_building_or_road(edge_key, player)
        return True

    def can_place_settlement(self, player, vertex_key, is_setup_phase=False):
        """
        Sprawdza, czy można postawić osadę na danym wierzchołku.

        Zasady:
        1. Wierzchołek musi być pusty
        2. Żadne sąsiednie wierzchołki nie mogą mieć osad ani miast
        3. W fazie setup nie musimy sprawdzać połączenia z drogą
        """
        print(f"Checking if can place settlement at {vertex_key} for player {player.id}")

        # Sprawdź, czy wierzchołek istnieje w planszy
        if vertex_key not in self.vertices:
            print(f"Vertex {vertex_key} not found in board")
            return False

        # Sprawdź, czy wierzchołek jest pusty
        vertex = self.vertices[vertex_key]
        if hasattr(vertex, 'building') and vertex.building is not None:
            print(f"Vertex {vertex_key} already has a building")
            return False

        # Znajdź sąsiednie wierzchołki
        adjacent_vertices = self.get_adjacent_vertices(vertex_key)

        # W fazie setup w pierwszej rundzie, pomijamy sprawdzanie sąsiednich wierzchołków
        # Warto dodać ten warunek, aby umożliwić postawienie pierwszej osady
        if is_setup_phase:
            print(f"Setup phase: checking more relaxed rules for first settlements")

            # Sprawdź czy to pierwsza osada gracza w fazie setup
            player_has_settlements = False
            for v_key, v in self.vertices.items():
                if hasattr(v, 'building') and v.building is not None:
                    if v.building.player == player:
                        player_has_settlements = True
                        break

            if not player_has_settlements:
                print(f"First settlement in setup phase for player {player.id}, relaxing distance rule")
                # Dla pierwszej osady w fazie setup, sprawdzaj tylko czy wierzchołek jest pusty
                return True

        # Sprawdź, czy żaden sąsiedni wierzchołek nie ma budynku
        for adj_vertex_key in adjacent_vertices:
            if adj_vertex_key in self.vertices:
                adj_vertex = self.vertices[adj_vertex_key]
                if hasattr(adj_vertex, 'building') and adj_vertex.building is not None:
                    print(f"Adjacent vertex {adj_vertex_key} already has a building")
                    return False

        # Dla fazy innej niż setup, sprawdź czy jest połączenie z drogą gracza
        if not is_setup_phase:
            # Znajdź krawędzie połączone z tym wierzchołkiem
            connected_edges = []
            for edge_key, edge in self.edges.items():
                edge_vertices = self.get_edge_vertices(edge_key)
                if vertex_key in edge_vertices:
                    connected_edges.append(edge_key)

            # Sprawdź, czy któraś z krawędzi należy do gracza
            has_connected_road = False
            for edge_key in connected_edges:
                edge = self.edges[edge_key]
                if hasattr(edge, 'road') and edge.road is not None:
                    if edge.road.player == player:
                        has_connected_road = True
                        break

            if not has_connected_road:
                print(f"No road connected to vertex {vertex_key} for player {player.id}")
                return False

        return True

    def get_adjacent_vertices(self, vertex_key):
        """
        Zwraca listę wierzchołków sąsiadujących z danym wierzchołkiem.
        Dwa wierzchołki są sąsiednie, jeśli są połączone krawędzią.
        """
        adjacent_vertices = []

        # Znajdź wszystkie krawędzie połączone z tym wierzchołkiem
        for edge_key, edge in self.edges.items():
            edge_vertices = self.get_edge_vertices(edge_key)
            if vertex_key in edge_vertices:
                # Dla każdej krawędzi znajdź drugi wierzchołek
                for v_key in edge_vertices:
                    if v_key != vertex_key:
                        adjacent_vertices.append(v_key)

        return adjacent_vertices

    def get_edge_vertices(self, edge_key):
        """
        Zwraca listę wierzchołków połączonych z daną krawędzią.
        """
        connected_vertices = []

        # Dla krawędzi w formacie frozenset, wierzchołki są już w strukturze
        if isinstance(edge_key, frozenset):
            # Sprawdź, które elementy krawędzi są wierzchołkami w planszy
            for vertex_key in self.vertices:
                if len(edge_key & vertex_key) > 0:  # Sprawdź część wspólną zbiorów
                    connected_vertices.append(vertex_key)

        return connected_vertices

    def _get_neighboring_vertices(self, vertex_key: frozenset[tuple[int, int, int]]):
        neighboring_vertices = []
        vertex_coords = list(vertex_key)

        for coord1 in vertex_coords:
            for coord2 in vertex_coords:
                if coord1 != coord2:
                    edge_key = frozenset([coord1, coord2])

                    for other_vertex_key in self.vertices:
                        if other_vertex_key != vertex_key and len(edge_key.intersection(other_vertex_key)) == 2:
                            neighboring_vertices.append(other_vertex_key)

        return neighboring_vertices

    def _has_connected_road(self, vertex_key: frozenset[tuple[int, int, int]], player: Player):
        vertex_coords = list(vertex_key)

        for i in range(len(vertex_coords)):
            for j in range(i + 1, len(vertex_coords)):
                edge_key = frozenset([vertex_coords[i], vertex_coords[j]])

                if edge_key in self.edges and self.edges[edge_key].road is not None:
                    if self.edges[edge_key].road.player == player:
                        return True

        return False

    def _has_adjacent_building_or_road(self, edge_key: frozenset[tuple[int, int, int]], player: Player):
        edge_coords = list(edge_key)

        for vertex_key in self.vertices:
            if len(set(edge_coords).intersection(vertex_key)) == 2:
                vertex = self.vertices[vertex_key]
                if vertex.building is not None and vertex.building.player == player:
                    return True

        for other_edge_key in self.edges:
            if other_edge_key != edge_key and len(edge_key.intersection(other_edge_key)) == 1:
                other_edge = self.edges[other_edge_key]
                if other_edge.road is not None and other_edge.road.player == player:
                    return True

        return False

    def find_vertex_key(self, coords_list: list[tuple[int, int, int]]):
        coords_set = set(coords_list)
        for vertex_key in self.vertices:
            if vertex_key == frozenset(coords_set):
                return vertex_key
        return None

    def find_edge_key(self, coords_list: list[tuple[int, int, int]]):
        coords_set = set(coords_list)
        for edge_key in self.edges:
            if edge_key == frozenset(coords_set):
                return edge_key
        return None

    def serialize_board(self):
        tiles_data = []
        for tile in self.tiles:
            q, r, s = tile.get_coordinates()
            tile_data = {
                "coordinates": {"q": q, "r": r, "s": s},
                "resource": str(tile.get_resource()),
                "number": tile.number if hasattr(tile, 'number') else None,
                "has_robber": tile.has_robber if hasattr(tile, 'has_robber') else False
            }
            tiles_data.append(tile_data)

        vertices_data = {}
        for i, (vertex_key, vertex) in enumerate(self.vertices.items()):
            vertex_coords = list(vertex_key)
            key = f"vertex_{i}"

            building_data = None
            if vertex.building is not None:
                building_data = {
                    "type": vertex.building.building_type.name,
                    "player_id": vertex.building.player.id if hasattr(vertex.building.player, 'id') else str(
                        vertex.building.player),
                    "player_color": vertex.building.player.color if hasattr(vertex.building.player, 'color') else None
                }

            vertices_data[key] = {
                "coordinates": vertex_coords,
                "building": building_data
            }

        edges_data = {}
        for i, (edge_key, edge) in enumerate(self.edges.items()):
            edge_coords = list(edge_key)
            key = f"edge_{i}"

            road_data = None
            if edge.road is not None:
                road_data = {
                    "player_id": edge.road.player.id if hasattr(edge.road.player, 'id') else str(edge.road.player),
                    "player_color": edge.road.player.color if hasattr(edge.road.player, 'color') else None
                }

            edges_data[key] = {
                "coordinates": edge_coords,
                "road": road_data
            }

        board_data = {
            "tiles": tiles_data,
            "vertices": vertices_data,
            "edges": edges_data
        }

        return board_data

    def get_tile_by_coords(self, coords: tuple[int, int, int]) -> Tile | None:
        """
        Get a tile by its coordinates.
        
        Args:
            coords: A tuple of (q, r, s) coordinates
            
        Returns:
            The tile at the given coordinates, or None if no tile exists at those coordinates
        """
        for tile in self.tiles:
            if tile.get_coordinates() == coords:
                return tile
        return None

    # Dodaj te metody do klasy GameBoard w backend/game_engine/board/game_board.py

    def get_connected_vertices(self, edge_key):
        """Pobierz wierzchołki połączone z daną krawędzią"""
        connected_vertices = []

        # Dla krawędzi w formacie frozenset
        if isinstance(edge_key, frozenset):
            # Pobierz współrzędne z krawędzi
            edge_coords = list(edge_key)

            # Dla każdego wierzchołka sprawdź, czy jest połączony z krawędzią
            for vertex_key in self.vertices.keys():
                vertex_coords = list(vertex_key)

                # Sprawdź czy wierzchołek ma wspólne współrzędne z krawędzią
                # W typowym modelu heksagonalnym krawędź łączy dwa wierzchołki
                common_coords = set(edge_coords).intersection(set(vertex_coords))
                if common_coords:
                    connected_vertices.append(vertex_key)

        return connected_vertices

    def find_edge_by_coords(self, coords):
        """Znajdź krawędź na podstawie współrzędnych"""
        if isinstance(coords, (list, tuple)) and len(coords) == 3:
            # Jeśli przekazano pojedynczą współrzędną (x,y,z)
            coord_tuple = tuple(coords) if isinstance(coords, list) else coords

            # Szukaj krawędzi zawierającej tę współrzędną
            for edge_key in self.edges.keys():
                edge_coords = list(edge_key)
                for edge_coord in edge_coords:
                    if edge_coord == coord_tuple:
                        return edge_key

        # Jeśli przekazano zestaw współrzędnych, spróbuj utworzyć frozenset
        try:
            edge_key = frozenset(coords)
            if edge_key in self.edges:
                return edge_key
        except:
            pass

        return None

    def find_vertex_by_coords(self, coords):
        """Znajdź wierzchołek na podstawie współrzędnych"""
        if isinstance(coords, (list, tuple)) and len(coords) == 3:
            # Jeśli przekazano pojedynczą współrzędną (x,y,z)
            coord_tuple = tuple(coords) if isinstance(coords, list) else coords

            # Szukaj wierzchołka zawierającego tę współrzędną
            for vertex_key in self.vertices.keys():
                vertex_coords = list(vertex_key)
                for vertex_coord in vertex_coords:
                    if vertex_coord == coord_tuple:
                        return vertex_key

        # Jeśli przekazano zestaw współrzędnych, spróbuj utworzyć frozenset
        try:
            vertex_key = frozenset(coords)
            if vertex_key in self.vertices:
                return vertex_key
        except:
            pass

        return None

    def get_adjacent_tiles(self, vertex_key):
        """Pobierz kafelki sąsiadujące z danym wierzchołkiem"""
        adjacent_tiles = []

        # Dla wierzchołka w formacie frozenset
        if isinstance(vertex_key, frozenset):
            # Pobierz współrzędne z wierzchołka
            vertex_coords = list(vertex_key)

            # Dla każdego kafelka sprawdź, czy jest sąsiedni z wierzchołkiem
            for tile in self.tiles:
                tile_coords = tile.get_coordinates() if hasattr(tile, 'get_coordinates') else None
                if tile_coords:
                    # Sprawdź czy współrzędne kafelka są w wierzchołku
                    if any(tile_coords == coord for coord in vertex_coords):
                        adjacent_tiles.append(tile)

        return adjacent_tiles

if __name__ == '__main__':

    from game_engine.board.temp_helpers import print_board

    config = GameConfig()
    board = GameBoard(config)

    print(board.serialize_board())




    # for q in range(-2, 3):
    #     for r in range(-2, 3):
    #         s = -q - r
    #         if -2 <= s <= 2:
    #             print(q, r, s)

