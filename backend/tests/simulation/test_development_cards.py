import pytest
from game_engine.game.game_state import GameState
from game_engine.common.game_config import GameConfig
from game_engine.player.player import Player
from game_engine.common.player_color import PlayerColor
from game_engine.common.resources import Resource
from game_engine.development_cards.card import DevelopmentCard, DevelopmentCardType
from game_engine.development_cards.card_deck import DevelopmentCardDeck
from game_engine.board.buildings import Road


@pytest.fixture
def game_config():
    return GameConfig()

@pytest.fixture
def game_state(game_config):
    state = GameState(game_config)
    state.add_player(Player(PlayerColor.RED, game_config))
    return state

@pytest.fixture
def player(game_state):
    return game_state.players[0]

@pytest.fixture
def card_deck(game_config):
    return DevelopmentCardDeck(game_config)

def test_development_card_purchase(player, card_deck):
    """Test zakupu karty rozwoju"""
    # Dodaj zasoby potrzebne na kartę rozwoju
    player.add_resource(Resource.ORE, 1)
    player.add_resource(Resource.SHEEP, 1)
    player.add_resource(Resource.WHEAT, 1)
    
    # Sprawdź czy gracz może kupić kartę
    can_buy = player.can_afford_dev_card()
    assert can_buy
    
    if can_buy:
        # Kup kartę
        card = card_deck.draw()
        assert card is not None
        assert isinstance(card, DevelopmentCard)
        assert not card.played
        assert card.turn_bought == 0
        
        # Zapłać za kartę
        player.pay_for_development_card()
        assert player.player_resources.resources[Resource.ORE] == 0
        assert player.player_resources.resources[Resource.SHEEP] == 0
        assert player.player_resources.resources[Resource.WHEAT] == 0

def draw_until_type(card_deck, target_type):
    """Losuje karty aż do znalezienia karty danego typu"""
    while True:
        card = card_deck.draw()
        if card is None:
            raise Exception(f"Nie znaleziono karty typu {target_type}")
        if card.card_type == target_type:
            return card

#TODO dodac testy dla kazdej z kart