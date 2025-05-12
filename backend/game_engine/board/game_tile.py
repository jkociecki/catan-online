from game_engine.common.resources import Resource

from abc import ABC, abstractmethod


class Tile(ABC):

    def __init__(self, number: int | None = None):
        
        self.number = number
        self.is_robber_placed = False


        self.q: int = 0
        self.r: int = 0
        self.s: int = 0


    def set_coordinates(self, q: int, r: int, s: int):
        self.q = q
        self.r = r
        self.s = s

    @abstractmethod
    def get_resource(self) -> Resource:
        pass


class WheatTile(Tile):

    def get_resource(self) -> Resource:
        return Resource.WHEAT
        

class BrickTile(Tile):

    def get_resource(self):
        return Resource.BRICK
    

class WoodTile(Tile):

    def get_resource(self):
        return Resource.WOOD
    

class OreTile(Tile):

    def get_resource(self):
        return Resource.ORE
    

class SheepTile(Tile):

    def get_resource(self):
        return Resource.SHEEP
    

class DesertTile(Tile):

    def __init__(self):
        super().__init__(number=None)
        self.is_robber_placed = True

    def get_resource(self):
        return Resource.DESERT