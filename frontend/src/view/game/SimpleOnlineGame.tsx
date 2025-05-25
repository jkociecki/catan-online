// frontend/src/view/game/SimpleOnlineGame.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import SimpleGameService from "../../view/board/SimpleGameService"; // NOWY SERVICE
import OnlineCatanSVGBoard from "../board/OnlineCatanSVGBoard"; // NOWY BOARD
import styled from "styled-components";
import PlayersList from "./PlayerList";
import GameActions from "./GameActions";

// Skopiuj wszystkie styled components z OnlineGame.tsx
const GameContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  padding: 20px;
  max-width: 1200px;
`;

const GameHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const BoardContainer = styled.div`
  flex: 2;
  position: relative;
`;

const SidePanel = styled.div`
  flex: 1;
  padding: 0 20px;
`;

const GameLayout = styled.div`
  display: flex;
  flex-direction: row;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const GameStatus = styled.div`
  background-color: #f0f0f0;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 15px;
  text-align: center;
`;

const LeaveButton = styled.button`
  background-color: #f44336;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: #d32f2f;
  }
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 40px;
  font-size: 20px;
  color: #666;
`;

const ErrorMessage = styled.div`
  background-color: #ffeeee;
  color: #d32f2f;
  padding: 15px;
  border-radius: 5px;
  margin: 20px 0;
  border: 1px solid #ffcccc;
`;

const SuccessIndicator = styled.div<{ show: boolean }>`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(76, 175, 80, 0.9);
  color: white;
  padding: 15px 30px;
  border-radius: 50px;
  font-weight: bold;
  font-size: 18px;
  opacity: ${(props) => (props.show ? 1 : 0)};
  transition: opacity 0.5s;
  z-index: 1000;
  pointer-events: none;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
`;

export default function SimpleOnlineGame() {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomId: urlRoomId } = useParams();

  const roomId = urlRoomId || location.state?.roomId;
  const initialGameState = location.state?.gameState;

  // State
  const [gameState, setGameState] = useState<any>(initialGameState);
  const [currentPlayerId, setCurrentPlayerId] = useState<string>("");
  const [players, setPlayers] = useState<any[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string>("");
  const [buildMode, setBuildMode] = useState<"settlement" | "road" | null>(
    null
  );
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [gamePhase, setGamePhase] = useState<string>("setup");
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>("");

  // Znajdź kolor mojego gracza
  const myColor = players.find((p) => p.id === myPlayerId)?.color || "red";

  const showSuccessIndicator = useCallback((message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 2000);
  }, []);

  // Sprawdź czy roomId istnieje
  useEffect(() => {
    if (!roomId) {
      console.error("Missing roomId in SimpleOnlineGame");
      navigate("/");
    }
  }, [roomId, navigate]);

  // Połączenie WebSocket
  useEffect(() => {
    if (!roomId) {
      navigate("/");
      return;
    }

    const setupConnection = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!SimpleGameService.isConnected()) {
          console.log(`Connecting to room: ${roomId}`);
          await SimpleGameService.connectToRoom(roomId);
          setIsConnected(true);
        } else {
          setIsConnected(true);
        }

        SimpleGameService.getGameState();

        try {
          const clientId = await SimpleGameService.getClientId();
          console.log("Got client ID:", clientId);
          setMyPlayerId(clientId);
        } catch (err) {
          console.warn("Could not get client ID immediately:", err);
        }

        setLoading(false);
      } catch (err) {
        console.error("Connection error:", err);
        setError(
          `Connection error: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
        setIsConnected(false);
        setLoading(false);
      }
    };

    setupConnection();
  }, [roomId, navigate]);

  // Event handlers
  useEffect(() => {
    const handleGameUpdate = (data: any) => {
      console.log("Game update received:", data);

      if (data.action) {
        const actionMessages: { [key: string]: string } = {
          build_settlement: "Osada zbudowana!",
          build_city: "Miasto zbudowane!",
          build_road: "Droga zbudowana!",
          end_turn: "Tura zakończona",
        };

        if (actionMessages[data.action] && data.player_id === myPlayerId) {
          showSuccessIndicator(actionMessages[data.action]);
        }
      }

      if (data.game_state) {
        setGameState(data.game_state);

        if (data.game_state.phase) {
          setGamePhase(data.game_state.phase);
        }

        // Konwertuj graczy do formatu zgodnego z PlayersList
        if (data.game_state.players) {
          const playersList = Object.values(data.game_state.players).map(
            (p: any) => ({
              id: p.player_id,
              color: p.color,
              resources: p.resources || {},
              victory_points: p.victory_points || 0,
              settlements_left: p.settlements_left || 5,
              cities_left: p.cities_left || 4,
              roads_left: p.roads_left || 15,
            })
          );
          setPlayers(playersList);

          // Ustaw aktualnego gracza
          if (
            data.game_state.current_player_index !== undefined &&
            data.game_state.player_order
          ) {
            const currentPlayerIndex = data.game_state.current_player_index;
            const playerOrder = data.game_state.player_order;
            if (playerOrder[currentPlayerIndex]) {
              setCurrentPlayerId(playerOrder[currentPlayerIndex]);
            }
          }
        }
      }

      if (data.action === "end_turn") {
        setBuildMode(null);
      }
    };

    const handleGameState = (data: any) => {
      console.log("Game state received:", data);
      if (data.game_state) {
        handleGameUpdate(data); // Użyj tej samej logiki
      }
    };

    const handleClientId = (data: any) => {
      if (data.player_id) {
        console.log("Received client ID:", data.player_id);
        setMyPlayerId(data.player_id);
      }
    };

    const handlePlayerJoined = (data: any) => {
      console.log("Player joined:", data);
      SimpleGameService.getGameState();
    };

    const handleDiceRoll = (data: any) => {
      console.log("Dice roll:", data);
      if (data.total) {
        setDiceResult(data.total);
        if (data.player_id === myPlayerId) {
          showSuccessIndicator(`Wyrzucono ${data.total}!`);
        }
      }

      setTimeout(() => {
        setDiceResult(null);
      }, 3000);
    };

    const handleError = (data: any) => {
      console.error("Game error:", data.message);
      setError(data.message || "An unknown error occurred");
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setError("Disconnected from game server. Try refreshing the page.");
    };

    // Register event handlers
    if (isConnected) {
      SimpleGameService.addEventHandler("game_update", handleGameUpdate);
      SimpleGameService.addEventHandler("game_state", handleGameState);
      SimpleGameService.addEventHandler("client_id", handleClientId);
      SimpleGameService.addEventHandler("player_joined", handlePlayerJoined);
      SimpleGameService.addEventHandler("dice_roll", handleDiceRoll);
      SimpleGameService.addEventHandler("error", handleError);
      SimpleGameService.addEventHandler("disconnect", handleDisconnect);
    }

    return () => {
      if (isConnected) {
        SimpleGameService.removeEventHandler("game_update", handleGameUpdate);
        SimpleGameService.removeEventHandler("game_state", handleGameState);
        SimpleGameService.removeEventHandler("client_id", handleClientId);
        SimpleGameService.removeEventHandler(
          "player_joined",
          handlePlayerJoined
        );
        SimpleGameService.removeEventHandler("dice_roll", handleDiceRoll);
        SimpleGameService.removeEventHandler("error", handleError);
        SimpleGameService.removeEventHandler("disconnect", handleDisconnect);
      }
    };
  }, [isConnected, myPlayerId, showSuccessIndicator]);

  // Helper functions
  const getMyResources = useCallback(() => {
    const myPlayer = players.find((p) => p.id === myPlayerId);
    return myPlayer ? myPlayer.resources : {};
  }, [players, myPlayerId]);

  const isMyTurn = useCallback(() => {
    return myPlayerId === currentPlayerId;
  }, [myPlayerId, currentPlayerId]);

  const canBuildSettlement = useCallback(() => {
    const myPlayer = players.find((p) => p.id === myPlayerId);
    if (!myPlayer) return false;

    if (gamePhase === "setup") {
      return true;
    }

    const resources = myPlayer.resources || {};
    return (
      myPlayer.settlements_left > 0 &&
      resources.wood >= 1 &&
      resources.brick >= 1 &&
      resources.sheep >= 1 &&
      resources.wheat >= 1
    );
  }, [players, myPlayerId, gamePhase]);

  const canBuildCity = useCallback(() => {
    const myPlayer = players.find((p) => p.id === myPlayerId);
    if (!myPlayer) return false;

    if (gamePhase === "setup") {
      return false;
    }

    const resources = myPlayer.resources || {};
    return (
      myPlayer.cities_left > 0 && resources.ore >= 3 && resources.wheat >= 2
    );
  }, [players, myPlayerId, gamePhase]);

  const canBuildRoad = useCallback(() => {
    const myPlayer = players.find((p) => p.id === myPlayerId);
    if (!myPlayer) return false;

    if (gamePhase === "setup") {
      return true;
    }

    const resources = myPlayer.resources || {};
    return (
      myPlayer.roads_left > 0 && resources.wood >= 1 && resources.brick >= 1
    );
  }, [players, myPlayerId, gamePhase]);

  const handleVertexClick = useCallback(
    (vertexId: number) => {
      console.log("click attempted", { isMyTurn, buildMode });

      if (!isMyTurn || buildMode !== "settlement") return;
      console.log("Vertex clicked:", vertexId);

      if (buildMode === "settlement") {
        SimpleGameService.buildSettlement(vertexId);
        showSuccessIndicator(
          `Budowanie ${buildMode === "settlement" ? "osady" : "miasta"}...`
        );
      }
    },
    [isMyTurn, buildMode, showSuccessIndicator]
  );

  const handleEdgeClick = useCallback(
    (edgeId: number) => {
      if (!isMyTurn() || buildMode !== "road") return;

      console.log("Edge clicked:", edgeId);
      SimpleGameService.buildRoad(edgeId);
      showSuccessIndicator("Budowanie drogi...");
    },
    [isMyTurn, buildMode, showSuccessIndicator]
  );

  const handleLeaveGame = () => {
    SimpleGameService.disconnectFromRoom();
    navigate("/");
  };

  if (loading) {
    return <LoadingMessage>Wczytywanie gry...</LoadingMessage>;
  }

  if (error) {
    return <ErrorMessage>{error}</ErrorMessage>;
  }

  return (
    <GameContainer>
      <GameHeader>
        <h2>Simple Catan Online - Room: {roomId}</h2>
        <LeaveButton onClick={handleLeaveGame}>Opuść grę</LeaveButton>
      </GameHeader>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <div
        style={{
          backgroundColor: "#f5f5f5",
          padding: "15px",
          marginBottom: "15px",
          borderRadius: "5px",
          textAlign: "center",
          borderLeft: `5px solid ${isMyTurn() ? "#4CAF50" : "#2196F3"}`,
        }}
      >
        {isMyTurn()
          ? "Twoja tura - wykonaj akcję"
          : `Tura gracza - poczekaj na swoją kolej`}
      </div>

      <SuccessIndicator show={showSuccess}>{successMessage}</SuccessIndicator>

      {diceResult && (
        <GameStatus>
          <h3>Wynik rzutu: {diceResult}</h3>
        </GameStatus>
      )}

      <GameLayout>
        <BoardContainer>
          <OnlineCatanSVGBoard
            gameState={gameState}
            onVertexClick={handleVertexClick}
            onEdgeClick={handleEdgeClick}
            buildMode={buildMode}
            myPlayerId={myPlayerId}
            myColor={myColor}
            gamePhase={gamePhase}
            isMyTurn={isMyTurn()}
          />
        </BoardContainer>

        <SidePanel>
          <PlayersList
            players={players}
            currentPlayerId={currentPlayerId}
            isMyTurn={isMyTurn()}
          />
          <GameActions
            isMyTurn={isMyTurn()}
            myResources={getMyResources()}
            canBuildSettlement={canBuildSettlement()}
            canBuildCity={canBuildCity()}
            canBuildRoad={canBuildRoad()}
            gamePhase={gamePhase}
            players={players}
            myPlayerId={myPlayerId}
          />
        </SidePanel>
      </GameLayout>
    </GameContainer>
  );
}
