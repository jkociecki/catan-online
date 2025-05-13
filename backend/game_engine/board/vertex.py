from typing import Optional

from game_engine.board.buildings import Building, Road


class Vertex:

    def __init__(self, tiles: set[tuple[int,int,int]]) -> None:
        self.tiles = tiles
        self.building: Optional[Building] = None

class Edge:

    def __init__(self, tiles: set[tuple[int,int,int]]) -> None:
        self.tiles = tiles
        self.road: Optional[Road] = None




