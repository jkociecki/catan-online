from typing import List
import random

from game_engine.common.game_config import GameConfig
from game_engine.development_cards.card import DevelopmentCard, DevelopmentCardType



class DevelopmentCardDeck:

    def __init__(self, game_config: GameConfig):

        self.game_config = game_config
        self.cards_deck: List[DevelopmentCard] = []

        for _ in range(game_config.monopoly_cards_count):
            self.cards_deck.append(DevelopmentCard(DevelopmentCardType.MONOPOLY))

        for _ in range(game_config.knight_cards_count):
            self.cards_deck.append(DevelopmentCard(DevelopmentCardType.KNIGHT))

        for _ in range(game_config.victory_points_cards_count):
            self.cards_deck.append(DevelopmentCard(DevelopmentCardType.VICTORY_POINT))

        for _ in range(game_config.year_of_plenty_cards_count):
            self.cards_deck.append(DevelopmentCard(DevelopmentCardType.YEAR_OF_PLENTY))

        for _ in range(game_config.road_building_cards_count):
            self.cards_deck.append(DevelopmentCard(DevelopmentCardType.ROAD_BUILDING))

        random.shuffle(self.cards_deck)


    def draw(self) -> DevelopmentCard | None:

        if not self.cards_deck:
            return None
        return self.cards_deck.pop()


    def is_empty(self) -> bool:
        return len(self.cards_deck) == 0


    def count(self) -> int:
        return len(self.cards_deck)

