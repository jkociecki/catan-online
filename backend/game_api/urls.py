from django.urls import path
from . import views

urlpatterns = [
    path('board/', views.get_random_board, name='get_random_board'),
    path('player/', views.create_player_with_resources, name='create_player_with_resources'),
    path('build/road/', views.build_road, name='build_road'),
    path('build/settlement/', views.build_settlement, name='build_settlement'),
] 