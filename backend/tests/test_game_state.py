import pytest
from game_engine.game.game_state import GameState
from game_engine.common.game_config import GameConfig
from game_engine.player.player import Player
from game_engine.common.player_color import PlayerColor

@pytest.fixture
def game_config():
    return GameConfig()

@pytest.fixture
def game_state(game_config):
    return GameState(game_config)

@pytest.fixture
def player(game_config):
    return Player(PlayerColor.RED, game_config)

def test_game_state_initialization(game_state, game_config):
    """Test czy stan gry jest poprawnie inicjalizowany"""
    assert game_state.game_config == game_config
    assert len(game_state.players) == 0

def test_adding_player(game_state, player):
    """Test dodawania gracza do gry"""
    game_state.add_player(player)
    assert len(game_state.players) == 1
    assert game_state.players[0] == player

def test_adding_multiple_players(game_state, game_config):
    """Test dodawania wielu graczy"""
    colors = [PlayerColor.RED, PlayerColor.BLUE, PlayerColor.GREEN]
    for color in colors:
        player = Player(color, game_config)
        game_state.add_player(player)
    
    assert len(game_state.players) == 3
    assert game_state.players[0].color == PlayerColor.RED
    assert game_state.players[1].color == PlayerColor.BLUE
    assert game_state.players[2].color == PlayerColor.GREEN 