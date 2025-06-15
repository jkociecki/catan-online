# backend/game_engine/simple/models.py - PROSTE NAPRAWIENIE
# TYLKO poprawiamy mapowanie vertex->tiles, reszta bez zmian!

from typing import Dict, List, Optional
from enum import Enum
from dataclasses import dataclass

class BuildingType(Enum):
    SETTLEMENT = "settlement"
    CITY = "city"

class Resource(Enum):
    WOOD = "WOOD"
    BRICK = "BRICK" 
    SHEEP = "SHEEP"
    WHEAT = "WHEAT"
    ORE = "ORE"

@dataclass
class GameVertex:
    """Wierzchołek z prostym ID - BEZ ZMIAN"""
    vertex_id: int
    building_type: Optional[BuildingType] = None
    player_id: Optional[str] = None
    
    def has_building(self) -> bool:
        return self.building_type is not None
    
    def is_owned_by(self, player_id: str) -> bool:
        return self.player_id == player_id

@dataclass
class GameEdge:
    """Krawędź - BEZ ZMIAN"""
    edge_id: int
    has_road: bool = False
    player_id: Optional[str] = None
    
    def is_owned_by(self, player_id: str) -> bool:
        return self.player_id == player_id

@dataclass 
class GameTile:
    """Kafelek planszy - BEZ ZMIAN"""
    tile_id: int
    resource: Optional[Resource]
    dice_number: int
    has_robber: bool = False

class GamePhase(Enum):
    SETUP = "setup"
    # ROLL_DICE = "roll_dice" 
    # MAIN = "main"
    # END_TURN = "end_turn"
    PLAYING = "playing"
    FINISHED = "FINISHED"

@dataclass
class PlayerResources:
    """Zasoby gracza - BEZ ZMIAN"""
    wood: int = 0
    brick: int = 0
    sheep: int = 0
    wheat: int = 0
    ore: int = 0
    
    def get_total(self) -> int:
        return self.wood + self.brick + self.sheep + self.wheat + self.ore
    
    def has_enough(self, cost: Dict[Resource, int]) -> bool:
        resource_map = {
            Resource.WOOD: self.wood,
            Resource.BRICK: self.brick,
            Resource.SHEEP: self.sheep,
            Resource.WHEAT: self.wheat,
            Resource.ORE: self.ore
        }
        return all(resource_map[res] >= amount for res, amount in cost.items())
    
    def subtract(self, cost: Dict[Resource, int]):
        resource_map = {
            Resource.WOOD: 'wood',
            Resource.BRICK: 'brick', 
            Resource.SHEEP: 'sheep',
            Resource.WHEAT: 'wheat',
            Resource.ORE: 'ore'
        }
        for res, amount in cost.items():
            current = getattr(self, resource_map[res])
            setattr(self, resource_map[res], current - amount)
    
    def add(self, resource: Optional[Resource], amount: int = 1):
        """Dodaj surowce"""
        if resource is None:
            return
            
        resource_map = {
            Resource.WOOD: 'wood',
            Resource.BRICK: 'brick',
            Resource.SHEEP: 'sheep', 
            Resource.WHEAT: 'wheat',
            Resource.ORE: 'ore'
        }
        if resource in resource_map:
            current = getattr(self, resource_map[resource])
            setattr(self, resource_map[resource], current + amount)

@dataclass
class SimplePlayer:
    """Gracz - BEZ ZMIAN"""
    player_id: str
    color: str
    resources: PlayerResources
    victory_points: int = 0
    settlements_left: int = 5
    cities_left: int = 4
    roads_left: int = 15
    display_name: str = ""
    
    def can_afford_settlement(self) -> bool:
        cost = {Resource.WOOD: 1, Resource.BRICK: 1, Resource.SHEEP: 1, Resource.WHEAT: 1}
        return self.settlements_left > 0 and self.resources.has_enough(cost)
    
    def can_afford_city(self) -> bool:
        cost = {Resource.WHEAT: 2, Resource.ORE: 3}
        return self.cities_left > 0 and self.resources.has_enough(cost)
    
    def can_afford_road(self) -> bool:
        cost = {Resource.WOOD: 1, Resource.BRICK: 1}
        return self.roads_left > 0 and self.resources.has_enough(cost)
    
    def pay_for_settlement(self):
        cost = {Resource.WOOD: 1, Resource.BRICK: 1, Resource.SHEEP: 1, Resource.WHEAT: 1}
        self.resources.subtract(cost)
        self.settlements_left -= 1
        self.victory_points += 1
    
    def pay_for_city(self):
        cost = {Resource.WHEAT: 2, Resource.ORE: 3}
        self.resources.subtract(cost)
        self.cities_left -= 1
        self.settlements_left += 1
        self.victory_points += 1
    
    def pay_for_road(self):
        cost = {Resource.WOOD: 1, Resource.BRICK: 1}
        self.resources.subtract(cost)
        self.roads_left -= 1

class SimpleGameState:
    """Główny stan gry - TYLKO poprawka mapowania"""
    
    def __init__(self):
        # POWRÓT DO 114 vertices (jak było wcześniej)
        self.vertices: Dict[int, GameVertex] = {}
        self.edges: Dict[int, GameEdge] = {}
        self.tiles: Dict[int, GameTile] = {}
        self.players: Dict[str, SimplePlayer] = {}
        self.phase: GamePhase = GamePhase.SETUP
        self.current_player_index: int = 0
        self.player_order: List[str] = []
        self.setup_round: int = 1
        self.setup_progress: Dict[str, Dict[str, int]] = {}
        self.player_settlements_order: Dict[str, List[int]] = {}

        self.vertex_to_tiles: Dict[int, List[int]] = {}

        self.has_rolled_dice: Dict[str, bool] = {}  # player_id -> czy rzucił kośćmi
        self.turn_phase: str = "roll"  # "roll" lub "actions"
        
        self._init_board()
    
    def _init_board(self):
        """Inicjalizuj planszę - POWRÓT DO ORYGINALNEJ WERSJI"""
        tile_data = [
            (0, None, 0),              # desert
            (1, Resource.WOOD, 6),     
            (2, Resource.SHEEP, 3),    
            (3, Resource.SHEEP, 8),    
            (4, Resource.WHEAT, 2),    
            (5, Resource.ORE, 4),      
            (6, Resource.WHEAT, 5),    
            (7, Resource.WOOD, 10),    
            (8, Resource.WOOD, 5),     
            (9, Resource.BRICK, 9),    
            (10, Resource.ORE, 6),     
            (11, Resource.WHEAT, 9),   
            (12, Resource.WHEAT, 10),  
            (13, Resource.ORE, 11),    
            (14, Resource.WOOD, 3),    
            (15, Resource.SHEEP, 12),  
            (16, Resource.BRICK, 8),   
            (17, Resource.SHEEP, 4),   
            (18, Resource.BRICK, 11),  
        ]
        
        for tile_id, resource, dice_num in tile_data:
            self.tiles[tile_id] = GameTile(tile_id, resource, dice_num)
            if dice_num == 0:
                self.tiles[tile_id].has_robber = True
        
        # POWRÓT: 114 vertices i edges
        for vertex_id in range(114):
            self.vertices[vertex_id] = GameVertex(vertex_id)
        
        for edge_id in range(114):
            self.edges[edge_id] = GameEdge(edge_id)
            
        self._init_vertex_to_tiles_mapping()
    
    def _init_vertex_to_tiles_mapping(self):
        """NOWE: Poprawione mapowanie vertex->tiles z ręcznymi poprawkami"""
        
        # Stary algorytm jako bazę
        hex_order_frontend = [
            (0, 0, 0), (0, -2, 2), (1, -2, 1), (2, -2, 0),
            (-1, -1, 2), (0, -1, 1), (1, -1, 0), (2, -1, -1),
            (-2, 0, 2), (-1, 0, 1), (1, 0, -1), (2, 0, -2),
            (-2, 1, 1), (-1, 1, 0), (0, 1, -1), (1, 1, -2),
            (-2, 2, 0), (-1, 2, -1), (0, 2, -2)
        ]
        
        hex_coords_to_tile_id = {tuple(h): i for i, h in enumerate(hex_order_frontend)}
        
        neighbor_offsets = {
            0: [(1, -1, 0), (0, -1, 1)],
            1: [(1, 0, -1), (1, -1, 0)],
            2: [(0, 1, -1), (1, 0, -1)],
            3: [(-1, 1, 0), (0, 1, -1)],
            4: [(0, -1, 1), (-1, 0, 1)],
            5: [(-1, 0, 1), (0, -1, 1)]
        }
        
        # RĘCZNE POPRAWKI dla problematycznych vertices
        manual_fixes = {
            
        }
        
        # Generuj mapowanie
        for vertex_id in range(114):
            # Sprawdź czy mamy ręczną poprawkę
            if vertex_id in manual_fixes:
                self.vertex_to_tiles[vertex_id] = manual_fixes[vertex_id]
                print(f"MANUAL FIX: Vertex {vertex_id} -> tiles {manual_fixes[vertex_id]}")
                continue
            
            # Stary algorytm
            hex_index = vertex_id // 6
            vertex_index = vertex_id % 6
            
            if hex_index >= len(hex_order_frontend):
                self.vertex_to_tiles[vertex_id] = []
                continue
            
            center_hex = hex_order_frontend[hex_index]
            adjacent_tiles = [hex_index]
            
            for dq, dr, ds in neighbor_offsets.get(vertex_index, []):
                neighbor_hex = (
                    center_hex[0] + dq,
                    center_hex[1] + dr,
                    center_hex[2] + ds
                )
                neighbor_tile_id = hex_coords_to_tile_id.get(neighbor_hex)
                if neighbor_tile_id is not None:
                    adjacent_tiles.append(neighbor_tile_id)
            
            unique_tiles = list(dict.fromkeys(adjacent_tiles))
            self.vertex_to_tiles[vertex_id] = unique_tiles
    
    # WSZYSTKIE POZOSTAŁE METODY BEZ ZMIAN - w tym place_road!
    
    def add_player(self, player_id: str, color: str, display_name: str = ""):
        """Dodaj gracza do gry"""
        final_display_name = display_name or f"Player_{player_id[:6]}"
        
        self.players[player_id] = SimplePlayer(
            player_id=player_id,
            color=color, 
            resources=PlayerResources(),
            display_name=final_display_name
        )
        
        print(f"🔍 Created player: id={player_id[:8]}, color={color}, display_name='{final_display_name}'")
        
        self.player_order.append(player_id)
        self.setup_progress[player_id] = {"settlements": 0, "roads": 0}
        self.player_settlements_order[player_id] = []
        
        if len(self.players) == 1:
            self.current_player_index = 0
            print(f"👑 Set first player {player_id[:8]} as current player (index 0)")
        
        print(f"📋 Player order: {[p[:8] for p in self.player_order]}")
        print(f"👑 Current player index: {self.current_player_index}")
    
    def get_current_player(self) -> SimplePlayer:
        player_id = self.player_order[self.current_player_index]
        return self.players[player_id]
    
    def can_place_settlement(self, vertex_id: int, player_id: str, is_setup: bool = False) -> bool:
        if vertex_id not in self.vertices:
            return False
        
        vertex = self.vertices[vertex_id]
        if vertex.has_building():
            return False
        
        if is_setup:
            return True
        
        return True
    
    def can_place_road(self, edge_id: int, player_id: str, is_setup: bool = False) -> bool:
        """PRZYWRÓCONA METODA"""
        if edge_id not in self.edges:
            return False
        
        edge = self.edges[edge_id]
        if edge.has_road:
            return False
        
        if is_setup:
            return True
        
        return True
    
    def place_settlement(self, vertex_id: int, player_id: str, is_setup: bool = False) -> bool:
        """POPRAWIONA - Place settlement z prawidłową logiką setup"""
        if not self.can_place_settlement(vertex_id, player_id, is_setup):
            return False
        
        player = self.players[player_id]
        
        if not is_setup:
            if not player.can_afford_settlement():
                return False
            player.pay_for_settlement()
        else:
            player.settlements_left -= 1
            player.victory_points += 1
        
        self.vertices[vertex_id].building_type = BuildingType.SETTLEMENT
        self.vertices[vertex_id].player_id = player_id
        
        if is_setup:
            # Zabezpiecz przed KeyError
            if player_id not in self.player_settlements_order:
                self.player_settlements_order[player_id] = []
            
            self.player_settlements_order[player_id].append(vertex_id)
            settlement_count = len(self.player_settlements_order[player_id])
            
            # POPRAWIONA LOGIKA: Daj surowce tylko za DRUGĄ osadę
            if settlement_count == 2:
                print(f"🎁 Giving initial resources for second settlement")
                self.give_initial_resources_for_second_settlement(player_id, vertex_id)
            
            # Zwiększ licznik osad w setup_progress
            self.setup_progress[player_id]["settlements"] += 1
            
            print(f"✅ Settlement placed by {player_id[:8]} at vertex {vertex_id}")
            print(f"   Progress: {self.setup_progress[player_id]}")
        
        return True
    
    def place_road(self, edge_id: int, player_id: str, is_setup: bool = False) -> bool:
        """POPRAWIONA - Place road z prawidłową logiką setup"""
        if not self.can_place_road(edge_id, player_id, is_setup):
            return False
        
        player = self.players[player_id]
        
        if not is_setup:
            if not player.can_afford_road():
                return False
            player.pay_for_road()
        else:
            player.roads_left -= 1
        
        self.edges[edge_id].has_road = True
        self.edges[edge_id].player_id = player_id
        
        if is_setup:
            self.setup_progress[player_id]["roads"] += 1
            
            print(f"✅ Road placed by {player_id[:8]} at edge {edge_id}")
            print(f"   Progress: {self.setup_progress[player_id]}")
        
        return True
    
    def give_initial_resources_for_second_settlement(self, player_id: str, second_settlement_vertex_id: int):
        """POPRAWIONA wersja z nowym mapowaniem"""
        print(f"\n=== GIVING INITIAL RESOURCES (FIXED MAPPING) ===")
        print(f"Player: {player_id}")
        print(f"Second settlement at vertex: {second_settlement_vertex_id}")
        
        player = self.players[player_id]
        
        # Użyj nowego mapowania
        adjacent_tiles = self.vertex_to_tiles.get(second_settlement_vertex_id, [])
        print(f"Adjacent tiles to vertex {second_settlement_vertex_id}: {adjacent_tiles}")
        
        resources_given = []
        for tile_id in adjacent_tiles:
            if tile_id in self.tiles:
                tile = self.tiles[tile_id]
                
                if tile.resource is None:
                    print(f"  Tile {tile_id}: DESERT")
                    continue
                    
                print(f"  Tile {tile_id}: {tile.resource.value}, dice={tile.dice_number}")
                
                if tile.dice_number > 0 and not tile.has_robber:
                    player.resources.add(tile.resource, 1)
                    resources_given.append(f"{tile.resource.value}")
                    print(f"    -> Added 1 {tile.resource.value}")
        
        print(f"Player {player_id} received: {resources_given}")
        print("=== END GIVING RESOURCES ===\n")
    
    # Dodaj wszystkie pozostałe metody (serialize, next_turn, etc.)
    # W backend/game_engine/simple/models.py - NAPRAW METODĘ SERIALIZE

# backend/game_engine/simple/models.py - DODAJ has_rolled_dice do serialize

    def serialize(self) -> dict:
        """Serializuj stan gry do JSON - DODANE has_rolled_dice"""
        print(f"🔄 Serializing game state with {len(self.players)} players")
        
        # ZAWSZE używaj obiektu (nie tablicy) dla zgodności z frontendem
        players_dict = {}
        for pid, p in self.players.items():
            print(f"🔍 Serializing player {pid[:8]}: display_name='{p.display_name}', color='{p.color}'")
            
            players_dict[pid] = {
                "player_id": p.player_id,
                "color": p.color,
                "display_name": p.display_name,
                "resources": {
                    "wood": p.resources.wood,
                    "brick": p.resources.brick,
                    "sheep": p.resources.sheep,
                    "wheat": p.resources.wheat,
                    "ore": p.resources.ore
                },
                "victory_points": p.victory_points,
                "settlements_left": p.settlements_left,
                "cities_left": p.cities_left,
                "roads_left": p.roads_left
            }
        
        serialized = {
            "vertices": {
                str(vid): {
                    "vertex_id": v.vertex_id,
                    "building_type": v.building_type.value if v.building_type else None,
                    "player_id": v.player_id
                } for vid, v in self.vertices.items() if v.has_building()
            },
            "edges": {
                str(eid): {
                    "edge_id": e.edge_id,
                    "has_road": e.has_road,
                    "player_id": e.player_id
                } for eid, e in self.edges.items() if e.has_road
            },
            "players": players_dict,
            "phase": self.phase.value,
            "current_player_index": self.current_player_index,
            "player_order": self.player_order,
            "setup_round": self.setup_round,
            "setup_progress": self.setup_progress,
            
            # ✅ DODAJ TEN STAN - kluczowe dla kontroli przycisków
            "has_rolled_dice": getattr(self, 'has_rolled_dice', {}),
            
            'is_game_over': self.is_game_over(),
            'winner': self.winner.player_id if hasattr(self, 'winner') and self.winner else None,
            'final_standings': self.get_final_standings() if self.phase == GamePhase.FINISHED else None
        }
        
        print(f"   Serialized players dict: {players_dict}")
        print(f"   Player order: {self.player_order}")
        print(f"   Has rolled dice: {getattr(self, 'has_rolled_dice', {})}")  # Debug
        
        return serialized
    
    # Dodaj resztę metod (next_turn, advance_setup_turn, etc.)...
    
    def next_turn(self):
        """Przejdź do następnej tury"""
        if self.phase == GamePhase.SETUP:
            # W setup: pierwszy round w przód, drugi w tył
            if self.setup_round == 1:
                self.current_player_index += 1
                if self.current_player_index >= len(self.player_order):
                    self.setup_round = 2
                    self.current_player_index = len(self.player_order) - 1
            else:  # setup_round == 2
                self.current_player_index -= 1
                if self.current_player_index < 0:
                    if self.is_setup_complete():
                        self.phase = GamePhase.PLAYING
                        self.current_player_index = 0
        else:
            # Normalna gra - zawsze w przód
            self.current_player_index = (self.current_player_index + 1) % len(self.player_order)
            self.phase = GamePhase.PLAYING
    
    

    def get_setup_progress(self, player_id: str) -> Dict[str, int]:
        """Pobierz postęp gracza w fazie setup"""
        if player_id not in self.setup_progress:
            self.setup_progress[player_id] = {"settlements": 0, "roads": 0}
        return self.setup_progress[player_id]

    def can_player_build_settlement_in_setup(self, player_id: str) -> bool:
        """POPRAWIONA - Sprawdź czy gracz może budować osadę w setup"""
        if not self.is_current_player(player_id):
            return False
            
        progress = self.get_setup_progress(player_id)
        
        if self.setup_round == 1:
            # Pierwsza runda: może postawić osadę jeśli nie ma jeszcze żadnej w tej rundzie
            return progress["settlements"] == 0
        else:  # setup_round == 2
            # Druga runda: może postawić drugą osadę jeśli ma już jedną (z pierwszej rundy)
            return progress["settlements"] == 1

    def can_player_build_road_in_setup(self, player_id: str) -> bool:
        """POPRAWIONA - Sprawdź czy gracz może budować drogę w setup"""
        if not self.is_current_player(player_id):
            return False
            
        progress = self.get_setup_progress(player_id)
        
        if self.setup_round == 1:
            # Pierwsza runda: może postawić drogę tylko JEŚLI ma już osadę w tej rundzie
            return progress["settlements"] >= 1 and progress["roads"] == 0
        else:  # setup_round == 2
            # Druga runda: może postawić drugą drogę JEŚLI ma już drugą osadę
            return progress["settlements"] >= 2 and progress["roads"] == 1

    def should_advance_to_next_player(self, current_player_id: str) -> bool:
        """POPRAWIONA - Sprawdź czy powinniśmy przejść do następnego gracza"""
        if not self.is_current_player(current_player_id):
            return False
            
        progress = self.get_setup_progress(current_player_id)
        
        if self.setup_round == 1:
            # W pierwszej rundzie: przejdź jeśli gracz ma 1 osadę i 1 drogę
            return progress["settlements"] >= 1 and progress["roads"] >= 1
        else:  # setup_round == 2
            # W drugiej rundzie: przejdź jeśli gracz ma 2 osady i 2 drogi
            return progress["settlements"] >= 2 and progress["roads"] >= 2

    def advance_setup_turn(self):
        """POPRAWIONA - Przejdź do następnego gracza w fazie setup"""
        print(f"\n=== ADVANCE SETUP TURN ===")
        print(f"BEFORE: round={self.setup_round}, current_index={self.current_player_index}")
        print(f"Player order: {[p[:8] for p in self.player_order]}")
        
        if self.setup_round == 1:
            # Pierwsza runda: w przód (0->1->2->3)
            self.current_player_index += 1
            if self.current_player_index >= len(self.player_order):
                # Koniec pierwszej rundy, rozpocznij drugą rundę
                print("🔄 Ending round 1, starting round 2")
                self.setup_round = 2
                self.current_player_index = len(self.player_order) - 1  # Zacznij od ostatniego gracza
        else:  # setup_round == 2
            # Druga runda: w tył (3->2->1->0)
            self.current_player_index -= 1
            if self.current_player_index < 0:
                # Koniec fazy setup
                print("🏁 Setup phase complete!")
                if self.is_setup_complete():
                    print("✅ All players completed setup, moving to main game")
                    self.phase = GamePhase.PLAYING
                    self.current_player_index = 0  # Rozpocznij grę od pierwszego gracza
                    
                    # Zresetuj flagi rzutu kości dla wszystkich graczy
                    for player_id in self.player_order:
                        self.has_rolled_dice[player_id] = False
                else:
                    # Coś poszło nie tak, resetuj
                    print("❌ Setup not complete, resetting to first player")
                    self.current_player_index = 0
        
        current_player = self.get_current_player()
        print(f"AFTER: round={self.setup_round}, current_index={self.current_player_index}, phase={self.phase}")
        print(f"Current player: {current_player.player_id[:8]}")
        print("=== END ADVANCE ===\n")

    def distribute_resources_for_dice_roll(self, dice_value: int):
      """Rozdaj surowce za rzut kością - dla głównej gry"""
      print(f"\n=== DISTRIBUTING RESOURCES FOR DICE {dice_value} ===")
      
      # Znajdź wszystkie kafelki z tym numerem bez robbera
      active_tiles = []
      for tile_id, tile in self.tiles.items():
          if tile.dice_number == dice_value and not tile.has_robber and tile.resource is not None:
              active_tiles.append(tile_id)
      
      print(f"Active tiles for dice {dice_value}: {active_tiles}")
      
      # Dla każdego aktywnego kafelka, znajdź sąsiadujące osady/miasta
      for tile_id in active_tiles:
          tile = self.tiles[tile_id]
          print(f"\nProcessing tile {tile_id} ({tile.resource.value})")
          
          # Znajdź wszystkie wierzchołki sąsiadujące z tym kafelkiem
          vertices_for_tile = []
          for vertex_id, adjacent_tiles in self.vertex_to_tiles.items():
              if tile_id in adjacent_tiles:
                  vertices_for_tile.append(vertex_id)
          
          print(f"  Vertices adjacent to tile {tile_id}: {vertices_for_tile}")
          
          # Sprawdź które wierzchołki mają budynki
          for vertex_id in vertices_for_tile:
              vertex = self.vertices[vertex_id]
              if vertex.has_building() and vertex.player_id:
                  player = self.players[vertex.player_id]
                  
                  # Daj surowce: 1 za osadę, 2 za miasto
                  resource_amount = 2 if vertex.building_type == BuildingType.CITY else 1
                  player.resources.add(tile.resource, resource_amount)
                  
                  building_type = "CITY" if vertex.building_type == BuildingType.CITY else "SETTLEMENT"
                  print(f"    -> Player {vertex.player_id} gets {resource_amount} {tile.resource.value} from {building_type} at vertex {vertex_id}")
      
      print("=== END RESOURCE DISTRIBUTION ===\n")

    def is_setup_complete(self) -> bool:
        """Sprawdź czy setup jest zakończony - wszyscy gracze mają 2 osady i 2 drogi"""
        print("🔍 Checking if setup is complete:")
        for player_id in self.player_order:
            progress = self.setup_progress.get(player_id, {"settlements": 0, "roads": 0})
            print(f"  Player {player_id[:8]}: settlements={progress['settlements']}, roads={progress['roads']}")
            if progress["settlements"] < 2 or progress["roads"] < 2:
                print(f"  ❌ Player {player_id[:8]} not complete")
                return False
        print("✅ All players completed setup!")
        return True

    def give_initial_resources_for_second_settlement(self, player_id: str, second_settlement_vertex_id: int):
      """Daj początkowe surowce za drugą osadę - POPRAWIONA WERSJA"""
      print(f"\n=== GIVING INITIAL RESOURCES ===")
      print(f"Player: {player_id}")
      print(f"Second settlement at vertex: {second_settlement_vertex_id}")
      
      player = self.players[player_id]
      
      # SPRAWDŹ czy już dawano surowce (zabezpieczenie)
      if hasattr(self, '_initial_resources_given'):
          if player_id in self._initial_resources_given:
              print(f"WARNING: Initial resources already given to {player_id}")
              return
      else:
          self._initial_resources_given = set()
      
      # Pobierz sąsiadujące kafelki
      adjacent_tiles = self.vertex_to_tiles.get(second_settlement_vertex_id, [])
      print(f"Adjacent tiles to vertex {second_settlement_vertex_id}: {adjacent_tiles}")
      
      if not adjacent_tiles:
          print(f"WARNING: No adjacent tiles found for vertex {second_settlement_vertex_id}")
          return
      
      resources_given = []
      for tile_id in adjacent_tiles:
          if tile_id in self.tiles:
              tile = self.tiles[tile_id]
              
              # KLUCZOWA POPRAWKA: Sprawdź czy tile ma surowiec
              if tile.resource is None:
                  print(f"  Tile {tile_id}: DESERT (no resource)")
                  continue
                  
              print(f"  Tile {tile_id}: {tile.resource.value}, dice={tile.dice_number}")
              
              # Nie dawaj surowców z pustyni/robbera (dice_number = 0) lub z robberem
              if tile.dice_number > 0 and not tile.has_robber and tile.resource is not None:
                  player.resources.add(tile.resource, 1)
                  resources_given.append(f"{tile.resource.value}")
                  print(f"    -> Added 1 {tile.resource.value}")
              else:
                  print(f"    -> Skipped (desert/robber, dice={tile.dice_number}, robber={tile.has_robber})")
          else:
              print(f"  WARNING: Tile {tile_id} not found in tiles dict")
      
      # Zaznacz że dano surowce
      self._initial_resources_given.add(player_id)
      
      print(f"Player {player_id} received: {resources_given}")
      print(f"Final resources: Wood={player.resources.wood}, Brick={player.resources.brick}, Sheep={player.resources.sheep}, Wheat={player.resources.wheat}, Ore={player.resources.ore}")
      print("=== END GIVING RESOURCES ===\n")

    def distribute_resources_for_dice_roll(self, dice_value: int):
      """Rozdaj surowce za rzut kością - dla głównej gry"""
      print(f"\n=== DISTRIBUTING RESOURCES FOR DICE {dice_value} ===")
      
      # Znajdź wszystkie kafelki z tym numerem bez robbera
      active_tiles = []
      for tile_id, tile in self.tiles.items():
          if tile.dice_number == dice_value and not tile.has_robber and tile.resource is not None:
              active_tiles.append(tile_id)
      
      print(f"Active tiles for dice {dice_value}: {active_tiles}")
      
      # Dla każdego aktywnego kafelka, znajdź sąsiadujące osady/miasta
      for tile_id in active_tiles:
          tile = self.tiles[tile_id]
          print(f"\nProcessing tile {tile_id} ({tile.resource.value})")
          
          # Znajdź wszystkie wierzchołki sąsiadujące z tym kafelkiem
          vertices_for_tile = []
          for vertex_id, adjacent_tiles in self.vertex_to_tiles.items():
              if tile_id in adjacent_tiles:
                  vertices_for_tile.append(vertex_id)
          
          print(f"  Vertices adjacent to tile {tile_id}: {vertices_for_tile}")
          
          # Sprawdź które wierzchołki mają budynki
          for vertex_id in vertices_for_tile:
              vertex = self.vertices[vertex_id]
              if vertex.has_building() and vertex.player_id:
                  player = self.players[vertex.player_id]
                  
                  # Daj surowce: 1 za osadę, 2 za miasto
                  resource_amount = 2 if vertex.building_type == BuildingType.CITY else 1
                  player.resources.add(tile.resource, resource_amount)
                  
                  building_type = "CITY" if vertex.building_type == BuildingType.CITY else "SETTLEMENT"
                  print(f"    -> Player {vertex.player_id} gets {resource_amount} {tile.resource.value} from {building_type} at vertex {vertex_id}")
      
      print("=== END RESOURCE DISTRIBUTION ===\n")

    def find_last_settlement_by_player(self, player_id: str) -> Optional[int]:
        """Znajdź ID ostatnio postawionej osady przez gracza"""
        # W prawdziwej implementacji śledziłbyś kolejność budowania
        # Na razie zwróć pierwsze znalezione
        for vertex_id, vertex in self.vertices.items():
            if vertex.has_building() and vertex.player_id == player_id:
                return vertex_id
        return None
    
    # backend/game_engine/simple/models.py - DODAJ DO KLASY SimpleGameState

    def end_turn(self):
        """Zakończ turę i przejdź do następnego gracza"""
        if self.phase == GamePhase.PLAYING:
            self.current_player_index = (self.current_player_index + 1) % len(self.player_order)
            # ✅ ZOSTAŃ w fazie PLAYING - nie zmieniaj na ROLL_DICE
            print(f"Turn ended, next player index: {self.current_player_index}, phase: {self.phase}")

    def has_player_rolled_dice(self, player_id: str) -> bool:
        """Sprawdź czy gracz już rzucił kośćmi w tej turze"""
        if not hasattr(self, 'has_rolled_dice'):
            self.has_rolled_dice = {}
        return self.has_rolled_dice.get(player_id, False)

    def mark_player_rolled_dice(self, player_id: str):
        """Oznacz że gracz rzucił kośćmi"""
        if not hasattr(self, 'has_rolled_dice'):
            self.has_rolled_dice = {}
        self.has_rolled_dice[player_id] = True

    def reset_player_dice_roll(self, player_id: str):
        """Resetuj flagę rzutu kości dla gracza"""
        if not hasattr(self, 'has_rolled_dice'):
            self.has_rolled_dice = {}
        self.has_rolled_dice[player_id] = False


    def debug_vertex_mapping(self):
        """Debug: Pokaż mapowanie wierzchołków"""
        print("=== VERTEX MAPPING DEBUG ===")
        
        # Pokaż hex_order_frontend
        hex_order_frontend = [
            (0, 0, 0),     # index 0 - desert
            (0, -2, 2),    # index 1 - wood, dice 6  
            (1, -2, 1),    # index 2 - sheep, dice 3
            (2, -2, 0),    # index 3 - sheep, dice 8
            (-1, -1, 2),   # index 4 - wheat, dice 2
            (0, -1, 1),    # index 5 - ore, dice 4
            (1, -1, 0),    # index 6 - wheat, dice 5
            (2, -1, -1),   # index 7 - wood, dice 10
            (-2, 0, 2),    # index 8 - wood, dice 5
            (-1, 0, 1),    # index 9 - brick, dice 9
            (1, 0, -1),    # index 10 - ore, dice 6
            (2, 0, -2),    # index 11 - wheat, dice 9
            (-2, 1, 1),    # index 12 - wheat, dice 10
            (-1, 1, 0),    # index 13 - ore, dice 11
            (0, 1, -1),    # index 14 - wood, dice 3
            (1, 1, -2),    # index 15 - sheep, dice 12
            (-2, 2, 0),    # index 16 - brick, dice 8
            (-1, 2, -1),   # index 17 - sheep, dice 4
            (0, 2, -2),    # index 18 - brick, dice 11
        ]
        
        print("Hex order (backend):")
        for i, (q, r, s) in enumerate(hex_order_frontend):
            print(f"  {i}: ({q}, {r}, {s})")
        
        print("\nVertex to tiles mapping (first 30):")
        for vertex_id in range(min(30, len(self.vertex_to_tiles))):
            tiles = self.vertex_to_tiles.get(vertex_id, [])
            hex_index = vertex_id // 6
            vertex_index = vertex_id % 6
            print(f"  Vertex {vertex_id} (hex {hex_index}, vertex {vertex_index}): tiles {tiles}")
        
        print("=== END DEBUG ===")

    # UŻYCIE w kodzie serwera:
    # game_state.debug_vertex_mapping()

    def resolve_name_conflict(self, desired_name: str) -> str:
        """Rozwiąż konflikt nazwy gracza"""
        existing_names = [p.display_name for p in self.players.values() if hasattr(p, 'display_name')]
        
        if desired_name not in existing_names:
            return desired_name
        
        counter = 1
        while f"{desired_name}_{counter}" in existing_names:
            counter += 1
        
        return f"{desired_name}_{counter}"

    def resolve_color_conflict(self, desired_color: str) -> str:
        """Rozwiąż konflikt koloru gracza"""
        used_colors = [p.color for p in self.players.values()]
        
        if desired_color not in used_colors:
            return desired_color
        
        # Lista dostępnych kolorów
        available_colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown']
        
        for color in available_colors:
            if color not in used_colors:
                return color
        
        # Jeśli wszystkie kolory zajęte, dodaj numer
        return f"{desired_color}_{len(used_colors)}"


    def place_city(self, vertex_id: int, player_id: str) -> bool:
        """Zbuduj miasto na miejscu osady (upgrade osady na miasto)"""
        if vertex_id not in self.vertices:
            return False
        
        vertex = self.vertices[vertex_id]
        
        # Musi być osada tego gracza
        if vertex.building_type != BuildingType.SETTLEMENT or vertex.player_id != player_id:
            return False
        
        player = self.players[player_id]
        
        # Sprawdź czy gracz może sobie pozwolić na miasto
        if not player.can_afford_city():
            return False
        
        # Zapłać za miasto
        player.pay_for_city()
        
        # Zmień budynek na miasto
        vertex.building_type = BuildingType.CITY
        
        print(f"✅ Player {player_id} upgraded settlement to city at vertex {vertex_id}")
        return True

    def seed_resources_for_testing(self):
        """Daj wszystkim graczom sporo zasobów do testowania"""
        print("🎯 SEEDING RESOURCES FOR TESTING")
        
        for player_id, player in self.players.items():
            # Daj po 5 każdego zasobu
            player.resources.wood += 5
            player.resources.brick += 5  
            player.resources.sheep += 5
            player.resources.wheat += 5
            player.resources.ore += 5
            
            print(f"   Player {player_id[:8]} received 5 of each resource")

    def check_victory(self, player: SimplePlayer) -> bool:
        """Sprawdź czy gracz wygrał (ma >= 10 punktów zwycięstwa)"""
        total_points = self.get_player_victory_points(player)
        print(f"🏆 Checking victory for {player.display_name}: {total_points} points")
        return total_points >= 4
    
    def get_player_victory_points(self, player: SimplePlayer) -> int:
        """Oblicz łączne punkty zwycięstwa gracza"""
        total = player.victory_points
        
        # Dodaj punkty za najdłuższą drogę (2 punkty)
        if hasattr(player, 'longest_road') and player.longest_road:
            total += 2
        
        # Dodaj punkty za największą armię (2 punkty)  
        if hasattr(player, 'largest_army') and player.largest_army:
            total += 2
        
        return total
    
    def is_game_over(self) -> bool:
        """Sprawdź czy gra się skończyła (któryś gracz ma >= 10 punktów)"""
        for player_id, player in self.players.items():
            if self.check_victory(player):
                return True
        return False
    
    def get_winner(self) -> Optional[SimplePlayer]:
        """Zwróć gracza który wygrał, lub None jeśli gra trwa"""
        for player_id, player in self.players.items():
            if self.check_victory(player):
                return player
        return None
    
    def check_victory_after_action(self, player_id: str) -> bool:
        """Sprawdź zwycięstwo po akcji gracza i zakończ grę jeśli wygrał"""
        if player_id not in self.players:
            return False
            
        player = self.players[player_id]
        
        if self.check_victory(player):
            print(f"🎉 GAME OVER! Player {player.display_name} wins with {self.get_player_victory_points(player)} points!")
            
            # Ustaw fazę na zakończoną
            self.phase = GamePhase.FINISHED
            self.winner = player
            
            return True
        
        return False
    
    def end_game(self, winner: SimplePlayer):
        """Zakończ grę z wybranym zwycięzcą"""
        self.phase = GamePhase.FINISHED
        self.winner = winner
        self.end_time = datetime.now()
        
        print(f"🏁 Game ended! Winner: {winner.display_name} ({self.get_player_victory_points(winner)} points)")
        
        # Wyślij notyfikację o końcu gry przez WebSocket
        # (to będzie obsłużone w consumer)
    
    def get_final_standings(self) -> List[Dict]:
        """Zwróć końcowe wyniki wszystkich graczy"""
        standings = []
        
        for player_id, player in self.players.items():
            standings.append({
                'player_id': player_id,
                'display_name': player.display_name,
                'color': player.color,
                'victory_points': self.get_player_victory_points(player),
                'settlements_built': 5 - player.settlements_left,
                'cities_built': 4 - player.cities_left,
                'roads_built': 15 - player.roads_left,
                'longest_road': getattr(player, 'longest_road', False),
                'largest_army': getattr(player, 'largest_army', False),
                'is_winner': self.check_victory(player)
            })
        
        # Sortuj według punktów (malejąco)
        standings.sort(key=lambda x: x['victory_points'], reverse=True)
        
        return standings
    def start_turn(self, player_id: str):
        """Rozpocznij turę dla gracza"""
        if self.phase == GamePhase.PLAYING:
            # W normalnej grze resetuj flagę rzutu kości
            self.has_rolled_dice[player_id] = False
            print(f"🎮 Started turn for player {player_id[:8]} - must roll dice first")
    
    def handle_dice_roll(self, player_id: str, dice_result: int):
        """Obsłuż rzut kostką"""
        if not self.can_roll_dice(player_id):
            if self.has_rolled_dice.get(player_id, False):
                raise ValueError("Player has already rolled dice this turn")
            else:
                raise ValueError("Player cannot roll dice right now")
        
        # Ustaw że gracz rzucił kośćmi
        self.has_rolled_dice[player_id] = True
        
        # Rozdaj zasoby
        if dice_result == 7:
            print(f"🎲 Robber activated! (dice: {dice_result})")
            # TODO: obsługa robbera
        else:
            self.distribute_resources_for_dice_roll(dice_result)
        
        print(f"🎲 Player {player_id[:8]} rolled {dice_result}, can now take actions")
        return dice_result
    
    def can_roll_dice(self, player_id: str) -> bool:
        """Sprawdź czy gracz może rzucić kostką"""
        if self.phase != GamePhase.PLAYING:
            return False
        
        if not self.is_current_player(player_id):
            return False
        
        # Nie może rzucić jeśli już rzucił w tej turze
        return not self.has_rolled_dice.get(player_id, False)
    
    def can_take_actions(self, player_id: str) -> bool:
        """Sprawdź czy gracz może budować/handlować w normalnej grze"""
        if self.phase == GamePhase.SETUP:
            return self.is_current_player(player_id)
        
        if self.phase == GamePhase.PLAYING:
            return (self.is_current_player(player_id) and 
                    self.has_rolled_dice.get(player_id, False))
        
        return False
        
    def end_turn(self):
        """Zakończ turę i przejdź do następnego gracza"""
        current_player = self.get_current_player()
        
        if self.phase == GamePhase.SETUP:
            # W setup - automatycznie przejdź do następnego
            self.advance_setup_turn()
        
        elif self.phase == GamePhase.PLAYING:
            # W normalnej grze - sprawdź czy może zakończyć
            if not self.can_end_turn_in_game(current_player.player_id):
                raise ValueError("Cannot end turn - must roll dice first")
            
            # Wyczyść flagę rzutu kości
            self.has_rolled_dice[current_player.player_id] = False
            
            # Przejdź do następnego gracza
            self.current_player_index = (self.current_player_index + 1) % len(self.player_order)
            new_current_player = self.get_current_player()
            
            print(f"🔄 Turn ended, next player: {new_current_player.player_id[:8]}")

    def can_end_turn_in_setup(self, player_id: str) -> bool:
        """POPRAWIONA - Sprawdź czy gracz może zakończyć turę w fazie setup"""
        if self.phase != GamePhase.SETUP:
            return False
        
        if not self.is_current_player(player_id):
            return False
        
        # Użyj tej samej logiki co should_advance_to_next_player
        return self.should_advance_to_next_player(player_id)

    def can_end_turn_in_game(self, player_id: str) -> bool:
        """Sprawdź czy gracz może zakończyć turę w normalnej grze"""
        if self.phase != GamePhase.PLAYING:
            return False
        
        if not self.is_current_player(player_id):
            return False
        
        # Musi najpierw rzucić kostką
        return self.has_rolled_dice.get(player_id, False)

    def is_current_player(self, player_id: str) -> bool:
        """Sprawdź czy to tura danego gracza"""
        if not self.player_order:
            return False
        
        current_player_id = self.player_order[self.current_player_index]
        return current_player_id == player_id
        

    

    
    