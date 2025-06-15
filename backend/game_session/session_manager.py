# backend/game_session/session_manager.py - OSTATECZNA POPRAWKA
import redis
import json
import time
from typing import Optional, Dict, Any, List
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

class GameSessionManager:
    """Zarządca sesji gry w Redis"""
    
    def __init__(self):
        self.redis_client = redis.Redis(
            host=getattr(settings, 'REDIS_HOST', 'localhost'),
            port=getattr(settings, 'REDIS_PORT', 6379),
            db=getattr(settings, 'REDIS_GAME_SESSION_DB', 2),
            decode_responses=True
        )
        self.session_ttl = getattr(settings, 'GAME_SESSION_TTL', 86400)  # 24h
    
    def _bool_to_string(self, value):
        """Helper: Konwertuj boolean na string dla Redis"""
        if isinstance(value, bool):
            return 'true' if value else 'false'
        return str(value)
    
    def _string_to_bool(self, value):
        """Helper: Konwertuj string z Redis na boolean"""
        if isinstance(value, str):
            return value.lower() == 'true'
        return bool(value)
    
    def create_game_session(self, user, room_id: str, player_data: Dict) -> str:
        """Utwórz sesję gry"""
        from game_session.models import GameSession
        
        # Sprawdź czy user już ma sesję w tym pokoju
        existing_session = GameSession.objects.filter(
            user=user, 
            room_id=room_id, 
            is_active=True
        ).first()
        
        if existing_session:
            # Reaktywuj istniejącą sesję
            session_id = str(existing_session.session_id)
            self.update_session_connection(session_id, True)
            print(f"🔄 Reactivated existing session: {session_id}")
            return session_id
        
        # Utwórz nową sesję
        game_session = GameSession.objects.create(
            room_id=room_id,
            user=user,
            player_id=player_data.get('player_id'),
            player_color=player_data.get('color'),
            display_name=player_data.get('display_name'),
            is_connected=True
        )
        
        session_id = str(game_session.session_id)
        
        # ✅ KLUCZOWA POPRAWKA: Wszystkie wartości jako stringi
        session_data = {
            'session_id': str(session_id),
            'room_id': str(room_id),
            'user_id': str(user.id),
            'player_id': str(player_data.get('player_id', '')),
            'color': str(player_data.get('color', '')),
            'display_name': str(player_data.get('display_name', '')),
            'created_at': str(time.time()),
            'last_ping': str(time.time()),
            'is_connected': 'true'  # ✅ ZAWSZE STRING
        }
        
        # ✅ DODATKOWE ZABEZPIECZENIE: Upewnij się że wszystko to string
        safe_session_data = {}
        for key, value in session_data.items():
            safe_session_data[str(key)] = self._bool_to_string(value)
        
        print(f"🔍 Safe session data: {safe_session_data}")
        
        self.redis_client.hset(f"game_session:{session_id}", mapping=safe_session_data)
        self.redis_client.expire(f"game_session:{session_id}", self.session_ttl)
        
        # Dodaj do listy sesji pokoju
        self.redis_client.sadd(f"room_sessions:{room_id}", str(session_id))
        
        print(f"✅ Created new game session: {session_id}")
        return session_id
    
    def get_game_session(self, session_id: str) -> Optional[Dict]:
        """Pobierz sesję gry"""
        data = self.redis_client.hgetall(f"game_session:{session_id}")
        if data:
            # ✅ BEZPIECZNA KONWERSJA z Redis
            try:
                return {
                    'session_id': data.get('session_id', ''),
                    'room_id': data.get('room_id', ''),
                    'user_id': int(data.get('user_id', 0)) if data.get('user_id', '').isdigit() else 0,
                    'player_id': data.get('player_id', ''),
                    'color': data.get('color', ''),
                    'display_name': data.get('display_name', ''),
                    'is_connected': self._string_to_bool(data.get('is_connected', 'false'))
                }
            except (ValueError, TypeError) as e:
                print(f"❌ Error converting Redis data: {e}")
                return None
        
        # Fallback do bazy danych
        try:
            from game_session.models import GameSession
            db_session = GameSession.objects.get(session_id=session_id, is_active=True)
            return {
                'session_id': str(db_session.session_id),
                'room_id': str(db_session.room_id),
                'user_id': int(db_session.user_id),
                'player_id': str(db_session.player_id),
                'color': str(db_session.player_color),
                'display_name': str(db_session.display_name),
                'is_connected': bool(db_session.is_connected)
            }
        except Exception as e:
            print(f"❌ Error fetching from DB: {e}")
            return None
    
    def update_session_connection(self, session_id: str, is_connected: bool):
        """Aktualizuj status połączenia"""
        # ✅ BEZWZGLĘDNIE BEZPIECZNE WARTOŚCI
        update_data = {
            'is_connected': self._bool_to_string(is_connected),
            'last_ping': str(time.time())
        }
        
        print(f"🔍 Updating session {session_id} with data: {update_data}")
        
        try:
            self.redis_client.hset(f"game_session:{session_id}", mapping=update_data)
            print(f"✅ Redis update successful")
        except Exception as e:
            print(f"❌ Redis update failed: {e}")
        
        # Aktualizuj też w bazie
        try:
            from game_session.models import GameSession
            GameSession.objects.filter(session_id=session_id).update(
                is_connected=bool(is_connected),  # Tu może być bool dla Django ORM
                last_ping=timezone.now()
            )
            print(f"✅ Database update successful")
        except Exception as e:
            print(f"❌ Database update failed: {e}")
    
    def get_room_sessions(self, room_id: str) -> List[Dict]:
        """Pobierz wszystkie sesje w pokoju"""
        try:
            session_ids = self.redis_client.smembers(f"room_sessions:{room_id}")
            sessions = []
            for session_id in session_ids:
                session_data = self.get_game_session(session_id)
                if session_data:
                    sessions.append(session_data)
            return sessions
        except Exception as e:
            print(f"❌ Error getting room sessions: {e}")
            return []
    
    def can_reconnect(self, user, room_id: str) -> Optional[str]:
        """Sprawdź czy user może się połączyć ponownie"""
        from game_session.models import GameSession
        
        try:
            session = GameSession.objects.get(
                user=user, 
                room_id=room_id, 
                is_active=True
            )
            print(f"🔍 Found reconnectable session: {session.session_id}")
            return str(session.session_id)
        except GameSession.DoesNotExist:
            print(f"❌ No reconnectable session for user {user.id} in room {room_id}")
            return None
        except Exception as e:
            print(f"❌ Error checking reconnectable session: {e}")
            return None