from django.urls import path
from . import views

urlpatterns = [
    path('my-active-games/', views.get_my_active_games, name='my_active_games'),
    path('reconnect-to-game/', views.reconnect_to_game, name='reconnect_to_game'),
]