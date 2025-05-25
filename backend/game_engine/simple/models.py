# backend/game_engine/simple/models.py
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
    """Wierzchołek z prostym ID"""
    vertex_id: int
    building_type: Optional[BuildingType] = None
    player_id: Optional[str] = None
    
    def has_building(self) -> bool:
        return self.building_type is not None
    
    def is_owned_by(self, player_id: str) -> bool:
        return self.player_id == player_id

@dataclass
class GameEdge:
    """Krawędź z prostym ID"""
    edge_id: int
    has_road: bool = False
    player_id: Optional[str] = None
    
    def is_owned_by(self, player_id: str) -> bool:
        return self.player_id == player_id

@dataclass 
class GameTile:
    """Kafelek planszy"""
    tile_id: int
    resource: Resource
    dice_number: int
    has_robber: bool = False

class GamePhase(Enum):
    SETUP = "setup"
    ROLL_DICE = "roll_dice" 
    MAIN = "main"
    END_TURN = "end_turn"

@dataclass
class PlayerResources:
    """Zasoby gracza"""
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
    
    def add(self, resource: Resource, amount: int = 1):
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
    """Gracz w uproszczonej grze"""
    player_id: str
    color: str
    resources: PlayerResources
    victory_points: int = 0
    settlements_left: int = 5
    cities_left: int = 4
    roads_left: int = 15
    
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
        self.settlements_left += 1  # Oddaj osadę do puli
        self.victory_points += 1
    
    def pay_for_road(self):
        cost = {Resource.WOOD: 1, Resource.BRICK: 1}
        self.resources.subtract(cost)
        self.roads_left -= 1

class SimpleGameState:
    """Główny stan gry z prostymi ID"""
    
    def __init__(self):
        self.vertices: Dict[int, GameVertex] = {}
        self.edges: Dict[int, GameEdge] = {}
        self.tiles: Dict[int, GameTile] = {}
        self.players: Dict[str, SimplePlayer] = {}
        self.phase: GamePhase = GamePhase.SETUP
        self.current_player_index: int = 0
        self.player_order: List[str] = []
        self.setup_round: int = 1  # 1 lub 2
        self.setup_progress: Dict[str, Dict[str, int]] = {}  # {player_id: {settlements: 0, roads: 0}}
        
        # Inicjalizuj planszę
        self._init_board()
    
    def _init_board(self):
        """Inicjalizuj planszę z prostymi ID"""
        # Kafelki - uproszczona plansza Catan (19 hex)
        tile_data = [
            (0, Resource.WOOD, 6), (1, Resource.SHEEP, 3), (2, Resource.SHEEP, 8),
            (3, Resource.WHEAT, 2), (4, Resource.ORE, 4), (5, Resource.WHEAT, 5),
            (6, Resource.WOOD, 10), (7, Resource.WOOD, 5), (8, Resource.BRICK, 9),
            (9, Resource.SHEEP, 0), (10, Resource.ORE, 6), (11, Resource.WHEAT, 9),  # 9 = pustynia
            (12, Resource.WHEAT, 10), (13, Resource.ORE, 11), (14, Resource.WOOD, 3),
            (15, Resource.SHEEP, 12), (16, Resource.BRICK, 8), (17, Resource.SHEEP, 4),
            (18, Resource.BRICK, 11)
        ]
        
        for tile_id, resource, dice_num in tile_data:
            self.tiles[tile_id] = GameTile(tile_id, resource, dice_num)
        
        # Wierzchołki - każdy kafelek ma 6 wierzchołków, ale wiele jest współdzielonych
        # Dla 19 kafelków będziemy mieć około 54 unikatowych wierzchołków
        for vertex_id in range(54):
            self.vertices[vertex_id] = GameVertex(vertex_id)
        
        # Krawędzie - każdy kafelek ma 6 krawędzi, około 72 unikatowych krawędzi
        for edge_id in range(72):
            self.edges[edge_id] = GameEdge(edge_id)
    
    def add_player(self, player_id: str, color: str):
        """Dodaj gracza do gry"""
        self.players[player_id] = SimplePlayer(
            player_id=player_id,
            color=color, 
            resources=PlayerResources()
        )
        self.player_order.append(player_id)
        self.setup_progress[player_id] = {"settlements": 0, "roads": 0}
    
    def get_current_player(self) -> SimplePlayer:
        """Pobierz aktualnego gracza"""
        player_id = self.player_order[self.current_player_index]
        return self.players[player_id]
    
    def can_place_settlement(self, vertex_id: int, player_id: str, is_setup: bool = False) -> bool:
        """Sprawdź czy można postawić osadę"""
        if vertex_id not in self.vertices:
            return False
        
        vertex = self.vertices[vertex_id]
        if vertex.has_building():
            return False
        
        # W setup nie sprawdzamy distance rule ani połączenia z drogą
        if is_setup:
            return True
        
        # TODO: Sprawdź distance rule (sąsiednie wierzchołki)
        # TODO: Sprawdź połączenie z drogą gracza
        return True
    
    def can_place_road(self, edge_id: int, player_id: str, is_setup: bool = False) -> bool:
        """Sprawdź czy można postawić drogę"""
        if edge_id not in self.edges:
            return False
        
        edge = self.edges[edge_id]
        if edge.has_road:
            return False
        
        # W setup sprawdzamy tylko czy jest połączona z osadą gracza
        if is_setup:
            # TODO: Sprawdź połączenie z osadą gracza
            return True
        
        # TODO: Sprawdź połączenie z inną drogą lub osadą gracza
        return True
    
    def place_settlement(self, vertex_id: int, player_id: str, is_setup: bool = False) -> bool:
        """Postaw osadę"""
        if not self.can_place_settlement(vertex_id, player_id, is_setup):
            return False
        
        player = self.players[player_id]
        
        # W setup nie płacimy
        if not is_setup:
            if not player.can_afford_settlement():
                return False
            player.pay_for_settlement()
        else:
            player.settlements_left -= 1
            player.victory_points += 1
        
        # Postaw budynek
        self.vertices[vertex_id].building_type = BuildingType.SETTLEMENT
        self.vertices[vertex_id].player_id = player_id
        
        # Zaktualizuj progress setup
        if is_setup:
            self.setup_progress[player_id]["settlements"] += 1
        
        return True
    
    def place_road(self, edge_id: int, player_id: str, is_setup: bool = False) -> bool:
        """Postaw drogę"""
        if not self.can_place_road(edge_id, player_id, is_setup):
            return False
        
        player = self.players[player_id]
        
        # W setup nie płacimy
        if not is_setup:
            if not player.can_afford_road():
                return False
            player.pay_for_road()
        else:
            player.roads_left -= 1
        
        # Postaw drogę
        self.edges[edge_id].has_road = True
        self.edges[edge_id].player_id = player_id
        
        # Zaktualizuj progress setup
        if is_setup:
            self.setup_progress[player_id]["roads"] += 1
        
        return True
    
    def is_setup_complete(self) -> bool:
        """Sprawdź czy setup jest zakończony"""
        for player_id in self.player_order:
            progress = self.setup_progress[player_id]
            if progress["settlements"] < 2 or progress["roads"] < 2:
                return False
        return True
    
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
                        self.phase = GamePhase.ROLL_DICE
                        self.current_player_index = 0
        else:
            # Normalna gra - zawsze w przód
            self.current_player_index = (self.current_player_index + 1) % len(self.player_order)
            self.phase = GamePhase.ROLL_DICE
    
    def serialize(self) -> dict:
        """Serializuj stan gry do JSON"""
        return {
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
            "players": {
                pid: {
                    "player_id": p.player_id,
                    "color": p.color,
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
                } for pid, p in self.players.items()
            },
            "phase": self.phase.value,
            "current_player_index": self.current_player_index,
            "player_order": self.player_order
        }