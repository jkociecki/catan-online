import React, { useState } from 'react';
import GameService from '../../engine/board/GameService';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const Container = styled.div`
  max-width: 500px;
  margin: 50px auto;
  padding: 20px;
  background-color: #f8f8f8;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const Button = styled.button`
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 10px 15px;
  margin: 10px 5px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  
  &:hover {
    background-color: #45a049;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
`;

const ErrorMessage = styled.div`
  color: red;
  margin: 10px 0;
`;

export default function RoomJoin() {
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const newRoomId = await GameService.createRoom();
      navigate(`/room/${newRoomId}`);
    } catch (err) {
      setError('Failed to create room');
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!roomId.trim()) {
      setError('Please enter a room code');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await GameService.connectToRoom(roomId);
      navigate(`/room/${roomId}`);
    } catch (err) {
      setError('Failed to join room - room might not exist');
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <h2>Catan Online</h2>
      
      <div>
        <h3>Create a New Game</h3>
        <Button onClick={handleCreate} disabled={isLoading}>
          Create Game Room
        </Button>
      </div>
      
      <div>
        <h3>Join Existing Game</h3>
        <Input
          type="text"
          placeholder="Enter Room Code"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          disabled={isLoading}
        />
        <Button onClick={handleJoin} disabled={isLoading}>
          Join Game
        </Button>
      </div>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {isLoading && <div>Loading...</div>}
    </Container>
  );
}