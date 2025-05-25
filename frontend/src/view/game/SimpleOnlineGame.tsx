// frontend/src/view/game/SimpleOnlineGame.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import SimpleGameService from "../../view/board/SimpleGameService";
import OnlineCatanSVGBoard from "../board/OnlineCatanSVGBoard";
import styled from "styled-components";
import PlayersList from "./PlayerList";
import GameActions from "./GameActions";

// Wszystkie styled components...
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

const TestButtons = styled.div`
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
`;

const TestButton = styled.button<{ active?: boolean }>`
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  background-color: ${(props) => (props.active ? "#4CAF50" : "#f0f0f0")};
  color: ${(props) => (props.active ? "white" : "black")};

  &:hover {
    opacity: 0.8;
  }
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

        // Komunikat o zmianie tury
        if (data.turn_advanced && data.new_current_player) {
          if (data.new_current_player === myPlayerId) {
            showSuccessIndicator("Twoja tura!");
          } else {
            showSuccessIndicator("Tura przeszła do następnego gracza");
          }
        }

        // Komunikat o zakończeniu setup
        if (data.setup_complete) {
          showSuccessIndicator(
            "Faza przygotowania zakończona! Rozpoczyna się gra!"
          );
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

      // Automatycznie wyczyść build mode po postawieniu drogi w setup
      if (data.action === "build_road" && gamePhase === "setup") {
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

  // POPRAWIONE HANDLERY - używają isMyTurn() jako funkcji
  const handleVertexClick = useCallback(
    (vertexId: number) => {
      console.log("Vertex click handler called:", {
        vertexId,
        isMyTurn: isMyTurn(),
        buildMode,
        myPlayerId,
        currentPlayerId,
      });

      if (!isMyTurn() || buildMode !== "settlement") {
        console.log("Click rejected in handler");
        return;
      }

      console.log("Processing vertex click:", vertexId);
      SimpleGameService.buildSettlement(vertexId);
      showSuccessIndicator("Budowanie osady...");
    },
    [isMyTurn, buildMode, showSuccessIndicator, myPlayerId, currentPlayerId]
  );

  const handleEdgeClick = useCallback(
    (edgeId: number) => {
      console.log("Edge click handler called:", {
        edgeId,
        isMyTurn: isMyTurn(),
        buildMode,
        myPlayerId,
        currentPlayerId,
      });

      if (!isMyTurn() || buildMode !== "road") {
        console.log("Click rejected in handler");
        return;
      }

      console.log("Processing edge click:", edgeId);
      SimpleGameService.buildRoad(edgeId);
      showSuccessIndicator("Budowanie drogi...");
    },
    [isMyTurn, buildMode, showSuccessIndicator, myPlayerId, currentPlayerId]
  );

  const handleLeaveGame = () => {
    SimpleGameService.disconnectFromRoom();
    navigate("/");
  };

  // Test functions for debugging
  const handleTestSettlement = () => {
    setBuildMode(buildMode === "settlement" ? null : "settlement");
  };

  const handleTestRoad = () => {
    setBuildMode(buildMode === "road" ? null : "road");
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

      {/* Test buttons for debugging */}
      <TestButtons>
        <TestButton
          active={buildMode === "settlement"}
          onClick={handleTestSettlement}
        >
          🏠 Test Settlement Mode
        </TestButton>
        <TestButton active={buildMode === "road"} onClick={handleTestRoad}>
          🛣️ Test Road Mode
        </TestButton>
        <TestButton
          onClick={() =>
            console.log("Current state:", {
              myPlayerId,
              currentPlayerId,
              isMyTurn: isMyTurn(),
              buildMode,
              gameState,
            })
          }
        >
          🔍 Debug State
        </TestButton>
      </TestButtons>

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
        {gamePhase === "setup" ? (
          <div>
            <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
              🏗️ Faza przygotowania
            </div>
            {isMyTurn() ? (
              <div>
                Twoja tura - umieść osadę i drogę
                {gameState?.setup_round === 2 &&
                  " (druga runda - otrzymasz surowce za osadę)"}
              </div>
            ) : (
              <div>Tura gracza - poczekaj na swoją kolej</div>
            )}
          </div>
        ) : (
          <div>
            {isMyTurn()
              ? "Twoja tura - wykonaj akcję"
              : `Tura gracza - poczekaj na swoją kolej`}
          </div>
        )}
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
            isMyTurn={isMyTurn()} // PRZEKAZUJ JAKO BOOLEAN
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
            setBuildMode={setBuildMode} // DODANE
            buildMode={buildMode} // DODANE
          />
        </SidePanel>
      </GameLayout>
    </GameContainer>
  );
}
