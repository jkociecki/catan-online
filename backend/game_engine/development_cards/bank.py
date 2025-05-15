from typing import Dict, Optional

from game_engine.common.game_config import GameConfig
from game_engine.common.resources import Resource
from game_engine.development_cards.card import DevelopmentCard
from game_engine.development_cards.card_deck import DevelopmentCardDeck


class Bank:

    def __init__(self, config: GameConfig):

        self.config = config

        self.resources: Dict[Resource, int] = {
            Resource.WOOD: config.wood_cards_count,
            Resource.BRICK: config.brick_cards_count,
            Resource.WHEAT: config.wheat_cards_count,
            Resource.SHEEP: config.sheep_cards_count,
            Resource.ORE: config.ore_cards_count,
        }

        self.development_cards = DevelopmentCardDeck(config)

    def take_resource(self, resource: Resource, amount: int = 1) -> bool:
        if resource == Resource.DESERT:
            return False

        if self.resources[resource] >= amount:
            self.resources[resource] -= amount
            return True
        return False

    def return_resource(self, resource: Resource, amount: int = 1):
        if resource != Resource.DESERT:
            self.resources[resource] += amount

    def draw_development_card(self) -> Optional[DevelopmentCard]:
        return self.development_cards.draw()

    def get_development_cards_count(self) -> int:
        return self.development_cards.count()

    def has_resource(self, resource: Resource, amount: int = 1) -> bool:
        if resource == Resource.DESERT:
            return False
        return self.resources[resource] >= amount