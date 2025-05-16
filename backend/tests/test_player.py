import pytest
from game_engine.player.player import Player
from game_engine.common.game_config import GameConfig
from game_engine.common.player_color import PlayerColor
from game_engine.common.resources import Resource
from game_engine.board.buildings import BuildingType

@pytest.fixture
def game_config():
    return GameConfig()

@pytest.fixture
def player(game_config):
    return Player(PlayerColor.RED, game_config)

def test_player_initialization(player, game_config):
    """Test czy gracz jest poprawnie inicjalizowany"""
    assert player.color == PlayerColor.RED
    assert player.settlements_left == game_config.max_settlements
    assert player.cities_left == game_config.max_cities
    assert player.roads_left == game_config.max_roads
    assert player.victory_points == 0
    assert player.hidden_victory_points == 0
    assert not player.longest_road
    assert not player.largest_army

def test_resource_management(player):
    """Test zarządzania zasobami"""
    # Dodaj zasoby
    player.add_resource(Resource.WOOD, 3)
    player.add_resource(Resource.BRICK, 2)
    
    # Sprawdź czy zasoby zostały dodane
    assert player.player_resources.resources[Resource.WOOD] == 3
    assert player.player_resources.resources[Resource.BRICK] == 2
    
    # Usuń zasoby
    player.remove_resource(Resource.WOOD, 1)
    
    # Sprawdź czy zasoby zostały usunięte
    assert player.player_resources.resources[Resource.WOOD] == 2


def test_building_limits(player):
    """Test limitów budynków"""
    # Sprawdź początkowe limity
    assert player.settlements_left == 5
    assert player.cities_left == 5
    assert player.roads_left == 12
    
    # Symuluj zbudowanie osady
    player.settlements_left -= 1
    assert player.settlements_left == 4
    
    # Symuluj zbudowanie miasta
    player.cities_left -= 1
    assert player.cities_left == 4
    
    # Symuluj zbudowanie drogi
    player.roads_left -= 1
    assert player.roads_left == 11 


def test_can_afford_building(player):
    """Test sprawdzania czy gracz może sobie pozwolić na budynek"""
    # Gracz nie ma zasobów
    assert not player.can_afford_building(BuildingType.SETTLEMENT)
    assert not player.can_afford_building(BuildingType.CITY)
    
    # Dodaj wymagane zasoby na osadę
    player.add_resource(Resource.BRICK, 1)
    player.add_resource(Resource.WOOD, 1)
    player.add_resource(Resource.SHEEP, 1)
    player.add_resource(Resource.WHEAT, 1)
    
    # Sprawdź czy może zbudować osadę
    assert player.can_afford_building(BuildingType.SETTLEMENT)
    
    # Dodaj wymagane zasoby na miasto
    player.add_resource(Resource.ORE, 3)
    player.add_resource(Resource.WHEAT, 2)
    
    # Sprawdź czy może zbudować miasto
    assert player.can_afford_building(BuildingType.CITY)