from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid

class GameSession(models.Model):
    """Sesja gry - niezależna od sesji użytkownika"""
    session_id = models.UUIDField(default=uuid.uuid4, unique=True, primary_key=True)
    room_id = models.CharField(max_length=20, db_index=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    player_id = models.CharField(max_length=100)  # WebSocket player ID
    player_color = models.CharField(max_length=20)
    display_name = models.CharField(max_length=100)
    
    # Status sesji
    is_active = models.BooleanField(default=True)
    is_connected = models.BooleanField(default=False)
    last_ping = models.DateTimeField(auto_now=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Backup data
    game_state_backup = models.JSONField(default=dict, blank=True)
    
    class Meta:
        unique_together = ('room_id', 'user')
        indexes = [
            models.Index(fields=['room_id', 'is_active']),
            models.Index(fields=['user', 'is_active']),
        ]
    
    def __str__(self):
        return f"GameSession {self.session_id} - {self.display_name} in {self.room_id}"