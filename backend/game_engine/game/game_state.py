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
        print("\n----- DIAGNOSTYKA OSAD -----")
        print(f"Gracz: {player.id}, Próbuje postawić osadę na: {vertex_coords}")
        
        # Sprawdźmy WSZYSTKIE budynki i ich właścicieli na planszy
        buildings_found = 0
        for key, vertex in self.game_board.vertices.items():
            if hasattr(vertex, 'building') and vertex.building is not None:
                buildings_found += 1
                building_player_id = "BRAK" if not hasattr(vertex.building.player, 'id') else vertex.building.player.id
                building_type = getattr(vertex.building, 'building_type', 'nieznany')
                print(f"Budynek #{buildings_found}: {building_type} należący do gracza {building_player_id} na wierzchołku {key}")
        
        if buildings_found == 0:
            print("Na planszy nie ma żadnych budynków!")
        
        # Sprawdźmy zawartość setup_placed
        if hasattr(self, 'setup_placed'):
            print(f"Zawartość setup_placed: {self.setup_placed}")
        else:
            print("Brak setup_placed w obiekcie!")
        
        # Znajdźmy istotny wierzchołek
        problem_vertex = None
        for key in self.game_board.vertices:
            if frozenset({(1, -1, 0), (0, 0, 0), (1, 0, -1)}) == key:
                problem_vertex = key
                break
        
        if problem_vertex:
            vertex = self.game_board.vertices[problem_vertex]
            has_building = hasattr(vertex, 'building') and vertex.building is not None
            print(f"Problematyczny wierzchołek znaleziony: {problem_vertex}")
            print(f"Czy ma budynek? {has_building}")
            if has_building:
                building_player_id = getattr(vertex.building.player, 'id', 'BRAK_ID')
                print(f"Należy do gracza: {building_player_id}")
        else:
            print("Problematyczny wierzchołek NIE ISTNIEJE w słowniku wierzchołków!")
        
        print("----- KONIEC DIAGNOSTYKI -----\n")
        
        # Reszta funkcji...
        print(f"DEBUG: Initial state check for player {player.id}")
        print(f"DEBUG: Player state: {vars(player)}")  # Wypisz wszystkie atrybuty gracza
        print(f"DEBUG: Game state setup info: {getattr(self, 'setup_placed', 'Not found')}")
        
        # Znajdź istniejące osady gracza
        existing_settlements = []
        for vertex_key, vertex in self.game_board.vertices.items():
            if hasattr(vertex, 'building') and vertex.building:
                if vertex.building.player.id == player.id:
                    existing_settlements.append(vertex_key)
        
        print(f"DEBUG: Actually found settlements for player: {existing_settlements}")
        
        # Sprawdź, czy mamy duplikat ID gracza
        player_ids = [p.id for p in self.players]
        print(f"DEBUG: All player IDs in game: {player_ids}")

        # Inicjalizacja śledzenia fazy setup
        if not hasattr(self, 'setup_placed'):
            self.setup_placed = {}
        
        # Zainicjuj śledzenie dla gracza, jeśli jeszcze nie istnieje
        if player.id not in self.setup_placed:
            self.setup_placed[player.id] = [0, 0]  # [osady, drogi]

        try:
            print(f"Placing initial settlement for player {player.id} at {vertex_coords}")

            # Sprawdź aktualny postęp w fazie setup
            if hasattr(self, 'setup_placed'):
                if player.id in self.setup_placed:
                    print(f"Player {player.id} setup progress: {self.setup_placed[player.id]}")
                else:
                    print(f"Player {player.id} has no setup progress yet")
            else:
                print("Game state doesn't have setup_placed attribute")

            # Sprawdź, czy gracz ma już jakieś osady
            player_settlements = []
            if hasattr(self.game_board, 'vertices'):
                for vertex_key, vertex in self.game_board.vertices.items():
                    if hasattr(vertex, 'building') and vertex.building is not None:
                        if vertex.building.player == player:
                            player_settlements.append(vertex_key)

            print(f"Player {player.id} already has settlements at: {player_settlements}")

            # Sprawdź czy istnieje wierzchołek o tych koordynatach
            if not vertex_coords:
                print("No vertex coordinates provided")
                return False

            # Weryfikacja, czy wierzchołek istnieje w tablicy wierzchołków planszy
            # Sprawdź różne możliwe formaty koordynatów
            vertex_key = None

            # Spróbuj utworzyć frozenset z przekazanych koordynatów
            if len(vertex_coords) == 1:
                # Jeśli przekazano tylko jedną współrzędną, spróbuj znaleźć pasujący wierzchołek
                single_coord = next(iter(vertex_coords))

                # Szukaj wierzchołka zawierającego tę współrzędną
                for key in self.game_board.vertices.keys():
                    # Sprawdź czy wierzchołek zawiera przekazaną współrzędną
                    if isinstance(key, frozenset) and single_coord in key:
                        vertex_key = key
                        print(f"Found matching vertex key: {vertex_key} for coordinate {single_coord}")
                        break
            else:
                # Jeśli przekazano wiele współrzędnych, spróbuj utworzyć frozenset
                try:
                    vertex_key = frozenset(vertex_coords)
                    if vertex_key in self.game_board.vertices:
                        print(f"Found exact vertex key match: {vertex_key}")
                except Exception as e:
                    print(f"Error creating vertex_key from {vertex_coords}: {str(e)}")

            # Jeśli nadal nie znaleziono klucza, spróbuj inne podejście
            if vertex_key is None or vertex_key not in self.game_board.vertices:
                print(f"Vertex key {vertex_key} not found in game_board.vertices")

                # Spróbuj znaleźć najbliższy wierzchołek
                # Pokaż dostępne wierzchołki do celów debugowania
                vertex_keys = list(self.game_board.vertices.keys())
                for i in range(min(5, len(vertex_keys))):
                    print(f"Available vertex: {vertex_keys[i]}")

                # Przekonwertuj nazwę kafelka na wierzchołek
                if isinstance(vertex_coords, set) and len(vertex_coords) == 1:
                    tile_coord = tuple(next(iter(vertex_coords)))

                    # Szukaj wierzchołków związanych z tym kafelkiem
                    for key in self.game_board.vertices.keys():
                        # Sprawdź czy wierzchołek zawiera współrzędną kafelka
                        if any(coord == tile_coord for coord in key):
                            vertex_key = key
                            print(f"Found alternative vertex key: {vertex_key} for tile coordinate {tile_coord}")
                            break

                if vertex_key is None or vertex_key not in self.game_board.vertices:
                    print(f"Could not find valid vertex for coordinates {vertex_coords}")
                    return False

            # ZMIANA KOLEJNOŚCI: Najpierw sprawdź, czy można postawić osadę
            is_setup_phase = True
            is_first_settlement = player.id not in self.setup_placed or self.setup_placed[player.id][0] == 0

            # Sprawdź, czy wierzchołek nie jest już zajęty
            vertex = self.game_board.vertices[vertex_key]
            if hasattr(vertex, 'building') and vertex.building is not None:
                print(f"Vertex {vertex_key} already has a building")
                return False

            # Sprawdź czy można tam budować (odległość od innych budynków)
            if not self.game_board.can_place_settlement(player, vertex_key, is_setup_phase=is_setup_phase):
                print(f"Cannot place settlement at {vertex_key} - not a valid location (distance rule violated)")
                return False

            # DOPIERO TERAZ tworzymy budynek i stawiamy go (po sprawdzeniu warunków)
            from game_engine.board.buildings import Building, BuildingType
            settlement = Building(BuildingType.SETTLEMENT, player)
            result = False

            try:
                # Próba postawienia budynku z użyciem metody place_building
                if hasattr(self.game_board, 'place_building'):
                    result = self.game_board.place_building(settlement, vertex_key, free=True)
                else:
                    # Alternatywne podejście, jeśli metoda place_building nie istnieje
                    vertex.building = settlement
                    result = True
            except Exception as e:
                print(f"Error placing building: {str(e)}")
                import traceback
                traceback.print_exc()
                return False

            if not result:
                print(f"Failed to place building at {vertex_key}")
                return False

            # Aktualizuj statystyki gracza
            player.settlements_left -= 1
            player.victory_points += 1

            # Aktualizuj licznik postawionych osad w fazie setup
            if not hasattr(self, 'setup_placed'):
                self.setup_placed = {}
            if player.id not in self.setup_placed:
                self.setup_placed[player.id] = [0, 0]
            self.setup_placed[player.id][0] += 1

            print(f"Successfully placed settlement for player {player.id}, progress: {self.setup_placed[player.id]}")

            # Sprawdź czy druga osada - przyznaj zasoby
            if self.setup_placed[player.id][0] == 2:
                print("Second settlement placed, assigning initial resources")
                adjacent_tiles = self.game_board.get_adjacent_tiles(vertex_key)
                for tile in adjacent_tiles:
                    resource = tile.get_resource() if hasattr(tile, 'get_resource') else None
                    if resource and hasattr(resource, 'DESERT') and resource != resource.DESERT:
                        player.add_resource(resource, 1)

            # Sprawdź ogólny postęp fazy setup
            if hasattr(self, 'check_setup_progress'):
                self.check_setup_progress()

            return True
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Error in place_initial_settlement: {str(e)}")
            return False
    
    
    # Poprawiona metoda place_initial_road
    def place_initial_road(self, player, edge_coords):
        """Postaw początkową drogę w fazie setup (bez kosztu)"""
        try:
            print(f"Placing initial road for player {player.id} at {edge_coords}")

            # Sprawdź aktualny postęp w fazie setup
            if hasattr(self, 'setup_placed'):
                if player.id in self.setup_placed:
                    print(f"Player {player.id} setup progress: {self.setup_placed[player.id]}")
                else:
                    print(f"Player {player.id} has no setup progress yet")
            else:
                print("Game state doesn't have setup_placed attribute")

            # Sprawdź, czy gracz ma już jakieś osady i drogi
            player_settlements = []
            player_roads = []

            if hasattr(self.game_board, 'vertices'):
                for vertex_key, vertex in self.game_board.vertices.items():
                    if hasattr(vertex, 'building') and vertex.building is not None:
                        if vertex.building.player == player:
                            player_settlements.append(vertex_key)

            if hasattr(self.game_board, 'edges'):
                for edge_key, edge in self.game_board.edges.items():
                    if hasattr(edge, 'road') and edge.road is not None:
                        if edge.road.player == player:
                            player_roads.append(edge_key)

            print(f"Player {player.id} has settlements at: {player_settlements}")
            print(f"Player {player.id} has roads at: {player_roads}")

            # Sprawdź czy gracz ma jakiekolwiek osady - w przeciwnym razie nie ma sensu stawiać drogi
            if not player_settlements:
                print(f"Player {player.id} doesn't have any settlements yet. Cannot place road.")
                return False

            # Sprawdź czy istnieje krawędź o tych koordynatach
            if not edge_coords:
                print("No edge coordinates provided")
                return False

            # Weryfikacja, czy krawędź istnieje w tablicy krawędzi planszy
            # Sprawdź różne możliwe formaty koordynatów
            edge_key = None

            # Spróbuj utworzyć frozenset z przekazanych koordynatów
            if len(edge_coords) == 1:
                # Jeśli przekazano tylko jedną współrzędną, spróbuj znaleźć pasującą krawędź
                single_coord = next(iter(edge_coords))

                # Szukaj krawędzi zawierającej tę współrzędną
                for key in self.game_board.edges.keys():
                    # Sprawdź czy krawędź zawiera przekazaną współrzędną
                    if isinstance(key, frozenset) and single_coord in key:
                        edge_key = key
                        print(f"Found matching edge key: {edge_key} for coordinate {single_coord}")
                        break
            else:
                # Jeśli przekazano wiele współrzędnych, spróbuj utworzyć frozenset
                try:
                    edge_key = frozenset(edge_coords)
                    if edge_key in self.game_board.edges:
                        print(f"Found exact edge key match: {edge_key}")
                except Exception as e:
                    print(f"Error creating edge_key from {edge_coords}: {str(e)}")

            # Jeśli nadal nie znaleziono klucza, spróbuj inne podejście
            if edge_key is None or edge_key not in self.game_board.edges:
                print(f"Edge key {edge_key} not found in game_board.edges")

                # Spróbuj znaleźć najbliższą krawędź
                # Pokaż dostępne krawędzie do celów debugowania
                edge_keys = list(self.game_board.edges.keys())
                for i in range(min(5, len(edge_keys))):
                    print(f"Available edge: {edge_keys[i]}")

                # Przekonwertuj nazwę kafelka na krawędź
                if isinstance(edge_coords, set) and len(edge_coords) == 1:
                    tile_coord = tuple(next(iter(edge_coords)))

                    # Szukaj krawędzi związanych z tym kafelkiem
                    for key in self.game_board.edges.keys():
                        # Sprawdź czy krawędź zawiera współrzędną kafelka
                        if any(coord == tile_coord for coord in key):
                            edge_key = key
                            print(f"Found alternative edge key: {edge_key} for tile coordinate {tile_coord}")
                            break

                if edge_key is None or edge_key not in self.game_board.edges:
                    print(f"Could not find valid edge for coordinates {edge_coords}")
                    return False

            # Pobierz krawędź i sprawdź czy jest już zajęta
            edge = self.game_board.edges[edge_key]
            if hasattr(edge, 'road') and edge.road is not None:
                print(f"Edge {edge_key} already has a road")
                return False

            # W fazie setup sprawdź, czy droga jest połączona z osadą gracza
            connected_to_settlement = False

            # Pobierz wierzchołki połączone z tą krawędzią
            if hasattr(self.game_board, 'get_edge_vertices'):
                connected_vertices = self.game_board.get_edge_vertices(edge_key)
                for vertex_key in connected_vertices:
                    if vertex_key in self.game_board.vertices:
                        vertex = self.game_board.vertices[vertex_key]
                        if hasattr(vertex,
                                   'building') and vertex.building is not None and vertex.building.player == player:
                            connected_to_settlement = True
                            print(f"Road at {edge_key} is connected to player's settlement at {vertex_key}")
                            break
            else:
                # Alternatywne podejście, jeśli metoda get_edge_vertices nie istnieje
                for vertex_key in player_settlements:
                    # Sprawdź czy krawędź jest połączona z osadą
                    # Dwa elementy planszy są połączone, jeśli mają wspólną współrzędną
                    common_coord = False
                    for edge_coord in edge_key:
                        if edge_coord in vertex_key:
                            common_coord = True
                            break

                    if common_coord:
                        connected_to_settlement = True
                        print(f"Road at {edge_key} is connected to player's settlement at {vertex_key}")
                        break

            if not connected_to_settlement:
                print(f"Road at {edge_key} is not connected to any of player's settlements")
                return False

            # Postaw drogę
            from game_engine.board.buildings import Road
            road = Road(player)
            result = False

            try:
                # Próba postawienia drogi z użyciem metody place_road
                if hasattr(self.game_board, 'place_road'):
                    result = self.game_board.place_road(road, edge_key, free=True)
                else:
                    # Alternatywne podejście, jeśli metoda place_road nie istnieje
                    edge.road = road
                    result = True
            except Exception as e:
                print(f"Error placing road: {str(e)}")
                import traceback
                traceback.print_exc()
                return False

            if not result:
                print(f"Failed to place road at {edge_key}")
                return False

            # Aktualizuj statystyki gracza
            player.roads_left -= 1

            # Aktualizuj licznik postawionych dróg w fazie setup
            if not hasattr(self, 'setup_placed'):
                self.setup_placed = {}
            if player.id not in self.setup_placed:
                self.setup_placed[player.id] = [0, 0]
            self.setup_placed[player.id][1] += 1

            print(f"Successfully placed road for player {player.id}, progress: {self.setup_placed[player.id]}")

            # Sprawdź ogólny postęp fazy setup
            if hasattr(self, 'check_setup_progress'):
                self.check_setup_progress()

            return True
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Error in place_initial_road: {str(e)}")
            return False
    def assign_initial_resources(self, player, vertex_coords):
        """Przyznaj początkowe zasoby za drugą osadę"""
        # Logika przyznawania zasobów za drugą osadę w fazie setup
        # Zazwyczaj gracz otrzymuje po 1 zasobie z każdego pola sąsiadującego z osadą
        adjacent_tiles = self.game_board.get_adjacent_tiles(vertex_coords)
        for tile in adjacent_tiles:
            resource = tile.resource
            if resource is not None:  # Nie dodawaj zasobów z pustyni
                player.add_resource(resource, 1)

    # W game_state.py lub innej odpowiedniej lokalizacji
    def reset_game(self):
        """Reset całego stanu gry do początkowego"""
        # Wyczyść stan planszy
        for vertex_key in self.game_board.vertices:
            vertex = self.game_board.vertices[vertex_key]
            vertex.building = None

        for edge_key in self.game_board.edges:
            edge = self.game_board.edges[edge_key]
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