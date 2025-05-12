from enum import Enum
from game_engine.player import Player


class BuildingType(Enum):
    SETTLEMENT = "settlement"
    CITY = "city"


class Building:

    def __init__(self, building_type: BuildingType, player: Player):
        self.building_type = building_type
        self.player = player


class Road:

    def __init__(self,player: Player):
        self.player = player