import pytest
from game_engine.board.game_board import GameBoard
from game_engine.common.game_config import GameConfig
from game_engine.common.resources import Resource
from game_engine.player.player import Player
from game_engine.common.player_color import PlayerColor
from game_engine.board.buildings import Building, BuildingType, Road

@pytest.fixture
def game_config():
    return GameConfig()

@pytest.fixture
def game_board(game_config):
    return GameBoard(game_config)

@pytest.fixture
def player(game_config):
    return Player(PlayerColor.RED, game_config)

def test_board_initialization(game_board):
    """Test czy plansza jest poprawnie inicjalizowana"""
    assert len(game_board.tiles) > 0
    assert len(game_board.vertices) > 0
    assert len(game_board.edges) > 0

def test_tile_distribution(game_board):
    """Test czy płytki są poprawnie rozłożone"""
    resource_counts = {}
    for tile in game_board.tiles:
        resource = tile.get_resource()
        resource_counts[resource] = resource_counts.get(resource, 0) + 1
    
    # Sprawdź czy mamy odpowiednią liczbę płytek każdego typu
    assert resource_counts[Resource.WOOD] == 4
    assert resource_counts[Resource.BRICK] == 3
    assert resource_counts[Resource.SHEEP] == 4
    assert resource_counts[Resource.WHEAT] == 4
    assert resource_counts[Resource.ORE] == 3
    assert resource_counts[Resource.DESERT] == 1

def test_place_settlement(game_board, player):
    """Test umieszczania osady"""
    # Wybierz pierwszy dostępny wierzchołek
    vertex_key = next(iter(game_board.vertices.keys()))
    settlement = Building(BuildingType.SETTLEMENT, player)
    
    # Umieść osadę (w fazie setup)
    result = game_board.place_building(settlement, vertex_key, free=True)
    
    assert result == True
    assert game_board.vertices[vertex_key].building == settlement
    assert game_board.vertices[vertex_key].building.player == player

def test_place_road(game_board, player):
    """Test umieszczania drogi"""
    # Najpierw postaw osadę
    vertex_key = next(iter(game_board.vertices.keys()))
    settlement = Building(BuildingType.SETTLEMENT, player)
    game_board.place_building(settlement, vertex_key, free=True)
    
    # Znajdź krawędź połączoną z osadą
    connected_edges = []
    for edge_key, edge in game_board.edges.items():
        vertices = game_board.get_edge_vertices(edge_key)
        if vertex_key in vertices:
            connected_edges.append(edge_key)
    
    # Wybierz pierwszą połączoną krawędź
    edge_key = connected_edges[0]
    road = Road(player)
    
    # Umieść drogę (w fazie setup)
    result = game_board.place_road(road, edge_key, free=True)
    
    assert result == True
    assert game_board.edges[edge_key].road == road
    assert game_board.edges[edge_key].road.player == player 