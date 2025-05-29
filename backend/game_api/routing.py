# backend/game_api/routing.py
from django.urls import re_path
from .simple_consumer import SimpleGameConsumer  

websocket_urlpatterns = [
    re_path(r'ws/game/(?P<room_id>\w+)/$', SimpleGameConsumer.as_asgi()),
]