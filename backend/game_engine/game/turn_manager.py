from enum import Enum
from typing import List

from game_engine.board.buildings import Road, BuildingType, Building
from game_engine.board.game_board import GameBoard
from game_engine.common.game_config import GameConfig
from game_engine.common.resources import Resource
from game_engine.game.game_phase import GamePhase
from game_engine.player.player import Player


class TurnManager:

    def __init__(self, game_board: GameBoard, config: GameConfig, players: List[Player]):

        self.game_board = game_board
        self.config = config
        self.players = players

        self.current_player_index: int = 0
        self.current_game_phase: GamePhase = GamePhase.SETUP
        self.round = 0
        self.dice_value = None

        self.setup_settlements_placed = 0
        self.setup_roads_placed = 0


    @property
    def current_player(self) -> Player:
        return self.players[self.current_player_index]

    def next_player(self):
        if self.current_game_phase == GamePhase.SETUP:
            if self.setup_settlements_placed < len(self.players):
                self.current_player_index = (self.current_player_index + 1) % len(self.players)
            else:
                self.current_player_index = (self.current_player_index - 1) % len(self.players)
        else:
            self.current_player_index = (self.current_player_index + 1) % len(self.players)
            if self.current_player_index == 0:
                self.round += 1

            self.current_game_phase = GamePhase.ROLL_DICE

    def roll_dice(self) -> tuple[int, int]:
        import random
        dice1 = random.randint(1, 6)
        dice2 = random.randint(1, 6)
        self.dice_value = dice1 + dice2

        if self.dice_value == 7:
            self._handle_robber()
        else:
            self._distribute_resources(self.dice_value)

        self.current_phase = GamePhase.MAIN
        return dice1, dice2

    def _handle_robber(self):

        for player in self.players:
            total_resources = sum(player.player_resources.resources.values())
            if total_resources > 7:
                resources_to_discard = total_resources // 2
                #nwm kurwa co dalej




    def _distribute_resources(self, dice_value: int):

        active_tiles = [tile for tile in self.game_board.tiles
                        if tile.number == dice_value and not tile.is_robber_placed]

        for tile in active_tiles:
            resource = tile.get_resource()
            if resource == Resource.DESERT:
                continue

            tile_coords = tile.get_coordinates()

            for vertex_key in self.game_board.vertices:
                vertex = self.game_board.vertices[vertex_key]

                if tile_coords in vertex.tiles and vertex.building is not None:
                    player = vertex.building.player
                    if vertex.building.building_type == BuildingType.SETTLEMENT:
                        player.add_resource(resource, 1)
                    elif vertex.building.building_type == BuildingType.CITY:
                        player.add_resource(resource, 2)

    def place_settlement_in_setup(self, player: Player, vertex_coords: set[tuple[int, int, int]]) -> bool:

        if self.current_phase != GamePhase.SETUP or player != self.current_player:
            return False

        settlement = Building(BuildingType.SETTLEMENT, player)
        result = self.game_board.place_building(settlement, vertex_coords)

        if result:
            self.setup_settlements_placed += 1

            if self.setup_settlements_placed > len(self.players):
                self._give_initial_resources(vertex_coords)

        return result

    def _give_initial_resources(self, vertex_coords: set[tuple[int, int, int]]):

        vertex_key = frozenset(vertex_coords)
        if vertex_key in self.game_board.vertices:
            vertex = self.game_board.vertices[vertex_key]
            player = vertex.building.player

            for tile_coords in vertex.tiles:
                for tile in self.game_board.tiles:
                    if tile.get_coordinates() == tile_coords:
                        resource = tile.get_resource()
                        if resource != Resource.DESERT:
                            player.add_resource(resource, 1)

    def place_road_in_setup(self, player: Player, edge_coords: set[tuple[int, int, int]]) -> bool:

        if self.current_phase != GamePhase.SETUP or player != self.current_player:
            return False

        road = Road(player)
        result = self.game_board.place_road(road, edge_coords)

        if result:
            self.setup_roads_placed += 1

            if self.setup_roads_placed == self.setup_settlements_placed:
                if self.setup_settlements_placed == 2 * len(self.players):
                    self.current_game_phase = GamePhase.ROLL_DICE
                    self.current_player_index = 0
                else:
                    self.next_player()

        return result

    def build_settlement(self, player: Player, vertex_coords: set[tuple[int, int, int]]) -> bool:

        if self.current_phase != GamePhase.MAIN or player != self.current_player:
            return False

        if not player.can_afford_building(BuildingType.SETTLEMENT):
            return False

        settlement = Building(BuildingType.SETTLEMENT, player)
        result = self.game_board.place_building(settlement, vertex_coords)

        if result:
            player.pay_for_building(BuildingType.SETTLEMENT)
            return True

        return False

    def build_city(self, player: Player, vertex_coords: set[tuple[int, int, int]]) -> bool:

        if self.current_phase != GamePhase.MAIN or player != self.current_player:
            return False

        if not player.can_afford_building(BuildingType.CITY):
            return False

        vertex_key = frozenset(vertex_coords)
        if (vertex_key not in self.game_board.vertices or
                self.game_board.vertices[vertex_key].building is None or
                self.game_board.vertices[vertex_key].building.player != player or
                self.game_board.vertices[vertex_key].building.building_type != BuildingType.SETTLEMENT):
            return False

        city = Building(BuildingType.CITY, player)
        result = self.game_board.place_building(city, vertex_coords)

        if result:
            player.pay_for_building(BuildingType.CITY)
            return True

        return False

    def build_road(self, player: Player, edge_coords: set[tuple[int, int, int]]) -> bool:

        if self.current_phase != GamePhase.MAIN or player != self.current_player:
            return False

        if not player.can_afford_road():
            return False

        road = Road(player)
        result = self.game_board.place_road(road, edge_coords)

        if result:
            player.pay_for_road()
            return True

        return False

    def end_turn(self):
        if self.current_phase == GamePhase.MAIN or self.current_phase == GamePhase.END_TURN:
            self.current_game_phase = GamePhase.END_TURN
            self.next_player()

    def get_game_state(self):
        # cos tutaj wnm nwm nwm nwm nwm
        pass