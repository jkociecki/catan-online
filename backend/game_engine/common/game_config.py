from typing import List


class GameConfig:

    def __init__(self,
                 max_cities: int = 5,
                 max_settlements: int = 5,
                 max_roads: int = 12,
                 max_dev_cards: int = 20,

                 points_to_win: int = 10,
                 cards_to_discard: int = 7,

                 wheat_tiles: int = 4,
                 sheep_tiles: int = 4,
                 ore_tiles: int = 3,
                 wood_tiles: int = 4,
                 brick_tiles: int = 3,
                 desert_tiles: int = 1,

                 monopoly_cards_count: int = 5,
                 knight_cards_count: int = 5,
                 year_of_plenty_cards_count: int = 5,
                 victory_points_cards_count: int = 5,
                 road_building_cards_count: int = 5,

                 ore_cards_count: int = 19,
                 wheat_cards_count: int = 19,
                 wood_cards_count: int = 19,
                 brick_cards_count: int = 19,
                 sheep_cards_count: int = 19,

                 tiles_numbers=None
                 ):

        self.max_cities = max_cities
        self.max_settlements = max_settlements
        self.max_roads = max_roads
        self.max_dev_cards = max_dev_cards

        self.points_to_win = points_to_win
        self.cards_to_discard = cards_to_discard

        self.wheat_tiles = wheat_tiles
        self.sheep_tiles = sheep_tiles
        self.ore_tiles = ore_tiles
        self.wood_tiles = wood_tiles
        self.brick_tiles = brick_tiles
        self.desert_tiles = desert_tiles

        self.monopoly_cards_count = monopoly_cards_count
        self.knight_cards_count = knight_cards_count
        self.year_of_plenty_cards_count = year_of_plenty_cards_count
        self.victory_points_cards_count = victory_points_cards_count
        self.road_building_cards_count = road_building_cards_count

        self.ore_cards_count = ore_cards_count
        self.wheat_cards_count = wheat_cards_count
        self.wood_cards_count = wood_cards_count
        self.brick_cards_count = brick_cards_count
        self.sheep_cards_count = sheep_cards_count




        if tiles_numbers is None:
            self.tiles_numbers = [2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12]
        else:
            self.tiles_numbers = tiles_numbers