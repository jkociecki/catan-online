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

def test_turn_order(game_state):
    """Test kolejności tur"""
    # Sprawdź początkową kolejność
    assert game_state.current_player_index == 0
    assert game_state.players[game_state.current_player_index].color == PlayerColor.RED
    
    # Przejdź do następnego gracza
    game_state.next_turn()
    assert game_state.current_player_index == 1
    assert game_state.players[game_state.current_player_index].color == PlayerColor.BLUE
    
    # Przejdź do ostatniego gracza
    game_state.next_turn()
    game_state.next_turn()
    assert game_state.current_player_index == 3
    assert game_state.players[game_state.current_player_index].color == PlayerColor.YELLOW
    
    # Wróć do pierwszego gracza
    game_state.next_turn()
    assert game_state.current_player_index == 0
    assert game_state.players[game_state.current_player_index].color == PlayerColor.RED

def test_turn_phases(game_state):
    """Test faz tury"""
    current_player = game_state.players[game_state.current_player_index]
    
    # Faza 1: Rzut kostką
    dice_roll = game_state.roll_dice()
    assert 2 <= dice_roll <= 12
    
    # Faza 2: Rozdanie zasobów
    game_state.distribute_resources(dice_roll)
    
    # Faza 3: Handlowanie
    # Dodaj zasoby do handlu
    current_player.add_resource(Resource.WOOD, 3)
    current_player.add_resource(Resource.BRICK, 1)
    
    # Dodaj zasoby do drugiego gracza
    game_state.players[1].add_resource(Resource.BRICK, 1)
    
    # Symulacja handlu
    trade_success = game_state.trade_resources(
        current_player,
        game_state.players[1],
        {Resource.WOOD: 1},
        {Resource.BRICK: 1}
    )
    assert trade_success
    
    # Faza 4: Budowanie
    # Dodaj zasoby na osadę
    current_player.add_resource(Resource.BRICK, 1)
    current_player.add_resource(Resource.WOOD, 1)
    current_player.add_resource(Resource.SHEEP, 1)
    current_player.add_resource(Resource.WHEAT, 1)
    
    # Sprawdź czy może zbudować
    can_build = current_player.can_afford_building(BuildingType.SETTLEMENT)
    assert can_build

def test_robber_placement(game_state):
    """Test umieszczania złodzieja"""
    # Symulacja rzutu 7
    game_state.handle_robber_roll()
    
    # Sprawdź czy gracze z więcej niż 7 kartami muszą odrzucić połowę
    for player in game_state.players:
        if sum(player.player_resources.resources.values()) > 7:
            assert player.must_discard

def test_special_actions(game_state):
    """Test specjalnych akcji w turze"""
    current_player = game_state.players[game_state.current_player_index]
    
    # Test kupna karty rozwoju
    current_player.add_resource(Resource.ORE, 1)
    current_player.add_resource(Resource.SHEEP, 1)
    current_player.add_resource(Resource.WHEAT, 1)
    
    can_buy_card = current_player.can_afford_dev_card()
    assert can_buy_card
    
    # Test handlu z portem
    current_player.add_resource(Resource.WOOD, 3)
    can_trade_with_port = game_state.can_trade_with_port(current_player, Resource.WOOD)
    assert can_trade_with_port

def test_game_end_conditions(game_state):
    """Test warunków końca gry"""
    # Symulacja gracza z 9 punktami
    player = game_state.players[0]
    player.victory_points = 9
    
    # Sprawdź czy gra nie jest zakończona
    assert not game_state.is_game_over()
    
    # Dodaj punkt zwycięstwa
    player.victory_points += 1
    
    # Sprawdź czy gra jest zakończona
    assert game_state.is_game_over()
    assert game_state.get_winner() == player 