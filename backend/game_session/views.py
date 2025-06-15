# backend/game_session/views.py - POPRAWIONA WERSJA
from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from game_session.session_manager import GameSessionManager
from game_session.models import GameSession
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_active_games(request):
    """Pobierz aktywne gry użytkownika"""
    try:
        print(f"🔍 get_my_active_games called for user: {request.user} (ID: {request.user.id})")
        
        session_manager = GameSessionManager()
        
        # Znajdź wszystkie aktywne sesje użytkownika
        active_sessions = GameSession.objects.filter(
            user=request.user,
            is_active=True
        ).order_by('-updated_at')
        
        print(f"🔍 Found {active_sessions.count()} active sessions in database")
        
        games = []
        for session in active_sessions:
            print(f"🔍 Processing session: {session.session_id} for room {session.room_id}")
            
            # Sprawdź czy sesja nadal istnieje w Redis
            session_data = session_manager.get_game_session(str(session.session_id))
            if session_data:
                print(f"✅ Session {session.session_id} found in Redis")
                
                # Sprawdź czy room ma aktywne sesje
                room_sessions = session_manager.get_room_sessions(session.room_id)
                players_count = len(room_sessions)
                
                print(f"🔍 Room {session.room_id} has {players_count} active sessions")
                
                game_info = {
                    'session_id': str(session.session_id),
                    'room_id': session.room_id,
                    'display_name': session.display_name,
                    'color': session.player_color,
                    'last_activity': session.updated_at.isoformat(),
                    'can_reconnect': True,
                    'players_count': players_count,
                    'is_connected': session.is_connected,
                    'created_at': session.created_at.isoformat(),
                }
                
                games.append(game_info)
                print(f"✅ Added game info: {game_info}")
            else:
                print(f"❌ Session {session.session_id} not found in Redis, marking as inactive")
                # Sesja nie istnieje w Redis, oznacz jako nieaktywną
                session.is_active = False
                session.save()
        
        print(f"🎮 Returning {len(games)} active games")
        
        return Response({
            'success': True,
            'active_games': games,
            'total_count': len(games)
        })
        
    except Exception as e:
        logger.exception("Error in get_my_active_games")
        print(f"❌ Error in get_my_active_games: {str(e)}")
        return Response({
            'success': False,
            'error': str(e),
            'active_games': []
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reconnect_to_game(request):
    """Połącz ponownie do gry"""
    try:
        room_id = request.data.get('room_id')
        if not room_id:
            return Response({
                'success': False,
                'error': 'room_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        print(f"🔄 reconnect_to_game called for user {request.user} to room {room_id}")
        
        session_manager = GameSessionManager()
        session_id = session_manager.can_reconnect(request.user, room_id)
        
        if session_id:
            print(f"✅ User can reconnect to room {room_id} with session {session_id}")
            
            # Sprawdź czy sesja istnieje w Redis
            session_data = session_manager.get_game_session(session_id)
            if session_data:
                return Response({
                    'success': True,
                    'can_reconnect': True,
                    'session_id': session_id,
                    'room_id': room_id,
                    'player_data': {
                        'player_id': session_data.get('player_id'),
                        'color': session_data.get('color'),
                        'display_name': session_data.get('display_name')
                    }
                })
            else:
                print(f"❌ Session {session_id} not found in Redis")
                return Response({
                    'success': False,
                    'can_reconnect': False,
                    'error': 'Session expired'
                }, status=status.HTTP_400_BAD_REQUEST)
        else:
            print(f"❌ No active session found for user {request.user} in room {room_id}")
            return Response({
                'success': False,
                'can_reconnect': False,
                'error': 'No active session found'
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.exception("Error in reconnect_to_game")
        print(f"❌ Error in reconnect_to_game: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)