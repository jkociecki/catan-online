from game_engine.common.game_config import GameConfig
from game_engine.player.player import Player
from game_engine.common.resources import Resource
from typing import List, Dict
from game_engine.game.turn_manager import TurnManager
from game_engine.board.game_board import GameBoard


class GameState:
    def __init__(self, config: GameConfig):
        self.game_config: GameConfig = config
        self.players: List[Player] = []
        self.game_board = GameBoard(config)
        self.turn_manager = None  # Will be initialized after players are added

    def add_player(self, player: Player):
        self.players.append(player)
        if len(self.players) == 4:  # Assuming 4 players
            self.turn_manager = TurnManager(self.game_board, self.game_config, self.players)

    @property
    def current_player_index(self):
        return self.turn_manager.current_player_index if self.turn_manager else 0

    def next_turn(self):
        if self.turn_manager:
            self.turn_manager.next_player()

    def roll_dice(self):
        if self.turn_manager:
            dice1, dice2 = self.turn_manager.roll_dice()
            return dice1 + dice2
        return 0

    def distribute_resources(self, dice_roll: int):
        """Distribute resources to players based on dice roll"""
        if self.turn_manager:
            self.turn_manager._distribute_resources(dice_roll)

    def handle_robber_roll(self):
        if self.turn_manager:
            self.turn_manager._handle_robber()

    def trade_resources(self, player1: Player, player2: Player, 
                       player1_offer: Dict[Resource, int],
                       player2_offer: Dict[Resource, int]) -> bool:
        """Handle resource trading between two players"""
        print(f"Player1 resources before trade: {player1.player_resources.resources}")
        print(f"Player2 resources before trade: {player2.player_resources.resources}")
        print(f"Player1 offer: {player1_offer}")
        print(f"Player2 offer: {player2_offer}")

        # Check if both players have the resources they're offering
        for resource, amount in player1_offer.items():
            player1_resources = player1.player_resources.resources.get(resource, 0)
            print(f"Player1 has {player1_resources} of {resource}, needs {amount}")
            if player1_resources < amount:
                print(f"Player1 doesn't have enough {resource}")
                return False

        for resource, amount in player2_offer.items():
            player2_resources = player2.player_resources.resources.get(resource, 0)
            print(f"Player2 has {player2_resources} of {resource}, needs {amount}")
            if player2_resources < amount:
                print(f"Player2 doesn't have enough {resource}")
                return False

        # Execute the trade
        for resource, amount in player1_offer.items():
            player1.remove_resource(resource, amount)
            player2.add_resource(resource, amount)
        for resource, amount in player2_offer.items():
            player2.remove_resource(resource, amount)
            player1.add_resource(resource, amount)

        print(f"Player1 resources after trade: {player1.player_resources.resources}")
        print(f"Player2 resources after trade: {player2.player_resources.resources}")
        return True

    def can_trade_with_port(self, player: Player, resource: Resource) -> bool:
        """Check if player can trade with port (3:1 ratio)"""
        return player.player_resources.resources.get(resource, 0) >= 3

    def is_game_over(self) -> bool:
        """Check if any player has won the game"""
        for player in self.players:
            if player.victory_points >= self.game_config.points_to_win:
                return True
        return False

    def get_winner(self) -> Player:
        """Get the winning player"""
        for player in self.players:
            if player.victory_points >= self.game_config.points_to_win:
                return player
        return None

    def check_victory(self, player: Player) -> bool:
        """Check if a player has won the game"""
        return player.has_won(self.game_config.points_to_win)