import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import SimpleGameService from "../../view/board/SimpleGameService";

// ✅ DOKŁADNIE jak SimpleOnlineGame - bez scrollowania, kompaktowo
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
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
`;

const GameTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const Title = styled.h1`
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: #1e293b;
`;

const GameInfo = styled.div`
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
`;

const LeaveButton = styled.button`
  background: #ef4444;
  color: white;
  border: none;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #dc2626;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
  }
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  min-height: 0;
`;

const LobbyContainer = styled.div`
  max-width: 520px;
  width: 100%;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  overflow: hidden;
`;

const Panel = styled.div`
  padding: 18px 20px;
  border-bottom: 1px solid #f1f5f9;

  &:last-child {
    border-bottom: none;
  }
`;

const SectionHeader = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #64748b;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const RoomCode = styled.div`
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  text-align: center;
`;

const RoomCodeValue = styled.div`
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  font-family: "Monaco", "Menlo", monospace;
  margin-bottom: 6px;
  letter-spacing: 2px;
`;

const RoomCodeSubtext = styled.div`
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
`;

const PlayersList = styled.div`
  display: grid;
  gap: 8px;
  max-height: 140px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: #f8fafc;
    border-radius: 2px;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 2px;
  }
`;

const PlayerCard = styled.div<{ $isActive: boolean; $color: string }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${(props) => (props.$isActive ? props.$color : "#e2e8f0")};
  background: ${(props) => (props.$isActive ? `${props.$color}08` : "white")};
  transition: all 0.2s;

  &:hover {
    border-color: ${(props) => props.$color};
    background: ${(props) => `${props.$color}05`};
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }
`;

const PlayerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PlayerName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
`;

const PlayerColor = styled.div<{ color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: ${props => props.color};
`;

const YouLabel = styled.div`
  color: #64748b;
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatusMessage = styled.div<{ type?: "success" | "info" }>`
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;

  ${(props) =>
    props.type === "success"
      ? `
    background: #f0fdf4;
    border-color: #bbf7d0;
    color: #166534;
  `
      : `
    background: #f0f9ff;
    border-color: #bae6fd;
    color: #0c4a6e;
  `}
`;

const ErrorMessage = styled.div`
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
`;

const EmptyState = styled.div`
  text-align: center;
  color: #64748b;
  font-style: italic;
  padding: 16px;
  font-size: 13px;
  font-weight: 500;
`;

const InfoText = styled.div`
  font-size: 12px;
  color: #64748b;
  text-align: center;
  margin-bottom: 14px;
  line-height: 1.4;
  font-weight: 500;
`;

const StartButton = styled.button`
  background: #3b82f6;
  color: white;
  border: none;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  width: 100%;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover:not(:disabled) {
    background: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  &:disabled {
    background: #f8fafc;
    color: #94a3b8;
    cursor: not-allowed;
    border: 1px solid #e2e8f0;
    transform: none;
    box-shadow: none;
  }
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

const LoadingMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 16px;
  color: #64748b;
  gap: 16px;
`;

interface RoomLobbyProps {
  roomId: string;
  useSimpleService?: boolean;
}

interface Player {
  id: string;
  color: string;
  display_name?: string;
}

export default function RoomLobby({
  roomId,
  useSimpleService = false,
}: RoomLobbyProps) {
  const gameService = SimpleGameService;

  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const connectToRoom = async () => {
      try {
        setStatus(`Connecting to room ${roomId}...`);

        if (!gameService.isConnected()) {
          await gameService.connectToRoom(roomId);
        }
        setStatus(`Connected to room ${roomId}. Waiting for players...`);
        setIsLoading(false);

        try {
          const id = await gameService.getClientId();
          setMyPlayerId(id);
          console.log("My player ID:", id);
        } catch (idErr) {
          console.warn("Failed to get client ID immediately:", idErr);
        }

        gameService.getGameState();
      } catch (err) {
        console.error("Room connection error:", err);
        setError(
          "Failed to connect to room. Please make sure the server is running."
        );
        setIsLoading(false);
      }
    };

    connectToRoom();

    const handlePlayerJoined = (data: any) => {
      console.log("Player joined event:", data);
      if (data.player_id && data.player_color) {
        setPlayers((prevPlayers) => {
          const playerExists = prevPlayers.some((p) => p.id === data.player_id);
          if (!playerExists) {
            setStatus(
              `Player ${data.player_id.substring(0, 6)}... joined (${data.player_count
              }/4 players)`
            );
            return [
              ...prevPlayers,
              {
                id: data.player_id,
                color: data.player_color || "#64748b",
              },
            ];
          }
          return prevPlayers;
        });
      }
    };

    const handlePlayerLeft = (data: any) => {
      console.log("Player left event:", data);
      if (data.player_id) {
        setPlayers((prevPlayers) => {
          const filtered = prevPlayers.filter((p) => p.id !== data.player_id);
          setStatus(
            `Player ${data.player_id.substring(0, 6)}... left (${data.player_count
            }/4 players)`
          );
          return filtered;
        });
      }
    };

    const handleGameStart = (data: any) => {
      console.log("Game start event:", data);
      setStatus("Game is starting! Redirecting to game board...");

      let gameRoomId = roomId;

      if (!gameRoomId) {
        gameRoomId = window.location.pathname.split("/").pop() || "";
        console.log("Extracted roomId from URL:", gameRoomId);
      }

      if (gameRoomId) {
        navigate(`/game/${gameRoomId}`, {
          state: {
            gameState: data.game_state,
            roomId: gameRoomId,
          },
        });
      } else {
        console.error("Missing roomId, cannot navigate to game");
        setError("Missing room ID, cannot start game");
      }
    };

    const handleGameState = (data: any) => {
      console.log("🎮 Game state update:", data);
      if (data.game_state && data.game_state.players) {
        let playersList = [];

        if (Array.isArray(data.game_state.players)) {
          playersList = data.game_state.players.map((p: any) => ({
            id: p.id || p.player_id,
            color: p.color || "#64748b",
            display_name: p.display_name || `Player ${(p.id || p.player_id).substring(0, 8)}`
          }));
        } else {
          playersList = Object.values(data.game_state.players).map(
            (p: any) => ({
              id: p.id || p.player_id,
              color: p.color || "#64748b",
              display_name: p.display_name || `Player ${(p.id || p.player_id).substring(0, 8)}`
            })
          );
        }

        console.log("👥 Setting players:", playersList);
        setPlayers(playersList);
      }
    };

    const handleError = (data: any) => {
      console.error("Received error:", data);
      setError(data.message || "An unknown error occurred");
    };

    const handleClientId = (data: any) => {
      if (data.player_id) {
        setMyPlayerId(data.player_id);
        console.log("Received client ID:", data.player_id);
      }
    };

    gameService.addEventHandler("player_joined", handlePlayerJoined);
    gameService.addEventHandler("player_left", handlePlayerLeft);
    gameService.addEventHandler("game_start", handleGameStart);
    gameService.addEventHandler("game_state", handleGameState);
    gameService.addEventHandler("error", handleError);
    gameService.addEventHandler("client_id", handleClientId);

    return () => {
      gameService.removeEventHandler("player_joined", handlePlayerJoined);
      gameService.removeEventHandler("player_left", handlePlayerLeft);
      gameService.removeEventHandler("game_start", handleGameStart);
      gameService.removeEventHandler("game_state", handleGameState);
      gameService.removeEventHandler("error", handleError);
      gameService.removeEventHandler("client_id", handleClientId);
    };
  }, [roomId, navigate]);

  const handleLeaveRoom = () => {
    gameService.disconnectFromRoom();
    navigate("/");
  };

  const handleStartGame = () => {
    gameService.sendMessage({
      type: "start_game_manual",
    });
  };

  if (isLoading) {
    return (
      <LoadingMessage>
        <LoadingSpinner />
        Connecting to room {roomId}...
      </LoadingMessage>
    );
  }

  const canStartGame = players.length >= 2 && players.length < 4;

  return (
    <AppContainer>
      <TopBar>
        <LeftSection>
          <GameTitle>
            <Title>Catan</Title>
            <GameInfo>
              Room: {roomId} • {players.length} players
            </GameInfo>
          </GameTitle>
        </LeftSection>
        <LeaveButton onClick={handleLeaveRoom}>Leave Room</LeaveButton>
      </TopBar>

      <MainContent>
        <LobbyContainer>
          <Panel>
            <SectionHeader>🏠 Room Code</SectionHeader>
            <RoomCode>
              <RoomCodeValue>{roomId}</RoomCodeValue>
              <RoomCodeSubtext>
                Share this code with others to join
              </RoomCodeSubtext>
            </RoomCode>
          </Panel>

          {status && (
            <Panel>
              <StatusMessage
                type={status.includes("starting") ? "success" : "info"}
              >
                {status.includes("starting") ? "🚀" : "ℹ️"} {status}
              </StatusMessage>
            </Panel>
          )}

          {error && (
            <Panel>
              <ErrorMessage>⚠️ {error}</ErrorMessage>
            </Panel>
          )}

          <Panel>
            <SectionHeader>👥 Players ({players.length}/4)</SectionHeader>
            <PlayersList>
              {players.length === 0 ? (
                <EmptyState>Waiting for players to join...</EmptyState>
              ) : (
                players.map((player) => (
                  <PlayerCard
                    key={player.id}
                    $color={player.color}
                    $isActive={player.id === myPlayerId}
                  >
                    <PlayerInfo>
                      <PlayerName>{player.display_name || player.id}</PlayerName>
                      <PlayerColor color={player.color} />
                    </PlayerInfo>
                    {player.id === myPlayerId && <YouLabel>You</YouLabel>}
                  </PlayerCard>
                ))
              )}
            </PlayersList>
          </Panel>

          <Panel>
            <InfoText>
              🎮 Game will start automatically when 4 players join, or you can
              start manually with 2-3 players
            </InfoText>

            {canStartGame && (
              <StartButton onClick={handleStartGame}>
                🚀 Start Game with {players.length} Players
              </StartButton>
            )}
          </Panel>
        </LobbyContainer>
      </MainContent>
    </AppContainer>
  );
}
