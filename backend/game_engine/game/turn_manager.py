from typing import List, Optional, Tuple, Dict
from enum import Enum

from game_engine.board.buildings import Road, BuildingType, Building
from game_engine.board.game_board import GameBoard
from game_engine.common.game_config import GameConfig
from game_engine.common.resources import Resource
from game_engine.development_cards.card_deck import DevelopmentCardDeck
from game_engine.game.game_phase import GamePhase
from game_engine.player.player import Player


class TradeOffer:
    def __init__(self, offering_player: Player, resources_offered: Dict[Resource, int],
                 resources_requested: Dict[Resource, int]):
        self.offering_player = offering_player
        self.resources_offered = resources_offered
        self.resources_requested = resources_requested
        self.accepting_player = None


class TurnManager:

    def __init__(self, game_board: GameBoard, config: GameConfig, players: List[Player]):
        self.game_board = game_board
        self.config = config
        self.players = players

        self.current_player_index: int = 0
        self.current_game_phase: GamePhase = GamePhase.SETUP
        self.round = 0
        self.dice_value = None

        self.setup_settlements_placed = 0
        self.setup_roads_placed = 0

        # For tracking active trade offers
        self.current_trade_offer: Optional[TradeOffer] = None

        # For development cards
        self.development_cards = DevelopmentCardDeck(config)
        self.dev_card_played_this_turn = False

        # For tracking largest army and longest road
        self.player_with_largest_army = None
        self.player_with_longest_road = None
        self.largest_army_size = 2  # Need at least 3 knights to get the bonus
        self.longest_road_length = 4  # Need at least 5 connected roads to get the bonus



    @property
    def current_player(self) -> Player:
        return self.players[self.current_player_index]

    @property
    def current_phase(self) -> GamePhase:
        return self.current_game_phase

    def next_player(self):
        """Move to the next player according to game phase."""
        if self.current_game_phase == GamePhase.SETUP:
            if self.setup_settlements_placed < len(self.players):
                # First round of setup: clockwise
                self.current_player_index = (self.current_player_index + 1) % len(self.players)
            else:
                # Second round of setup: counter-clockwise
                self.current_player_index = (self.current_player_index - 1) % len(self.players)

                # If we've completed a full counter-clockwise round
                if self.setup_roads_placed == 2 * len(self.players):
                    self.current_game_phase = GamePhase.ROLL_DICE
                    self.current_player_index = 0  # Start with first player
        else:
            # Regular game turns: clockwise
            self.current_player_index = (self.current_player_index + 1) % len(self.players)
            if self.current_player_index == 0:
                self.round += 1

            # Reset for the next player's turn
            self.current_game_phase = GamePhase.ROLL_DICE
            self.dev_card_played_this_turn = False

    def roll_dice(self) -> Tuple[int, int]:
        """Roll two dice and handle resource distribution or robber movement."""
        if self.current_game_phase != GamePhase.ROLL_DICE:
            raise ValueError("Cannot roll dice in the current game phase")

        import random
        dice1 = random.randint(1, 6)
        dice2 = random.randint(1, 6)
        self.dice_value = dice1 + dice2

        if self.dice_value == 7:
            self.current_game_phase = GamePhase.MOVE_ROBBER
            self._handle_robber()
        else:
            self._distribute_resources(self.dice_value)
            self.current_game_phase = GamePhase.MAIN

        return dice1, dice2

    def _handle_robber(self):
        """Handle players discarding cards when 7 is rolled."""
        players_to_discard = []

        for player in self.players:
            total_resources = player.get_resource_count()
            if total_resources > 7:
                resources_to_discard = total_resources // 2
                players_to_discard.append((player, resources_to_discard))

        return players_to_discard

    def discard_resources(self, player: Player, resources_to_discard: Dict[Resource, int]) -> bool:
        """Process a player discarding resources due to a robber roll."""
        # Verify correct amount of resources are being discarded
        total_discarded = sum(resources_to_discard.values())
        required_discard = player.get_resource_count() // 2

        if total_discarded != required_discard:
            return False

        # Verify player has these resources
        for resource, amount in resources_to_discard.items():
            if player.player_resources.resources[resource] < amount:
                return False

        # Remove the resources
        for resource, amount in resources_to_discard.items():
            player.remove_resource(resource, amount)

        return True

    def move_robber(self, tile_coords: Tuple[int, int, int], player_to_steal_from: Optional[Player] = None) -> bool:
        """Move the robber to a new tile and steal a resource if applicable."""
        # Find the tile at these coordinates
        target_tile = None
        for tile in self.game_board.tiles:
            if tile.get_coordinates() == tile_coords:
                target_tile = tile
                break

        if not target_tile:
            return False

        # Move the robber
        for tile in self.game_board.tiles:
            tile.is_robber_placed = False
        target_tile.is_robber_placed = True

        # Handle stealing
        if player_to_steal_from and player_to_steal_from != self.current_player:
            if player_to_steal_from.get_resource_count() > 0:
                # Get all available resources the player has
                available_resources = []
                for resource, amount in player_to_steal_from.player_resources.resources.items():
                    if resource != Resource.DESERT and amount > 0:
                        available_resources.extend([resource] * amount)

                if available_resources:
                    import random
                    stolen_resource = random.choice(available_resources)
                    player_to_steal_from.remove_resource(stolen_resource, 1)
                    self.current_player.add_resource(stolen_resource, 1)

        self.current_game_phase = GamePhase.MAIN
        return True

    def _distribute_resources(self, dice_value: int):
        """Distribute resources to players based on the dice roll."""
        active_tiles = [tile for tile in self.game_board.tiles
                        if tile.number == dice_value and not tile.is_robber_placed]

        for tile in active_tiles:
            resource = tile.get_resource()
            if resource == Resource.DESERT:
                continue

            tile_coords = tile.get_coordinates()

            for vertex_key in self.game_board.vertices:
                vertex = self.game_board.vertices[vertex_key]

                if tile_coords in vertex.tiles and vertex.building is not None:
                    player = vertex.building.player
                    if vertex.building.building_type == BuildingType.SETTLEMENT:
                        player.add_resource(resource, 1)
                    elif vertex.building.building_type == BuildingType.CITY:
                        player.add_resource(resource, 2)

    def place_settlement_in_setup(self, player: Player, vertex_coords: set[tuple[int, int, int]]) -> bool:
        """Place a settlement during the setup phase."""
        if self.current_game_phase != GamePhase.SETUP or player != self.current_player:
            return False

        settlement = Building(BuildingType.SETTLEMENT, player)
        result = self.game_board.place_building(settlement, vertex_coords)

        if result:
            player.settlements_left -= 1
            player.victory_points += 1
            self.setup_settlements_placed += 1

            if self.setup_settlements_placed > len(self.players):
                self._give_initial_resources(vertex_coords)

        return result

    def _give_initial_resources(self, vertex_coords: set[tuple[int, int, int]]):
        """Give initial resources to players based on their second settlement."""
        vertex_key = frozenset(vertex_coords)
        if vertex_key in self.game_board.vertices:
            vertex = self.game_board.vertices[vertex_key]
            player = vertex.building.player

            for tile_coords in vertex.tiles:
                for tile in self.game_board.tiles:
                    if tile.get_coordinates() == tile_coords:
                        resource = tile.get_resource()
                        if resource != Resource.DESERT:
                            player.add_resource(resource, 1)

    def place_road_in_setup(self, player: Player, edge_coords: set[tuple[int, int, int]]) -> bool:
        """Place a road during the setup phase."""
        if self.current_game_phase != GamePhase.SETUP or player != self.current_player:
            return False

        road = Road(player)
        result = self.game_board.place_road(road, edge_coords)

        if result:
            player.roads_left -= 1
            self.setup_roads_placed += 1

            if self.setup_roads_placed == self.setup_settlements_placed:
                if self.setup_settlements_placed == 2 * len(self.players):
                    self.current_game_phase = GamePhase.ROLL_DICE
                    self.current_player_index = 0
                else:
                    self.next_player()

        return result

    def build_settlement(self, player: Player, vertex_coords: set[tuple[int, int, int]]) -> bool:
        """Build a settlement during the main phase."""
        if self.current_game_phase != GamePhase.MAIN or player != self.current_player:
            return False

        if not player.can_afford_building(BuildingType.SETTLEMENT):
            return False

        # Check if there's a connected road
        vertex_key = frozenset(vertex_coords)
        if not self.game_board._has_connected_road(vertex_key, player):
            return False

        settlement = Building(BuildingType.SETTLEMENT, player)
        result = self.game_board.place_building(settlement, vertex_coords)

        if result:
            player.pay_for_building(BuildingType.SETTLEMENT)
            player.settlements_left -= 1
            player.victory_points += 1
            self._check_for_winner(player)
            return True

        return False

    def build_city(self, player: Player, vertex_coords: set[tuple[int, int, int]]) -> bool:
        """Upgrade a settlement to a city during the main phase."""
        if self.current_game_phase != GamePhase.MAIN or player != self.current_player:
            return False

        if not player.can_afford_building(BuildingType.CITY):
            return False

        vertex_key = frozenset(vertex_coords)
        if (vertex_key not in self.game_board.vertices or
                self.game_board.vertices[vertex_key].building is None or
                self.game_board.vertices[vertex_key].building.player != player or
                self.game_board.vertices[vertex_key].building.building_type != BuildingType.SETTLEMENT):
            return False

        city = Building(BuildingType.CITY, player)
        result = self.game_board.place_building(city, vertex_coords)

        if result:
            player.pay_for_building(BuildingType.CITY)
            player.cities_left -= 1
            player.settlements_left += 1  # Return the settlement to the player's supply
            player.victory_points += 1  # +1 point for upgrading settlement to city
            self._check_for_winner(player)
            return True

        return False

    def build_road(self, player: Player, edge_coords: set[tuple[int, int, int]]) -> bool:
        """Build a road during the main phase."""
        if self.current_game_phase != GamePhase.MAIN or player != self.current_player:
            return False

        if not player.can_afford_road():
            return False

        # Check if the road connects to an existing road or settlement/city
        edge_key = frozenset(edge_coords)
        if not self.game_board._has_adjacent_building_or_road(edge_key, player):
            return False

        road = Road(player)
        result = self.game_board.place_road(road, edge_coords)

        if result:
            player.pay_for_road()
            player.roads_left -= 1

            # Check for longest road
            self._update_longest_road()
            self._check_for_winner(player)
            return True

        return False

    def buy_development_card(self, player: Player) -> Optional[str]:
        """Buy a development card."""
        if self.current_game_phase != GamePhase.MAIN or player != self.current_player:
            return None

        if not player.can_afford_dev_card() or not self.development_cards:
            return None

        player.pay_for_development_card()
        card = self.development_cards.pop()

        if card == "VICTORY_POINT":
            player.add_victory_point(hidden=True)
            self._check_for_winner(player)

        return card

    def play_development_card(self, player: Player, card_type: str, **kwargs) -> bool:
        """Play a development card."""
        if self.current_game_phase != GamePhase.MAIN or player != self.current_player:
            return False

        if self.dev_card_played_this_turn:
            return False

        if card_type == "KNIGHT":
            # Move the robber and steal a card
            tile_coords = kwargs.get('tile_coords')
            player_to_steal_from = kwargs.get('player_to_steal_from')

            if not tile_coords:
                return False

            result = self.move_robber(tile_coords, player_to_steal_from)
            if result:
                self.dev_card_played_this_turn = True
                player.knights_played += 1
                self._update_largest_army(player)
                return True

        elif card_type == "ROAD_BUILDING":
            # Build 2 roads for free
            edge_coords1 = kwargs.get('edge_coords1')
            edge_coords2 = kwargs.get('edge_coords2')

            if not edge_coords1 or not edge_coords2:
                return False

            # Temporarily ignore resource costs
            original_can_afford = player.can_afford_road
            player.can_afford_road = lambda: True

            result1 = self.build_road(player, edge_coords1)
            result2 = False
            if result1:
                result2 = self.build_road(player, edge_coords2)

            # Restore original method
            player.can_afford_road = original_can_afford

            if result1 and result2:
                self.dev_card_played_this_turn = True
                return True

        elif card_type == "YEAR_OF_PLENTY":
            # Take 2 resource cards from the bank
            resource1 = kwargs.get('resource1')
            resource2 = kwargs.get('resource2')

            if not resource1 or not resource2:
                return False

            player.add_resource(resource1, 1)
            player.add_resource(resource2, 1)
            self.dev_card_played_this_turn = True
            return True

        elif card_type == "MONOPOLY":
            # Take all resource cards of one type from all other players
            resource = kwargs.get('resource')

            if not resource:
                return False

            total_stolen = 0
            for other_player in self.players:
                if other_player != player:
                    amount = other_player.player_resources.resources[resource]
                    if amount > 0:
                        other_player.player_resources.resources[resource] = 0
                        total_stolen += amount

            player.add_resource(resource, total_stolen)
            self.dev_card_played_this_turn = True
            return True

        return False

    def _update_largest_army(self, player: Player):
        """Update the largest army status."""
        if player.knights_played > self.largest_army_size:
            # Remove the bonus from the previous holder
            if self.player_with_largest_army:
                self.player_with_largest_army.largest_army = False

            # Give the bonus to the new holder
            self.player_with_largest_army = player
            player.largest_army = True
            self.largest_army_size = player.knights_played

    def _update_longest_road(self):
        """Update the longest road status."""
        # This is a complex calculation that requires traversing the road network
        # For simplicity, we'll assume this is implemented elsewhere
        # Here we would update self.player_with_longest_road and self.longest_road_length
        pass

    def propose_trade(self, player: Player, offer: Dict[Resource, int], request: Dict[Resource, int]) -> bool:
        """Propose a trade with other players."""
        if self.current_game_phase != GamePhase.MAIN or player != self.current_player:
            return False

        # Check if player has the resources they're offering
        for resource, amount in offer.items():
            if player.player_resources.resources[resource] < amount:
                return False

        self.current_trade_offer = TradeOffer(player, offer, request)
        return True

    def accept_trade(self, player: Player) -> bool:
        """Accept a proposed trade."""
        if not self.current_trade_offer or player == self.current_trade_offer.offering_player:
            return False

        # Check if accepting player has the requested resources
        for resource, amount in self.current_trade_offer.resources_requested.items():
            if player.player_resources.resources[resource] < amount:
                return False

        # Execute the trade
        offering_player = self.current_trade_offer.offering_player

        # Give offered resources to accepting player
        for resource, amount in self.current_trade_offer.resources_offered.items():
            offering_player.remove_resource(resource, amount)
            player.add_resource(resource, amount)

        # Give requested resources to offering player
        for resource, amount in self.current_trade_offer.resources_requested.items():
            player.remove_resource(resource, amount)
            offering_player.add_resource(resource, amount)

        self.current_trade_offer = None
        return True

    def cancel_trade(self):
        """Cancel the current trade offer."""
        self.current_trade_offer = None

    def maritime_trade(self, player: Player, give_resource: Resource, get_resource: Resource, ratio: int = 4) -> bool:
        """Execute a maritime trade with the bank."""
        if self.current_game_phase != GamePhase.MAIN or player != self.current_player:
            return False

        if player.player_resources.resources[give_resource] < ratio:
            return False

        player.remove_resource(give_resource, ratio)
        player.add_resource(get_resource, 1)
        return True

    def end_turn(self):
        """End the current player's turn."""
        if self.current_game_phase in [GamePhase.MAIN, GamePhase.END_TURN]:
            self.current_game_phase = GamePhase.END_TURN
            self.next_player()

    def _check_for_winner(self, player: Player) -> bool:
        """Check if a player has won the game."""
        return player.has_won(self.config.points_to_win)

    def get_game_state(self):
        """Return a dictionary representing the current game state."""
        return {
            "current_player": self.current_player_index,
            "current_phase": self.current_game_phase.value,
            "round": self.round,
            "dice_value": self.dice_value,
            "players": [
                {
                    "color": player.color.value,
                    "public_victory_points": player.victory_points,
                    "total_victory_points": player.get_victory_points(),
                    "resource_count": player.get_resource_count(),
                    "settlements_left": player.settlements_left,
                    "cities_left": player.cities_left,
                    "roads_left": player.roads_left,
                    "has_longest_road": player.longest_road,
                    "has_largest_army": player.largest_army
                }
                for player in self.players
            ]
        }