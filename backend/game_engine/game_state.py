from game_engine.common.game_config import GameConfig
from game_engine.player import Player

from typing import List



class GameState:

    def __init__(self, config: GameConfig):

        self.game_config: GameConfig = config
        self.players: List[Player] = []


    def add_player(self, player: Player):
        self.players.append(player)