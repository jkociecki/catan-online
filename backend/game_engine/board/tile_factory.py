from game_engine.board.game_tile import Tile, WoodTile, BrickTile, DesertTile, WheatTile, SheepTile, OreTile
from game_engine.common.resources import Resource


class TileFactory:

    @staticmethod
    def create_tile(resource: Resource, number: int | None) -> Tile:

        match resource:
            case Resource.WOOD:
                return WoodTile(number)
            case Resource.BRICK:
                return BrickTile(number)
            case Resource.DESERT:
                return DesertTile()
            case Resource.WHEAT:
                return WheatTile(number)
            case Resource.DESERT.ORE:
                return OreTile(number)
            case Resource.SHEEP:
                return SheepTile(number)
            case _:
                raise Exception(f"Unknown resource: {resource}")