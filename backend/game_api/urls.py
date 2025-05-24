from django.urls import path
from . import views
from .views import (
    get_random_board, 
    create_player_with_resources, 
    build_road, 
    build_settlement, 
    create_game_room,
    place_settlement,  # ← DODAJ TO
    place_road,        # ← DODAJ TO  
    get_board_state,   # ← DODAJ TO
    clear_board        # ← DODAJ TO
)

urlpatterns = [
    path('board/', views.get_random_board, name='get_random_board'),
    path('player/', views.create_player_with_resources, name='create_player_with_resources'),
    path('build/road/', views.build_road, name='build_road'),
    path('build/settlement/', views.build_settlement, name='build_settlement'),
    path('room/create/', views.create_game_room, name='create_game_room'),
    ######
    # Dodaj na koniec listy urlpatterns:
    path('vertex/<int:vertex_id>/', place_settlement, name='place_settlement'),
    path('edge/<int:edge_id>/', place_road, name='place_road'),
    path('board/state/', get_board_state, name='get_board_state'),
    path('board/clear/', clear_board, name='clear_board'),
]