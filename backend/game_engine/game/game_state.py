# backend/game_engine/game/game_state.py
from game_engine.common.game_config import GameConfig
from game_engine.player.player import Player
from game_engine.common.resources import Resource
from typing import List, Dict, Tuple, Union
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

    # ========== NOWE METODY Z INDEKSAMI ==========

    def place_settlement_by_id(self, player: Player, vertex_id: int, is_setup: bool = False) -> bool:
        """
        Postaw osadę używając ID wierzchołka
        """
        try:
            print(f"Placing settlement for player {player.id} at vertex {vertex_id}")

            # Sprawdź czy można postawić osadę
            result = self.game_board.place_settlement(vertex_id, player, is_setup)
            
            if result:
                # Aktualizuj statystyki gracza
                player.settlements_left -= 1
                player.victory_points += 1

                # Aktualizuj licznik postawionych osad w fazie setup
                if is_setup:
                    if not hasattr(self, 'setup_placed'):
                        self.setup_placed = {}
                    if player.id not in self.setup_placed:
                        self.setup_placed[player.id] = [0, 0]
                    self.setup_placed[player.id][0] += 1

                    print(f"Setup progress for player {player.id}: {self.setup_placed[player.id]}")

                    # Sprawdź czy druga osada - przyznaj zasoby
                    if self.setup_placed[player.id][0] == 2:
                        print("Second settlement placed, assigning initial resources")
                        self._assign_initial_resources_for_vertex(player, vertex_id)

                # Sprawdź ogólny postęp fazy setup
                if hasattr(self, 'check_setup_progress'):
                    self.check_setup_progress()

                return True
            
            return False

        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Error in place_settlement_by_id: {str(e)}")
            return False

    def place_road_by_id(self, player: Player, edge_id: int, is_setup: bool = False) -> bool:
        """
        Postaw drogę używając ID krawędzi
        """
        try:
            print(f"Placing road for player {player.id} at edge {edge_id}")

            # Sprawdź czy można postawić drogę
            result = self.game_board.place_road(edge_id, player, is_setup)
            
            if result:
                # Aktualizuj statystyki gracza
                player.roads_left -= 1

                # Aktualizuj licznik postawionych dróg w fazie setup
                if is_setup:
                    if not hasattr(self, 'setup_placed'):
                        self.setup_placed = {}
                    if player.id not in self.setup_placed:
                        self.setup_placed[player.id] = [0, 0]
                    self.setup_placed[player.id][1] += 1

                    print(f"Setup progress for player {player.id}: {self.setup_placed[player.id]}")

                # Sprawdź ogólny postęp fazy setup
                if hasattr(self, 'check_setup_progress'):
                    self.check_setup_progress()

                return True
            
            return False

        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Error in place_road_by_id: {str(e)}")
            return False

    def place_city_by_id(self, player: Player, vertex_id: int) -> bool:
        """
        Ulepsz osadę do miasta używając ID wierzchołka
        """
        try:
            print(f"Upgrading settlement to city for player {player.id} at vertex {vertex_id}")

            result = self.game_board.place_city(vertex_id, player)
            
            if result:
                # Aktualizuj statystyki gracza
                player.cities_left -= 1
                player.settlements_left += 1  # Zwróć osadę do puli
                player.victory_points += 1   # +1 punkt za ulepszenie

                return True
            
            return False

        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Error in place_city_by_id: {str(e)}")
            return False

    # ========== KONWERSJE Z FRONTENDU ==========

# backend/game_engine/game/game_state.py - DODAJ DEBUG do place_settlement_by_tile_coords

    def place_settlement_by_tile_coords(self, player: Player, tile_coords: Tuple[int, int, int], 
                                    corner_index: int, is_setup: bool = False) -> bool:
        """
        Postaw osadę na podstawie współrzędnych kafelka i indeksu narożnika
        """
        print(f"=== BACKEND COMPREHENSIVE DEBUG ===")
        print(f"Player: {player.id}")
        print(f"Tile coords: {tile_coords}")
        print(f"Corner index: {corner_index}")
        
        # ========== SPRAWDŹ BACKEND GEOMETRY ==========
        
        q, r, s = tile_coords
        print(f"Tile coordinates: q={q}, r={r}, s={s}")
        
        # Backend corner offsets (MUSZĄ być identyczne z frontendem!)
        backend_corner_offsets = [
            # (0, -1, 1),   # 0: North
            # (1, -1, 0),   # 1: North-East  
            # (1, 0, -1),   # 2: South-East
            # (0, 1, -1),   # 3: South
            # (-1, 1, 0),   # 4: South-West
            # (-1, 0, 1),   # 5: North-West

            (0, -1, 1),   # 0: North (30°)
    (1, -1, 0),   # 1: North-East (90°) 
    (1, 0, -1),   # 2: South-East (150°)
    (0, 1, -1),   # 3: South (210°)
    (-1, 1, 0),   # 4: South-West (270°)
    (-1, 0, 1),   # 5: North-West (330°)
        ]
        
        if corner_index < len(backend_corner_offsets):
            dq, dr, ds = backend_corner_offsets[corner_index]
            expected_vertex_pos = (q + dq, r + dr, s + ds)
            print(f"BACKEND EXPECTS vertex at position: {expected_vertex_pos}")
            
            # Sprawdź które kafelki POWINNY mieć ten wierzchołek (według backendu)
            backend_expected_tiles = []
            
            for tile_id, tile in enumerate(self.game_board.tiles):
                tile_q, tile_r, tile_s = tile.get_coordinates()
                
                # Sprawdź wszystkie 6 narożników tego kafelka
                for check_corner_idx, (check_dq, check_dr, check_ds) in enumerate(backend_corner_offsets):
                    check_vertex_pos = (tile_q + check_dq, tile_r + check_dr, tile_s + check_ds)
                    
                    if check_vertex_pos == expected_vertex_pos:
                        backend_expected_tiles.append({
                            'tile_id': tile_id,
                            'tile_coords': (tile_q, tile_r, tile_s),
                            'corner_index': check_corner_idx
                        })
            
            print(f"BACKEND THEORY: This vertex should belong to tiles:")
            for tile_info in backend_expected_tiles:
                print(f"  Tile {tile_info['tile_id']} {tile_info['tile_coords']}, corner {tile_info['corner_index']}")
        
        # ========== SPRAWDŹ CO BACKEND FAKTYCZNIE MA ==========
        
        tile_id = self.game_board.get_tile_id_by_coords(tile_coords)
        if tile_id is None:
            print(f"❌ Tile not found at coordinates {tile_coords}")
            return False
        
        print(f"✅ Found tile_id: {tile_id}")
        
        vertex_id = self.game_board.find_vertex_by_tile_and_corner(tile_id, corner_index)
        if vertex_id is None:
            print(f"❌ Vertex not found for tile {tile_id}, corner {corner_index}")
            
            # Debug: pokaż jakie vertex_ids są dostępne dla tego kafelka
            available_vertices = self.game_board.get_vertices_for_tile(tile_id)
            print(f"Available vertices for tile {tile_id}: {available_vertices}")
            
            return False
        
        print(f"✅ Found vertex_id: {vertex_id}")
        
        # Sprawdź co vertex faktycznie zawiera
        if vertex_id < len(self.game_board.vertices):
            vertex = self.game_board.vertices[vertex_id]
            print(f"BACKEND ACTUAL vertex {vertex_id} adjacent tiles: {vertex.adjacent_tiles}")
            
            print(f"BACKEND ACTUAL adjacent tile coordinates:")
            for adj_tile_id in vertex.adjacent_tiles:
                if adj_tile_id < len(self.game_board.tiles):
                    adj_tile = self.game_board.tiles[adj_tile_id]
                    adj_coords = adj_tile.get_coordinates()
                    print(f"  Tile {adj_tile_id}: {adj_coords}")
        
        # ========== PORÓWNAJ BACKEND Z OCZEKIWANIAMI ==========
        
        print(f"COMPARISON:")
        print(f"  Frontend sent: tile {tile_coords}, corner {corner_index}")
        print(f"  Backend found: vertex_id {vertex_id}")
        print(f"  Backend maps this vertex to tiles: {[self.game_board.tiles[t].get_coordinates() for t in vertex.adjacent_tiles if t < len(self.game_board.tiles)]}")
        
        # Postaw osadę
        result = self.place_settlement_by_id(player, vertex_id, is_setup)
        print(f"Settlement placement result: {result}")
        print("=== END BACKEND DEBUG ===")
        return result

    def place_road_by_tile_coords(self, player: Player, tile_coords: Tuple[int, int, int], 
                                  edge_index: int, is_setup: bool = False) -> bool:
        """
        Postaw drogę na podstawie współrzędnych kafelka i indeksu krawędzi
        """
        print(f"=== PLACE ROAD ===")
        print(f"Player: {player.id}")
        print(f"Tile coords: {tile_coords}")
        print(f"Edge index: {edge_index}")
        print(f"Is setup: {is_setup}")
        
        # Znajdź tile_id na podstawie współrzędnych
        tile_id = self.game_board.get_tile_id_by_coords(tile_coords)
        if tile_id is None:
            print(f"Tile not found at coordinates {tile_coords}")
            return False
        
        print(f"Found tile_id: {tile_id}")
        
        # Znajdź edge_id na podstawie tile_id i edge_index
        edge_id = self.game_board.find_edge_by_tile_and_edge(tile_id, edge_index)
        if edge_id is None:
            print(f"Edge not found for tile {tile_id}, edge {edge_index}")
            return False
        
        print(f"Found edge_id: {edge_id}")
        
        # Postaw drogę
        result = self.place_road_by_id(player, edge_id, is_setup)
        print(f"Road placement result: {result}")
        print("==================")
        return result

    def _assign_initial_resources_for_vertex(self, player: Player, vertex_id: int):
        """Przyznaj początkowe zasoby za drugą osadę"""
        try:
            # Pobierz kafelki przylegające do tego wierzchołka
            adjacent_tile_ids = self.game_board.get_adjacent_tiles_for_vertex(vertex_id)
            
            for tile_id in adjacent_tile_ids:
                tile = self.game_board.get_tile_by_id(tile_id)
                if tile:
                    resource = tile.get_resource()
                    if resource and resource != Resource.DESERT:
                        player.add_resource(resource, 1)
                        print(f"Player {player.id} received 1 {resource} from tile {tile_id}")
        except Exception as e:
            print(f"Error assigning initial resources: {str(e)}")

    # ========== KOMPATYBILNOŚĆ ZE STARYMI METODAMI ==========

    def place_initial_settlement(self, player, vertex_coords):
        """Stara metoda - konwertuje na nowy system"""
        print(f"Legacy place_initial_settlement called with coords: {vertex_coords}")
        
        # Próbuj przekonwertować stare współrzędne na vertex_id
        if isinstance(vertex_coords, (list, set)) and len(vertex_coords) > 0:
            first_coord = next(iter(vertex_coords))
            if isinstance(first_coord, (tuple, list)) and len(first_coord) == 3:
                # Używamy pierwszej współrzędnej jako tile_coords i zakładamy corner_index = 0
                return self.place_settlement_by_tile_coords(player, tuple(first_coord), 0, is_setup=True)
        
        return False

    def place_initial_road(self, player, edge_coords):
        """Stara metoda - konwertuje na nowy system"""
        print(f"Legacy place_initial_road called with coords: {edge_coords}")
        
        # Próbuj przekonwertować stare współrzędne na edge_id
        if isinstance(edge_coords, (list, set)) and len(edge_coords) > 0:
            first_coord = next(iter(edge_coords))
            if isinstance(first_coord, (tuple, list)) and len(first_coord) == 3:
                # Używamy pierwszej współrzędnej jako tile_coords i zakładamy edge_index = 0
                return self.place_road_by_tile_coords(player, tuple(first_coord), 0, is_setup=True)
        
        return False

    def reset_game(self):
        """Reset całego stanu gry do początkowego"""
        # Wyczyść stan planszy
        for vertex in self.game_board.vertices:
            vertex.building = None

        for edge in self.game_board.edges:
            edge.road = None

        # Zresetuj stan graczy
        for player in self.players:
            player.settlements_left = self.game_config.max_settlements
            player.cities_left = self.game_config.max_cities
            player.roads_left = self.game_config.max_roads
            player.victory_points = 0
            player.hidden_victory_points = 0
            player.longest_road = False
            player.largest_army = False
            player.development_cards = []
            player.knights_played = 0
            player.harbor_bonuses = {None: 4}
            
            # Zresetuj zasoby
            for resource in player.player_resources.resources:
                player.player_resources.resources[resource] = 0

        # Zresetuj fazę gry
        self.phase = "setup"
        
        # Wyczyść słownik postępu
        self.setup_placed = {}
        
        print("Game state has been reset to initial conditions")