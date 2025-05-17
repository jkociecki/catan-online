# backend/asgi.py
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from backend.middleware import TokenAuthMiddlewareStack
import game_api.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": TokenAuthMiddlewareStack(
        AuthMiddlewareStack(
            URLRouter(
                game_api.routing.websocket_urlpatterns
            )
        )
    ),
})