from django.urls import path
from . import views

urlpatterns = [
    path('board/', views.get_random_board, name='get_random_board'),
    path('room/create/', views.create_game_room, name='create_game_room'),

] 