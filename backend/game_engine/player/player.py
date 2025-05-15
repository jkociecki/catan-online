from typing import Optional, List, Dict

from game_engine.board.buildings import BuildingType
from game_engine.common.game_config import GameConfig
from game_engine.common.player_color import PlayerColor
from game_engine.common.resources import PlayerResources, Resource
from game_engine.development_cards.card import DevelopmentCardType, DevelopmentCard


class Player:
    def __init__(self, color: PlayerColor, game_config: GameConfig):
        self.game_config: GameConfig = game_config
        self.color: PlayerColor = color
        self.player_resources: PlayerResources = PlayerResources()

        self.settlements_left: int = game_config.max_settlements
        self.cities_left: int = game_config.max_cities
        self.roads_left: int = game_config.max_roads

        self.victory_points: int = 0
        self.hidden_victory_points: int = 0
        self.longest_road: bool = False
        self.largest_army: bool = False

        # For tracking development cards
        self.development_cards: List[DevelopmentCard] = []
        self.knights_played: int = 0

        # For harbor/port trading bonuses
        self.harbor_bonuses: Dict[Optional[Resource], int] = {
            None: 4  # Default 4:1 trade ratio
        }

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

    def can_afford_road(self) -> bool:
        return (self.roads_left > 0
                and self.player_resources.resources[Resource.WOOD] >= 1
                and self.player_resources.resources[Resource.BRICK] >= 1)

    def can_afford_dev_card(self) -> bool:
        return (self.player_resources.resources[Resource.ORE] >= 1
                and self.player_resources.resources[Resource.WHEAT] >= 1
                and self.player_resources.resources[Resource.SHEEP] >= 1)

    def pay_for_building(self, building_type: BuildingType):
        if building_type == BuildingType.SETTLEMENT:
            self.remove_resource(Resource.WOOD, 1)
            self.remove_resource(Resource.BRICK, 1)
            self.remove_resource(Resource.SHEEP, 1)
            self.remove_resource(Resource.WHEAT, 1)
        elif building_type == BuildingType.CITY:
            self.remove_resource(Resource.WHEAT, 2)
            self.remove_resource(Resource.ORE, 3)

    def pay_for_road(self):
        self.remove_resource(Resource.WOOD, 1)
        self.remove_resource(Resource.BRICK, 1)

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

    def add_development_card(self, card_type: DevelopmentCardType):
        card = DevelopmentCard(card_type)
        self.development_cards.append(card)

    def can_play_development_card(self, card_type: DevelopmentCardType) -> bool:
        return any(card.card_type == card_type and card.can_play(7)
                   for card in self.development_cards)

    def play_development_card(self, card_type: DevelopmentCardType) -> bool:
        for i, card in enumerate(self.development_cards):

            if card.card_type == card_type and card.get_can_be_played():
                self.development_cards.pop(i)

                if card_type == DevelopmentCardType.KNIGHT:
                    self.knights_played += 1

                return True

        return False

    def enable_new_development_cards(self):
        for card in self.development_cards:
            card.can_play_this_turn = True

    def get_best_trade_ratio(self, resource: Resource) -> int:
        if resource in self.harbor_bonuses:
            return self.harbor_bonuses[resource]
        return self.harbor_bonuses[None]  # Default ratio

    def add_harbor_bonus(self, resource: Optional[Resource] = None, ratio: int = 3):
        if resource is None:
            # General harbor (3:1)
            self.harbor_bonuses[None] = min(self.harbor_bonuses[None], ratio)
        else:
            self.harbor_bonuses[resource] = ratio

    def get_hand_representation(self, show_hidden: bool = False) -> Dict:
        resources = {r.name: count for r, count in self.player_resources.resources.items()}

        dev_cards = {}
        for card in self.development_cards:
            card_type = card.card_type.value
            if card_type in dev_cards:
                dev_cards[card_type] += 1
            else:
                dev_cards[card_type] = 1

        result = {
            "resources": resources,
            "buildings": {
                "settlements": self.settlements_left,
                "cities": self.cities_left,
                "roads": self.roads_left
            },
            "public_victory_points": self.victory_points,
            "knights_played": self.knights_played,
            "has_longest_road": self.longest_road,
            "has_largest_army": self.largest_army
        }

        if show_hidden:
            result["development_cards"] = dev_cards
            result["hidden_victory_points"] = self.hidden_victory_points
            result["total_victory_points"] = self.get_victory_points()

        return result