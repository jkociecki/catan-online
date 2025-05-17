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

    def place_road(self, road: Road, edge_coords: set[tuple[int, int, int]]):
        edge_key = frozenset(edge_coords)

        if edge_key not in self.edges:
            return False

        edge = self.edges[edge_key]

        if edge.road is not None:
            return False

        edge.road = road
        return True

    def place_building(self, building: Building, vertex_coords: set[tuple[int, int, int]]):
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

        vertex.building = building
        return True

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

