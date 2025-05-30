import React, { useState } from "react";
import SimpleGameService from "../board/SimpleGameService";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

// ✅ DOKŁADNIE jak SimpleOnlineGame - kompaktowo, profesjonalnie
const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #fafafa;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
    sans-serif;
  color: #1e293b;
  overflow: hidden;
`;

const TopBar = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 24px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
`;

const Title = styled.h1`
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: #1e293b;
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const Container = styled.div`
  max-width: 450px;
  width: 100%;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  overflow: hidden;
`;

const Section = styled.div`
  padding: 20px;
  border-bottom: 1px solid #f1f5f9;

  &:last-child {
    border-bottom: none;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;

const SectionIcon = styled.span`
  font-size: 16px;
  width: 20px;
  display: flex;
  justify-content: center;
`;

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: #1e293b;
`;

const SectionDescription = styled.p`
  font-size: 13px;
  color: #64748b;
  margin: 0 0 16px 0;
  line-height: 1.4;
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  margin: 8px 0 16px 0;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  background: #fafafa;
  color: #1e293b;
  transition: all 0.2s;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    background: white;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:disabled {
    background: #f1f5f9;
    color: #94a3b8;
    cursor: not-allowed;
  }

  &::placeholder {
    color: #94a3b8;
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;

  &:hover:not(:disabled) {
    background: #2563eb;
    border-color: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  &:disabled {
    background: #f8fafc;
    border-color: #e2e8f0;
    color: #94a3b8;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const StatusMessage = styled.div`
  margin: 16px 20px;
  padding: 12px 16px;
  background: #f0f9ff;
  border-radius: 8px;
  border: 1px solid #bae6fd;
  color: #0c4a6e;
  font-size: 13px;
  font-weight: 500;
`;

const ErrorMessage = styled.div`
  color: #dc2626;
  margin: 16px 20px;
  padding: 12px 16px;
  background: #fef2f2;
  border-radius: 8px;
  border: 1px solid #fecaca;
  font-size: 13px;
  font-weight: 500;
`;

const LoadingSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid #f1f5f9;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
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
      const newRoomId = await SimpleGameService.createRoom();
      const normalizedRoomId = newRoomId.toLowerCase();

      setStatus(`Room created! Room ID: ${normalizedRoomId}. Connecting...`);

      try {
        await SimpleGameService.connectToRoom(normalizedRoomId);
        setStatus(`Connected to room ${normalizedRoomId}! Redirecting...`);
        navigate(`/room/${normalizedRoomId}`);
      } catch (connectError) {
        console.error("Error connecting to room:", connectError);
        setError(
          `Created room but couldn't connect. Please try joining with room ID: ${normalizedRoomId}`
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

    const normalizedRoomId = roomId.trim().toLowerCase();

    setIsLoading(true);
    setError(null);
    setStatus(`Connecting to room ${normalizedRoomId}...`);

    try {
      await SimpleGameService.connectToRoom(normalizedRoomId);
      setStatus(`Connected to room ${normalizedRoomId}! Redirecting...`);
      navigate(`/room/${normalizedRoomId}`);
    } catch (err) {
      console.error("Room join error:", err);
      setError(
        "Failed to join room - make sure the server is running and the room ID is correct"
      );
      setIsLoading(false);
    }
  };

  return (
    <AppContainer>
      <TopBar>
        <Title>Catan</Title>
      </TopBar>

      <MainContent>
        <Container>
          <Section>
            <SectionHeader>
              <SectionIcon>✨</SectionIcon>
              <SectionTitle>Create New Game</SectionTitle>
            </SectionHeader>
            <SectionDescription>
              Start a new game room and share the code with friends
            </SectionDescription>
            <Button onClick={handleCreate} disabled={isLoading}>
              {isLoading ? (
                <>
                  <LoadingSpinner />
                  Creating...
                </>
              ) : (
                "Create Game Room"
              )}
            </Button>
          </Section>

          <Section>
            <SectionHeader>
              <SectionIcon>🚪</SectionIcon>
              <SectionTitle>Join Existing Game</SectionTitle>
            </SectionHeader>
            <SectionDescription>
              Enter a room code to join a friend's game
            </SectionDescription>
            <Input
              type="text"
              placeholder="Enter Room Code"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toLowerCase())}
              disabled={isLoading}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !isLoading) {
                  handleJoin();
                }
              }}
            />
            <Button onClick={handleJoin} disabled={isLoading || !roomId.trim()}>
              {isLoading ? (
                <>
                  <LoadingSpinner />
                  Joining...
                </>
              ) : (
                "Join Game"
              )}
            </Button>
          </Section>

          {status && <StatusMessage>{status}</StatusMessage>}
          {error && <ErrorMessage>{error}</ErrorMessage>}
        </Container>
      </MainContent>
    </AppContainer>
  );
}
