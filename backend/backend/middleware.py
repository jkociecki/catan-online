from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework.authtoken.models import Token

@database_sync_to_async
def get_user(token_key):
    try:
        token = Token.objects.get(key=token_key)
        return token.user
    except Token.DoesNotExist:
        return AnonymousUser()

class TokenAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        # Get query parameters
        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        
        print(f"🔍 WebSocket Query string: {query_string}")  # ← DODAJ
        
        # Get token from query_string
        token_key = query_params.get('token', [None])[0]
        
        print(f"🔍 Token key: {token_key}")  # ← DODAJ
        
        # Set the user in the scope
        if token_key:
            user = await get_user(token_key)
            print(f"🔍 User found: {user} (ID: {getattr(user, 'id', 'None')})")  # ← DODAJ
            scope['user'] = user
        else:
            scope['user'] = AnonymousUser()
            print("🔍 No token, using AnonymousUser")  # ← DODAJ
        
        return await super().__call__(scope, receive, send)

def TokenAuthMiddlewareStack(inner):
    return TokenAuthMiddleware(inner)