from typing import List


class GameConfig:

    def __init__(self, max_cities: int = 5,
                 max_settlements: int = 5,
                 points_to_win: int = 10,
                 cards_to_discard: int = 7,
                 wheat_tiles: int = 4,
                 sheep_tiles: int = 4,
                 ore_tiles: int = 4,
                 wood_tiles: int = 4,
                 brick_tiles: int = 4,
                 desert_tiles: int = 1,
                 tiles_numbers=None
                 ):

        self.max_cities = max_cities
        self.max_settlements = max_settlements
        self.points_to_win = points_to_win
        self.cards_to_discard = cards_to_discard

        self.wheat_tiles = wheat_tiles
        self.sheep_tiles = sheep_tiles
        self.ore_tiles = ore_tiles
        self.wood_tiles = wood_tiles
        self.brick_tiles = brick_tiles
        self.desert_tiles = desert_tiles


        if tiles_numbers is None:
            self.tiles_numbers = [2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12]
        else:
            self.tiles_numbers = tiles_numbers