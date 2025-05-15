from enum import Enum


class GamePhase(Enum):
    SETUP = 'setup'              # Initial placement of settlements and roads
    ROLL_DICE = 'roll_dice'      # Beginning of turn, player must roll dice
    MOVE_ROBBER = 'move_robber'  # After rolling 7, player must move robber
    DISCARD = 'discard'          # After rolling 7, players with >7 cards must discard
    MAIN = 'main'                # Main phase where player can build, trade, play cards
    TRADE = 'trade'              # Optional phase for negotiating trades
    END_TURN = 'end_turn'        # Player has finished their turn

    def __str__(self):
        return self.value