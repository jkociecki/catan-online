import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import GameService from "../../engine/board/GameService";
import { BoardService } from "../../engine/board/BoardService";
import { CatanBoard } from "../CatanBoard";
import { Board } from "../../engine/board";
import { GameDirector } from "../../game/GameDirector";
import styled from "styled-components";
import PlayersList from "./PlayerList";
import GameActions from "./GameActions";
import { Corner } from "../../engine/corner";
import { Edge } from "../../engine/edge";
import { BaseTile } from "../../engine/tile";

const BOARD_SIZE = 2; // Na początku OnlineGame

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

const TestButton = styled.button<{ disabled?: boolean }>`
  background-color: ${(props) => (props.disabled ? "#cccccc" : "#ff9800")};
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  margin-left: 10px;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  opacity: ${(props) => (props.disabled ? 0.7 : 1)};

  &:hover {
    background-color: ${(props) => (props.disabled ? "#cccccc" : "#f57c00")};
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

export default function OnlineGame() {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomId: urlRoomId } = useParams();

  const roomId = urlRoomId || location.state?.roomId;
  const initialGameState = location.state?.gameState;

  const [board, setBoard] = useState<Board | null>(null);
  const [gameState, setGameState] = useState<any>(initialGameState);
  const [currentPlayerId, setCurrentPlayerId] = useState<string>("");
  const [players, setPlayers] = useState<any[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string>("");
  const [buildMode, setBuildMode] = useState<string | null>(null);
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [gamePhase, setGamePhase] = useState<string>("setup");
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>("");

  const myColor = players.find((p) => p.id === myPlayerId)?.color || "red";

  // Debug board information
  useEffect(() => {
    if (board) {
      console.log("=== FRONTEND BOARD DEBUG ===");
      console.log(
        "Frontend tiles count:",
        Object.keys(board.getTiles()).length
      );
      console.log("Frontend tiles:", Object.keys(board.getTiles()));
      console.log(
        "Frontend has tile 0,-2,2:",
        board.getTiles()["0,-2,2"] !== undefined
      );
      console.log(
        "Frontend has tile 1,-2,1:",
        board.getTiles()["1,-2,1"] !== undefined
      );
      console.log("Frontend board size:", board.size);
      console.log("============================");

      // Zapisz board w window dla debugowania
      (window as any).debugBoard = board;
    }
  }, [board]);

  const showSuccessIndicator = useCallback((message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 2000);
  }, []);

  const gameDirector = React.useMemo(() => new GameDirector(), []);

  useEffect(() => {
    if (!roomId) {
      console.error("Missing roomId in OnlineGame");
      navigate("/");
    }
  }, [roomId, navigate]);

  const fetchRandomBoardIfNeeded = useCallback(async () => {
    if (!initialGameState) {
      try {
        console.log("Fetching random board data");
        const boardData = await BoardService.getRandomBoard();
        const newBoard = new Board(BOARD_SIZE, gameDirector.getConfig());
        newBoard.loadFromData(boardData);
        setBoard(newBoard);
        setGameState({ board: boardData, players: [] });
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch random board", err);
        setError("Failed to load game board. Please try again.");
        setLoading(false);
      }
    } else {
      try {
        console.log("Loading board from initialGameState");
        const newBoard = new Board(BOARD_SIZE, gameDirector.getConfig());
        newBoard.loadFromData(initialGameState.board);
        setBoard(newBoard);
        setGameState(initialGameState);

        if (initialGameState.players) {
          setPlayers(initialGameState.players);
          const currentPlayerIndex = initialGameState.current_player_index || 0;
          if (initialGameState.players.length > 0) {
            setCurrentPlayerId(initialGameState.players[currentPlayerIndex].id);
          }
        }

        if (initialGameState.phase) {
          setGamePhase(initialGameState.phase);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error loading board from initial state", err);
        setError("Failed to load game board from initial state.");
        setLoading(false);
      }
    }
  }, [initialGameState, gameDirector]);

  useEffect(() => {
    if (!roomId) {
      navigate("/");
      return;
    }

    const setupConnection = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!GameService.isConnected()) {
          console.log(`Connecting to room: ${roomId}`);
          await GameService.connectToRoom(roomId);
          setIsConnected(true);
        } else {
          setIsConnected(true);
        }

        await fetchRandomBoardIfNeeded();
        GameService.getGameState();

        try {
          const clientId = await GameService.getClientId();
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
  }, [roomId, fetchRandomBoardIfNeeded, navigate]);

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
        console.log(
          "Game state received in handleGameUpdate:",
          data.game_state
        );
        setGameState(data.game_state);

        if (data.game_state.phase) {
          setGamePhase(data.game_state.phase);
        }

        if (data.game_state.board && board) {
          const updatedBoard = new Board(BOARD_SIZE, gameDirector.getConfig());
          updatedBoard.loadFromData(data.game_state.board);
          setBoard(updatedBoard);
        }

        if (data.game_state.players) {
          setPlayers(data.game_state.players);
          const currentPlayerIndex = data.game_state.current_player_index || 0;
          if (data.game_state.players.length > 0) {
            setCurrentPlayerId(data.game_state.players[currentPlayerIndex].id);
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
        setGameState(data.game_state);
        if (data.game_state.phase) {
          setGamePhase(data.game_state.phase);
        }

        if (data.game_state.board) {
          try {
            const updatedBoard = new Board(
              BOARD_SIZE,
              gameDirector.getConfig()
            );
            updatedBoard.loadFromData(data.game_state.board);
            setBoard(updatedBoard);
          } catch (err) {
            console.error("Error updating board:", err);
          }
        }

        if (data.game_state.players) {
          setPlayers(data.game_state.players);
          const currentPlayerIndex = data.game_state.current_player_index || 0;
          if (data.game_state.players.length > 0) {
            setCurrentPlayerId(data.game_state.players[currentPlayerIndex].id);
          }
        }
      }
    };

    const handlePhaseChange = (data: any) => {
      console.log("Phase change received:", data);
      if (data.phase) {
        setGamePhase(data.phase);

        if (data.phase === "setup") {
          showSuccessIndicator("Faza przygotowania rozpoczęta!");
        } else if (data.phase === "main" || data.phase === "MAIN") {
          showSuccessIndicator("Faza główna gry rozpoczęta!");
        } else if (data.phase === "ROLL_DICE") {
          showSuccessIndicator("Rzuć kośćmi, aby rozpocząć turę");
        }
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
      GameService.getGameState();
    };

    const handleDiceRoll = (data: any) => {
      console.log("Dice roll:", data);
      if (data.dice_result) {
        setDiceResult(data.dice_result.total);
        if (data.player_id === myPlayerId) {
          showSuccessIndicator(`Wyrzucono ${data.dice_result.total}!`);
        }
      } else if (data.result) {
        setDiceResult(data.result.total);
        if (data.player_id === myPlayerId) {
          showSuccessIndicator(`Wyrzucono ${data.result.total}!`);
        }
      }

      setTimeout(() => {
        setDiceResult(null);
      }, 3000);
    };

    const handleBuildModeEnter = (data: any) => {
      console.log("Build mode entered:", data);
      if (data.player_id === myPlayerId) {
        setBuildMode(data.build_type);
      }
    };

    const handleError = (data: any) => {
      console.error("Game error:", data.message);
      setError(data.message || "An unknown error occurred");
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setError("Disconnected from game server. Try refreshing the page.");
    };

    if (isConnected) {
      GameService.addEventHandler("game_update", handleGameUpdate);
      GameService.addEventHandler("game_state", handleGameState);
      GameService.addEventHandler("phase_change", handlePhaseChange);
      GameService.addEventHandler("client_id", handleClientId);
      GameService.addEventHandler("player_joined", handlePlayerJoined);
      GameService.addEventHandler("dice_roll", handleDiceRoll);
      GameService.addEventHandler("build_mode", handleBuildModeEnter);
      GameService.addEventHandler("error", handleError);
      GameService.addEventHandler("disconnect", handleDisconnect);
    }

    return () => {
      if (isConnected) {
        GameService.removeEventHandler("game_update", handleGameUpdate);
        GameService.removeEventHandler("game_state", handleGameState);
        GameService.removeEventHandler("phase_change", handlePhaseChange);
        GameService.removeEventHandler("client_id", handleClientId);
        GameService.removeEventHandler("player_joined", handlePlayerJoined);
        GameService.removeEventHandler("dice_roll", handleDiceRoll);
        GameService.removeEventHandler("build_mode", handleBuildModeEnter);
        GameService.removeEventHandler("error", handleError);
        GameService.removeEventHandler("disconnect", handleDisconnect);
      }
    };
  }, [isConnected, board, gameDirector, myPlayerId, showSuccessIndicator]);

  // Player helper functions
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
      resources.WOOD >= 1 &&
      resources.BRICK >= 1 &&
      resources.SHEEP >= 1 &&
      resources.WHEAT >= 1
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
      myPlayer.cities_left > 0 && resources.ORE >= 3 && resources.WHEAT >= 2
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
      myPlayer.roads_left > 0 && resources.WOOD >= 1 && resources.BRICK >= 1
    );
  }, [players, myPlayerId, gamePhase]);

  // ========== HANDLERS WITH NEW TILE+INDEX SYSTEM ==========

  const handleCornerClick = (corner: Corner, tile: BaseTile) => {
    if (!isMyTurn() || !buildMode || !board) return;

    if (buildMode === "settlement" || buildMode === "city") {
      const cornerIndex = tile.getCorners().indexOf(corner);
      const vertex_id = board.getVertexIdForTileCorner(
        tile.tileId,
        cornerIndex
      );

      if (vertex_id !== null) {
        console.log(`Sending build action with vertex_id: ${vertex_id}`);

        GameService.sendMessage({
          type: "game_action",
          action: `build_${buildMode}`,
          vertex_id: vertex_id,
        });

        showSuccessIndicator(
          `Budowanie ${buildMode === "settlement" ? "osady" : "miasta"}...`
        );
      }
    }
  };

  const handleEdgeClick = (edge: Edge, tile: BaseTile) => {
    if (!isMyTurn() || buildMode !== "road" || !board) return;

    const edgeIndex = tile.getEdges().indexOf(edge);
    const edge_id = board.getEdgeIdForTileEdge(tile.tileId, edgeIndex);

    if (edge_id !== null) {
      console.log(`Sending build road with edge_id: ${edge_id}`);

      GameService.sendMessage({
        type: "game_action",
        action: "build_road",
        edge_id: edge_id,
      });

      showSuccessIndicator("Budowanie drogi...");
    }
  };

  const handleLeaveGame = () => {
    GameService.disconnectFromRoom();
    navigate("/");
  };

  const handleTestEndTurn = () => {
    if (isMyTurn()) {
      console.log("Testing end turn function");
      GameService.endTurn();
      setBuildMode(null);
    } else {
      console.warn("You cannot end another player's turn!");
    }
  };

  if (loading) {
    return <LoadingMessage>Wczytywanie gry...</LoadingMessage>;
  }

  if (!board) {
    return (
      <ErrorMessage>
        Nie udało się wczytać planszy gry. Spróbuj ponownie.
      </ErrorMessage>
    );
  }

  return (
    <GameContainer>
      <GameHeader>
        <h2>Catan Online Game - Room: {roomId}</h2>
        <div>
          <TestButton onClick={handleTestEndTurn} disabled={!isMyTurn()}>
            {isMyTurn() ? "Zakończ turę" : "Oczekiwanie na twoją turę"}
          </TestButton>
          <LeaveButton onClick={handleLeaveGame}>Opuść grę</LeaveButton>
        </div>
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
          : `Tura innego gracza - poczekaj na swoją kolej`}
      </div>

      <SuccessIndicator show={showSuccess}>{successMessage}</SuccessIndicator>

      {diceResult && (
        <GameStatus>
          <h3>Wynik rzutu: {diceResult}</h3>
        </GameStatus>
      )}

      <GameLayout>
        <BoardContainer>
          <CatanBoard
            board={board}
            onCornerClick={handleCornerClick}
            onEdgeClick={handleEdgeClick}
            buildMode={buildMode}
            myPlayerId={myPlayerId}
            myColor={myColor}
            gamePhase={gamePhase}
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
