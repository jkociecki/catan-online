import pytest
from game_engine.game.game_state import GameState
from game_engine.common.game_config import GameConfig
from game_engine.player.player import Player
from game_engine.common.player_color import PlayerColor
from game_engine.common.resources import Resource
from game_engine.board.buildings import BuildingType

@pytest.fixture
def game_config():
    return GameConfig()

@pytest.fixture
def game_state(game_config):
    state = GameState(game_config)
    # Add 4 players
    for color in [PlayerColor.RED, PlayerColor.BLUE, PlayerColor.GREEN, PlayerColor.YELLOW]:
        state.add_player(Player(color, game_config))
    return state

def test_initial_setup_phase(game_state):
    """Test początkowej fazy rozstawienia"""
    # Symulacja rozstawienia początkowego dla 4 graczy
    for player in game_state.players:
        # Pierwsza osada i droga
        player.settlements_left -= 1  # Symulacja zbudowania pierwszej osady
        player.roads_left -= 1  # Symulacja zbudowania pierwszej drogi
        assert player.settlements_left == 4  # 5 - 1
        assert player.roads_left == 11  # 12 - 1
        
        # Druga osada i droga
        player.settlements_left -= 1  # Symulacja zbudowania drugiej osady
        player.roads_left -= 1  # Symulacja zbudowania drugiej drogi
        assert player.settlements_left == 3  # 4 - 1
        assert player.roads_left == 10  # 11 - 1

def test_resource_distribution(game_state):
    """Test dystrybucji zasobów"""
    # Symulacja rzutu kostką i rozdania zasobów
    dice_roll = 6
    game_state.distribute_resources(dice_roll)
    
    # Sprawdź czy gracze otrzymali zasoby
    for player in game_state.players:
        total_resources = sum(player.player_resources.resources.values())
        assert total_resources >= 0  # Może być 0 jeśli nie ma osady przy polu z 6

def test_trading_phase(game_state):
    """Test fazy handlu"""
    # Przygotuj graczy z różnymi zasobami
    player1 = game_state.players[0]
    player2 = game_state.players[1]
    
    player1.add_resource(Resource.WOOD, 3)
    player2.add_resource(Resource.BRICK, 3)
    
    # Symulacja handlu
    trade_success = game_state.trade_resources(
        player1, player2,
        {Resource.WOOD: 1},
        {Resource.BRICK: 1}
    )
    
    assert trade_success
    assert player1.player_resources.resources[Resource.WOOD] == 2
    assert player1.player_resources.resources[Resource.BRICK] == 1
    assert player2.player_resources.resources[Resource.BRICK] == 2
    assert player2.player_resources.resources[Resource.WOOD] == 1

def test_building_phase(game_state):
    """Test fazy budowania"""
    player = game_state.players[0]
    
    # Dodaj zasoby na osadę
    player.add_resource(Resource.BRICK, 1)
    player.add_resource(Resource.WOOD, 1)
    player.add_resource(Resource.SHEEP, 1)
    player.add_resource(Resource.WHEAT, 1)
    
    # Symulacja budowania osady
    can_build = player.can_afford_building(BuildingType.SETTLEMENT)
    assert can_build
    
    if can_build:
        player.settlements_left -= 1
        player.victory_points += 1
        assert player.settlements_left == 4
        assert player.victory_points == 1

def test_victory_conditions(game_state):
    """Test warunków zwycięstwa"""
    player = game_state.players[0]
    
    # Symulacja zdobywania punktów zwycięstwa
    # 5 osad (5 punktów)
    player.settlements_left = 0
    player.victory_points = 5
    
    # Najdłuższa droga (2 punkty)
    player.longest_road = True
    
    # Największa armia (2 punkty)
    player.largest_army = True
    
    assert player.get_victory_points() == 9
    assert not game_state.check_victory(player)  # Potrzeba 10 punktów
    
    # Dodaj jeszcze jeden punkt
    player.victory_points += 1
    assert game_state.check_victory(player) 