from game_engine.common.game_config import GameConfig
from game_engine.player.player import Player
from game_engine.common.resources import Resource
from typing import List, Dict
from game_engine.game.turn_manager import TurnManager
from game_engine.board.game_board import GameBoard
from game_engine.game.game_phase import GamePhase



class GameState:
    def __init__(self, config: GameConfig):
        self.game_config: GameConfig = config
        self.players: List[Player] = []
        self.game_board = GameBoard(config)
        self.phase = GamePhase.SETUP
        self.setup_placed = {}
        self.turn_manager = None  # Will be initialized after players are added
        #self.turn_manager = TurnManager(self.game_board, self.game_config, self.players)

    def add_player(self, player: Player):
        self.players.append(player)
        if len(self.players) == 1:  # Initialize turn_manager after first player
            self.turn_manager = TurnManager(self.game_board, self.game_config, self.players)
        elif len(self.players) > 1:  # Update turn_manager with new player
            self.turn_manager.players = self.players

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

    # W backend/game_engine/game/game_state.py
    def check_setup_progress(self):
        """Sprawdź postęp fazy setup i odpowiednio aktualizuj stan gry"""
        # Sprawdź czy wszyscy gracze mają postawione początkowe budynki
        all_placed = True
        for player in self.players:
            # Jeśli gracz nie ma jeszcze zapisanego postępu, zainicjuj
            if player.id not in self.setup_placed:
                self.setup_placed[player.id] = [0, 0]  # [osady, drogi]

            # Sprawdź czy gracz ma przynajmniej 1 osadę i 1 drogę
            placements = self.setup_placed[player.id]
            if placements[0] < 1 or placements[1] < 1:
                all_placed = False
                break

        # Jeśli wszyscy gracze mają postawione początkowe budynki, przejdź do drugiej rundy
        if all_placed and self.phase == GamePhase.SETUP:
            # Jeśli wszyscy mają przynajmniej po 1 osadzie i 1 drodze, sprawdź czy mają po 2
            second_round_complete = True
            for player in self.players:
                placements = self.setup_placed[player.id]
                if placements[0] < 2 or placements[1] < 2:
                    second_round_complete = False
                    break

            # Jeśli druga runda jest zakończona, przejdź do głównej fazy gry
            if second_round_complete:
                self.phase = GamePhase.ROLL_DICE  # Zmień na ROLL_DICE zamiast MAIN
                # Tutaj możesz dodać kod do rozdania początkowych zasobów
    def place_initial_settlement(self, player, vertex_coords):
        """Postaw początkową osadę w fazie setup (bez kosztu)"""
        # Sprawdź czy gracz może postawić tę osadę
        if not self.game_board.can_place_settlement(player, vertex_coords):
            return False
        
        # Postaw osadę
        if not self.game_board.place_settlement(player, vertex_coords, free=True):
            return False
        
        # Aktualizuj licznik postawionych osad w fazie setup
        if player.id not in self.setup_placed:
            self.setup_placed[player.id] = [0, 0]
        self.setup_placed[player.id][0] += 1
        
        # Sprawdź czy druga osada - przyznaj zasoby
        if self.setup_placed[player.id][0] == 2:
            # Tutaj kod przyznający zasoby za drugą osadę
            self.assign_initial_resources(player, vertex_coords)
        
        # Sprawdź ogólny postęp fazy setup
        self.check_setup_progress()
        
        return True
    
    def place_initial_road(self, player, edge_coords):
        """Postaw początkową drogę w fazie setup (bez kosztu)"""
        # Sprawdź czy gracz może postawić tę drogę
        if not self.game_board.can_place_road(player, edge_coords):
            return False
        
        # Postaw drogę
        if not self.game_board.place_road(player, edge_coords, free=True):
            return False
        
        # Aktualizuj licznik postawionych dróg w fazie setup
        if player.id not in self.setup_placed:
            self.setup_placed[player.id] = [0, 0]
        self.setup_placed[player.id][1] += 1
        
        # Sprawdź ogólny postęp fazy setup
        self.check_setup_progress()
        
        return True
    
    def assign_initial_resources(self, player, vertex_coords):
        """Przyznaj początkowe zasoby za drugą osadę"""
        # Logika przyznawania zasobów za drugą osadę w fazie setup
        # Zazwyczaj gracz otrzymuje po 1 zasobie z każdego pola sąsiadującego z osadą
        adjacent_tiles = self.game_board.get_adjacent_tiles(vertex_coords)
        for tile in adjacent_tiles:
            resource = tile.resource
            if resource is not None:  # Nie dodawaj zasobów z pustyni
                player.add_resource(resource, 1)