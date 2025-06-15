from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from game_session.session_manager import GameSessionManager

class Command(BaseCommand):
    help = 'Cleanup expired game sessions'
    
    def handle(self, *args, **options):
        session_manager = GameSessionManager()
        
        from game_session.models import GameSession
        
        # Usuń sesje starsze niż 24h
        expired_sessions = GameSession.objects.filter(
            is_active=True,
            last_ping__lt=timezone.now() - timedelta(hours=24)
        )
        
        count = 0
        for session in expired_sessions:
            session_manager.redis_client.delete(f"game_session:{session.session_id}")
            session_manager.redis_client.srem(f"room_sessions:{session.room_id}", str(session.session_id))
            count += 1
            
        expired_sessions.update(is_active=False)
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully cleaned up {count} expired sessions')
        )