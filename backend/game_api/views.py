import uuid

from django.http import JsonResponse
from game_engine.board.game_board import GameBoard
from game_engine.common.game_config import GameConfig
from game_engine.board.temp_helpers import print_board

def get_random_board(request):
    config = GameConfig()
    board = GameBoard(config)
    #print("\n=== GENEROWANIE NOWEJ PLANSZY ===")
    #print_board(board)
    #print("\n=== SZCZEGÓŁY PLANSZY ===")
    for tile in board.tiles:
        resource = tile.__class__.__name__.replace('Tile', '')
        number = tile.number if tile.number is not None else "PUSTYNIA"
        coords = tile.get_coordinates()
        #print(f"Pole {coords}: {resource} (kość: {number})")
    #print("===============================\n")
    board_data = board.serialize_board()
    return JsonResponse(board_data)

def create_game_room(request):
    room_id = str(uuid.uuid4())[:8]  # Generate a short unique ID
    return JsonResponse({'room_id': room_id})