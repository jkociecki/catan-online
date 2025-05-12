import random
from typing import List


from game_engine.board.game_tile import Tile
from game_engine.board.tile_factory import TileFactory
from game_engine.common.resources import Resource
from game_engine.common.game_config import GameConfig

class GameBoard:

    def __init__(self, config):

        self.config: GameConfig = config
        self.tiles: List[Tile] = []


        self.generate_board()


    def generate_board(self):

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
                    index += 1






if __name__ == '__main__':

    from game_engine.board.temp_helpers import print_board

    config = GameConfig()
    board = GameBoard(config)

    print_board(board)




    # for q in range(-2, 3):
    #     for r in range(-2, 3):
    #         s = -q - r
    #         if -2 <= s <= 2:
    #             print(q, r, s)

