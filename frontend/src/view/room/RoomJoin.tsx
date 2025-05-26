import React, { useState } from "react";
import SimpleGameService from "../board/SimpleGameService";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

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

  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
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
  padding: 10px;
  background-color: #ffeeee;
  border-radius: 4px;
  border: 1px solid #ffcccc;
`;

const LoadingIndicator = styled.div`
  margin: 20px 0;
  color: #333;
  font-style: italic;
`;

const StatusMessage = styled.div`
  margin: 10px 0;
  padding: 10px;
  background-color: #e8f5e9;
  border-radius: 4px;
  border: 1px solid #c8e6c9;
  color: #2e7d32;
`;

export default function RoomJoin() {
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async () => {
    setIsLoading(true);
    setError(null);
    setStatus("Creating a new game room...");

    try {
      // First create a room
      const newRoomId = await SimpleGameService.createRoom();
      setStatus(`Room created! Room ID: ${newRoomId}. Connecting...`);

      // Then connect to it via WebSocket
      try {
        await SimpleGameService.connectToRoom(newRoomId);
        setStatus(`Connected to room ${newRoomId}! Redirecting...`);

        // Poprawione przekierowanie - upewnij się, że URL ma ID pokoju
        navigate(`/room/${newRoomId}`);
      } catch (connectError) {
        console.error("Error connecting to room:", connectError);
        setError(
          `Created room but couldn't connect. Please try joining with room ID: ${newRoomId}`
        );
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Room creation error:", err);
      setError(err instanceof Error ? err.message : "Failed to create room");
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!roomId.trim()) {
      setError("Please enter a room code");
      return;
    }

    setIsLoading(true);
    setError(null);
    setStatus(`Connecting to room ${roomId}...`);

    try {
      await SimpleGameService.connectToRoom(roomId);
      setStatus(`Connected to room ${roomId}! Redirecting...`);
      navigate(`/room/${roomId}`);
    } catch (err) {
      console.error("Room join error:", err);
      setError(
        "Failed to join room - make sure the server is running and the room ID is correct"
      );
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

      {status && <StatusMessage>{status}</StatusMessage>}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {isLoading && (
        <LoadingIndicator>Loading... Please wait.</LoadingIndicator>
      )}
    </Container>
  );
}
