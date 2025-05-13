from game_engine.board.buildings import BuildingType
from game_engine.common.game_config import GameConfig
from game_engine.common.player_color import PlayerColor
from game_engine.common.resources import PlayerResources, Resource


class Player:


    def __init__(self, color: PlayerColor, game_config: GameConfig):

        self.game_config: GameConfig = game_config
        self.color: PlayerColor = color
        self.player_resources: PlayerResources = PlayerResources()
        self.must_discard: bool = False
        self.resources_to_discard: int = 0

        self.settlements_left: int = game_config.max_settlements
        self.cities_left: int = game_config.max_cities
        self.roads_left: int = game_config.max_roads

        self.victory_points: int = 0
        self.hidden_victory_points: int = 0
        self.longest_road: bool = False
        self.largest_army : bool= False



    def add_resource(self, resource: Resource, amount: int = 1):

        if resource != Resource.DESERT:
            self.player_resources.add(resource, amount)


    def remove_resource(self, resource: Resource, amount: int = 1):
        if resource != Resource.DESERT:
            self.player_resources.subtract(resource, amount)


    def can_afford_building(self, building_type: BuildingType) -> bool:

        if building_type == BuildingType.CITY:
            return (self.cities_left > 0
                    and self.player_resources.resources[Resource.ORE] >= 3
                    and self.player_resources.resources[Resource.WHEAT] >= 2)
        elif building_type == BuildingType.SETTLEMENT:
            return (self.settlements_left > 0
                    and self.player_resources.resources[Resource.BRICK] >= 1
                    and self.player_resources.resources[Resource.WOOD] >= 1
                    and self.player_resources.resources[Resource.SHEEP] >= 1
                    and self.player_resources.resources[Resource.WHEAT] >= 1)

        return False


    def can_afford_road(self):

        return (self.roads_left > 0
                and self.player_resources.resources[Resource.WOOD] >= 1
                and self.player_resources.resources[Resource.BRICK] >= 1)


    def can_afford_dev_card(self):

        return (self.player_resources.resources[Resource.ORE] >= 1
                and self.player_resources.resources[Resource.WHEAT] >= 1
                and self.player_resources.resources[Resource.SHEEP] >= 1)

    def pay_for_building(self, building_type: BuildingType):
        if building_type == BuildingType.SETTLEMENT:
            self.remove_resource(Resource.WOOD, 1)
            self.remove_resource(Resource.BRICK, 1)
            self.remove_resource(Resource.SHEEP, 1)
            self.remove_resource(Resource.WHEAT, 1)
            self.settlements_left -= 1

        elif building_type == BuildingType.CITY:
            self.remove_resource(Resource.WHEAT, 2)
            self.remove_resource(Resource.ORE, 3)
            self.cities_left -= 1

    def pay_for_road(self):
        self.remove_resource(Resource.WOOD, 1)
        self.remove_resource(Resource.BRICK, 1)
        self.roads_left -= 1

    def pay_for_development_card(self):
        self.remove_resource(Resource.SHEEP, 1)
        self.remove_resource(Resource.WHEAT, 1)
        self.remove_resource(Resource.ORE, 1)

    def get_resource_count(self) -> int:
        return sum(self.player_resources.resources.values())

    def get_victory_points(self) -> int:
        total_points = self.victory_points + self.hidden_victory_points

        if self.longest_road:
            total_points += 2

        if self.largest_army:
            total_points += 2

        return total_points

    def add_victory_point(self, hidden: bool = False):
        if hidden:
            self.hidden_victory_points += 1
        else:
            self.victory_points += 1

    def has_won(self, points_to_win: int = 10) -> bool:
        return self.get_victory_points() >= points_to_win