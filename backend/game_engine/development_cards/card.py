from abc import ABC, abstractmethod
from enum import Enum



class DevelopmentCardType(Enum):

    KNIGHT = 'knight'
    VICTORY_POINT = 'victory point'
    ROAD_BUILDING = 'road building'
    YEAR_OF_PLENTY = 'year of plenty'
    MONOPOLY = 'monopoly'


class DevelopmentCard:

    def __init__(self, card_type: DevelopmentCardType):

        self.card_type = card_type
        self.played: bool = False
        self.turn_bought: int = 0


    def can_play(self, current_turn):
        return not self.played and current_turn > self.turn_bought

    def play(self):
        if self.card_type != DevelopmentCardType.VICTORY_POINT:
            self.played = True



