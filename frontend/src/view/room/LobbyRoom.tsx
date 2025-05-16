import React, { useState, useEffect } from 'react';
import GameService from '../../engine/board/GameService';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const LobbyContainer = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  text-align: center;
`;

const PlayerList = styled.div`
  margin: 20px 0;
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 5px;
`;

const PlayerItem = styled.div<{ color: string }>`
  padding: 10px;
  margin: 5px 0;
  background-color: ${props => props.color};
  color: white;
  border-radius: 3px;
`;

const RoomCode = styled.div`
  padding: 15px;
  margin: 20px 0;
  background-color: #eee;
  font-size: 24px;
  border-radius: 5px;
`;

interface RoomLobbyProps {
  roomId: string;
}

interface Player {
  id: string;
  color: string;
}

export default function RoomLobby({ roomId }: RoomLobbyProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const connectToRoom = async () => {
      try {
        await GameService.connectToRoom(roomId);
        setIsLoading(false);
      } catch (err) {
        setError('Failed to connect to room');
        setIsLoading(false);
      }
    };

    connectToRoom();

    // Set up event handlers
    const handlePlayerJoined = (data: any) => {
      setPlayers(prevPlayers => {
        const playerExists = prevPlayers.some(p => p.id === data.player_id);
        if (!playerExists) {
          return [...prevPlayers, { id: data.player_id, color: data.player_color }];
        }
        return prevPlayers;
      });
    };

    const handlePlayerLeft = (data: any) => {
      setPlayers(prevPlayers => prevPlayers.filter(p => p.id !== data.player_id));
    };

    const handleGameStart = (data: any) => {
      // Navigate to game board when the game starts
      navigate('/game', { state: { gameState: data.game_state, roomId } });
    };

    const handleError = (data: any) => {
      setError(data.message);
    };

    GameService.addEventHandler('player_joined', handlePlayerJoined);
    GameService.addEventHandler('player_left', handlePlayerLeft);
    GameService.addEventHandler('game_start', handleGameStart);
    GameService.addEventHandler('error', handleError);

    // Cleanup
    return () => {
      GameService.removeEventHandler('player_joined', handlePlayerJoined);
      GameService.removeEventHandler('player_left', handlePlayerLeft);
      GameService.removeEventHandler('game_start', handleGameStart);
      GameService.removeEventHandler('error', handleError);
      GameService.disconnectFromRoom();
    };
  }, [roomId, navigate]);

  if (isLoading) {
    return <div>Connecting to room...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <LobbyContainer>
      <h2>Game Lobby</h2>
      <RoomCode>
        <p>Room Code: <strong>{roomId}</strong></p>
        <p>Share this code with others to join</p>
      </RoomCode>
      
      <h3>Players ({players.length}/4)</h3>
      <PlayerList>
        {players.length === 0 ? (
          <p>Waiting for players to join...</p>
        ) : (
          players.map(player => (
            <PlayerItem key={player.id} color={player.color}>
              Player {player.id.substring(0, 6)}...
            </PlayerItem>
          ))
        )}
      </PlayerList>
      
      <p>Game will start automatically when 4 players join</p>
    </LobbyContainer>
  );
}