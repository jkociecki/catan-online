# backend/game_api/routing.py
from django.urls import re_path
from . import consumers
from .simple_consumer import SimpleGameConsumer  # NOWY IMPORT

websocket_urlpatterns = [
    # STARY (zachowaj na razie dla kompatybilności)
    re_path(r'ws/game/(?P<room_id>\w+)/$', consumers.GameConsumer.as_asgi()),
    
    # NOWY - proste ID
    re_path(r'ws/simple-game/(?P<room_id>\w+)/$', SimpleGameConsumer.as_asgi()),
]