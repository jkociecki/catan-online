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
  background-color: ${props => props.color || '#333333'};
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

const StatusMessage = styled.div`
  margin: 10px 0;
  padding: 10px;
  background-color: #e8f5e9;
  border-radius: 4px;
  border: 1px solid #c8e6c9;
  color: #2e7d32;
`;

const ErrorMessage = styled.div`
  color: red;
  margin: 10px 0;
  padding: 10px;
  background-color: #ffeeee;
  border-radius: 4px;
  border: 1px solid #ffcccc;
`;

const LeaveButton = styled.button`
  background-color: #f44336;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 20px;
  
  &:hover {
    background-color: #d32f2f;
  }
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
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const connectToRoom = async () => {
      try {
        setStatus(`Connecting to room ${roomId}...`);
        await GameService.connectToRoom(roomId);
        setStatus(`Connected to room ${roomId}. Waiting for players...`);
        setIsLoading(false);
        
        // Request client ID
        const myId = await GameService.getClientId();
        console.log("My player ID:", myId);
      } catch (err) {
        console.error("Room connection error:", err);
        setError('Failed to connect to room. The room may not exist.');
        setIsLoading(false);
      }
    };

    if (!GameService.isConnected()) {
      connectToRoom();
    } else {
      setIsLoading(false);
    }

    // Set up event handlers
    const handlePlayerJoined = (data: any) => {
      console.log("Player joined event:", data);
      setPlayers(prevPlayers => {
        const playerExists = prevPlayers.some(p => p.id === data.player_id);
        if (!playerExists) {
          setStatus(`Player ${data.player_id.substring(0, 6)}... joined. (${data.player_count}/4 players)`);
          return [...prevPlayers, { 
            id: data.player_id, 
            color: data.player_color || '#333333'
          }];
        }
        return prevPlayers;
      });
    };

    const handlePlayerLeft = (data: any) => {
      console.log("Player left event:", data);
      setPlayers(prevPlayers => {
        const filtered = prevPlayers.filter(p => p.id !== data.player_id);
        setStatus(`Player ${data.player_id.substring(0, 6)}... left. (${data.player_count}/4 players)`);
        return filtered;
      });
    };

    const handleGameStart = (data: any) => {
      console.log("Game start event:", data);
      setStatus("Game is starting! Redirecting to game board...");
      
      // Navigate to game board when the game starts
      navigate('/game', { 
        state: { 
          gameState: data.game_state, 
          roomId 
        }
      });
    };

    const handleError = (data: any) => {
      console.error("Received error:", data);
      setError(data.message || "An unknown error occurred");
    };

    // Check if we already have players (from previous connections)
    GameService.sendMessage({
      type: 'get_game_state'
    });

    GameService.addEventHandler('player_joined', handlePlayerJoined);
    GameService.addEventHandler('player_left', handlePlayerLeft);
    GameService.addEventHandler('game_start', handleGameStart);
    GameService.addEventHandler('error', handleError);
    GameService.addEventHandler('game_state', (data) => {
      if (data.game_state && data.game_state.players) {
        setPlayers(data.game_state.players.map((p: any) => ({
          id: p.id,
          color: p.color || '#333333'
        })));
      }
    });

    // Cleanup
    return () => {
      GameService.removeEventHandler('player_joined', handlePlayerJoined);
      GameService.removeEventHandler('player_left', handlePlayerLeft);
      GameService.removeEventHandler('game_start', handleGameStart);
      GameService.removeEventHandler('error', handleError);
    };
  }, [roomId, navigate]);

  const handleLeaveRoom = () => {
    GameService.disconnectFromRoom();
    navigate('/');
  };

  if (isLoading) {
    return <LobbyContainer>
      <h2>Game Lobby</h2>
      <div>Connecting to room {roomId}...</div>
    </LobbyContainer>;
  }

  return (
    <LobbyContainer>
      <h2>Game Lobby</h2>
      <RoomCode>
        <p>Room Code: <strong>{roomId}</strong></p>
        <p>Share this code with others to join</p>
      </RoomCode>
      
      {status && <StatusMessage>{status}</StatusMessage>}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      
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
      
      <LeaveButton onClick={handleLeaveRoom}>
        Leave Room
      </LeaveButton>
    </LobbyContainer>
  );
}