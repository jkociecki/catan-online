from game_engine.common.game_config import GameConfig
from game_engine.common.player_color import PlayerColor
from game_engine.common.resources import PlayerResources










class Player:


    def __init__(self, color: PlayerColor, game_config: GameConfig):

        self.game_config: GameConfig = game_config
        self.color: PlayerColor = color
        self.player_resources: PlayerResources = PlayerResources()


        self.settlements_left: int = game_config.max_settlements
        self.cities_left: int = game_config.max_cities