from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from game_session.session_manager import GameSessionManager
from game_session.models import GameSession

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_active_games(request):
    """Pobierz aktywne gry użytkownika"""
    session_manager = GameSessionManager()
    
    active_sessions = GameSession.objects.filter(
        user=request.user,
        is_active=True
    ).order_by('-updated_at')
    
    games = []
    for session in active_sessions:
        # Sprawdź czy gra nadal trwa
        room_sessions = session_manager.get_room_sessions(session.room_id)
        if len(room_sessions) > 0:  # Pokój nadal aktywny
            games.append({
                'session_id': str(session.session_id),
                'room_id': session.room_id,
                'display_name': session.display_name,
                'color': session.player_color,
                'last_activity': session.updated_at,
                'can_reconnect': True,
                'players_count': len(room_sessions),
                'is_connected': session.is_connected
            })
    
    return Response({'active_games': games})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reconnect_to_game(request):
    """Połącz ponownie do gry"""
    room_id = request.data.get('room_id')
    session_manager = GameSessionManager()
    
    session_id = session_manager.can_reconnect(request.user, room_id)
    if session_id:
        return Response({
            'can_reconnect': True,
            'session_id': session_id,
            'room_id': room_id
        })
    else:
        return Response({
            'can_reconnect': False,
            'message': 'No active session found'
        }, status=400)
