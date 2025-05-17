import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import GameService from "../../engine/board/GameService";
import { BoardService } from "../../engine/board/BoardService";
import { CatanBoard } from "../CatanBoard";
import { Board } from "../../engine/board";
import { GameDirector } from "../../game/GameDirector";
import styled from "styled-components";
import PlayersList from "./PlayerList";
import GameActions from "./GameActions";

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

export default function OnlineGame() {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomId: urlRoomId } = useParams();

  // Use roomId from URL params if available, otherwise from location state
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

  // Use useMemo to create gameDirector once
  const gameDirector = useMemo(() => new GameDirector(), []);

  // Sprawdź czy roomId istnieje
  useEffect(() => {
    if (!roomId) {
      console.error("Missing roomId in OnlineGame");
      navigate("/");
    }
  }, [roomId, navigate]);

  // Funkcja do pobierania planszy
  const fetchRandomBoardIfNeeded = useCallback(async () => {
    if (!initialGameState) {
      try {
        console.log("Fetching random board data");
        const boardData = await BoardService.getRandomBoard();
        const newBoard = new Board(2, gameDirector.getConfig());
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
        const newBoard = new Board(2, gameDirector.getConfig());
        newBoard.loadFromData(initialGameState.board);
        setBoard(newBoard);
        setGameState(initialGameState);

        // Set players and current player
        if (initialGameState.players) {
          setPlayers(initialGameState.players);
          const currentPlayerIndex = initialGameState.current_player_index || 0;
          if (initialGameState.players.length > 0) {
            setCurrentPlayerId(initialGameState.players[currentPlayerIndex].id);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error("Error loading board from initial state", err);
        setError("Failed to load game board from initial state.");
        setLoading(false);
      }
    }
  }, [initialGameState, gameDirector]);

  // Nawiązanie połączenia WebSocket
  useEffect(() => {
    if (!roomId) {
      navigate("/");
      return;
    }

    const setupConnection = async () => {
      setLoading(true);
      setError(null);

      try {
        // Connect to WebSocket if not already connected
        if (!GameService.isConnected()) {
          console.log(`Connecting to room: ${roomId}`);
          await GameService.connectToRoom(roomId);
          setIsConnected(true);
        } else {
          setIsConnected(true);
        }

        // Fetch board data if needed
        await fetchRandomBoardIfNeeded();

        // Request game state once connected
        GameService.getGameState();

        // Próba pobrania ID klienta
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

  // Obsługa zdarzeń WebSocket
  useEffect(() => {
    // Obsługa aktualizacji stanu gry
    const handleGameUpdate = (data: any) => {
      console.log("Game update received:", data);

      // Update game state
      if (data.game_state) {
        setGameState(data.game_state);

        // Update board
        if (data.game_state.board && board) {
          const updatedBoard = new Board(2, gameDirector.getConfig());
          updatedBoard.loadFromData(data.game_state.board);
          setBoard(updatedBoard);
        }

        // Update players
        if (data.game_state.players) {
          setPlayers(data.game_state.players);

          // Update current player
          const currentPlayerIndex = data.game_state.current_player_index || 0;
          if (data.game_state.players.length > 0) {
            setCurrentPlayerId(data.game_state.players[currentPlayerIndex].id);
          }
        }
      }

      // Clear build mode when game state updates
      setBuildMode(null);
    };

    const handleGameState = (data: any) => {
      console.log("Game state received:", data);

      if (data.game_state) {
        setGameState(data.game_state);
        if (data.game_state.phase) {
          setGamePhase(data.game_state.phase);
        }

        // Update board
        if (data.game_state.board) {
          try {
            const updatedBoard = new Board(2, gameDirector.getConfig());
            updatedBoard.loadFromData(data.game_state.board);
            setBoard(updatedBoard);
          } catch (err) {
            console.error("Error updating board:", err);
          }
        }

        // Update players
        if (data.game_state.players) {
          setPlayers(data.game_state.players);

          // Update current player
          const currentPlayerIndex = data.game_state.current_player_index || 0;
          if (data.game_state.players.length > 0) {
            setCurrentPlayerId(data.game_state.players[currentPlayerIndex].id);
          }
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
      // Request updated game state when a player joins
      GameService.getGameState();
    };

    const handleDiceRoll = (data: any) => {
      console.log("Dice roll:", data);
      if (data.dice_result) {
        setDiceResult(data.dice_result.total);
      } else if (data.result) {
        setDiceResult(data.result.total);
      }

      // Hide dice result after 3 seconds
      setTimeout(() => {
        setDiceResult(null);
      }, 3000);
    };

    const handleBuildModeEnter = (data: any) => {
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

    // Register event handlers
    if (isConnected) {
      GameService.addEventHandler("game_update", handleGameUpdate);
      GameService.addEventHandler("game_state", handleGameState);
      GameService.addEventHandler("client_id", handleClientId);
      GameService.addEventHandler("player_joined", handlePlayerJoined);
      GameService.addEventHandler("dice_roll", handleDiceRoll);
      GameService.addEventHandler("build_mode", handleBuildModeEnter);
      GameService.addEventHandler("error", handleError);
      GameService.addEventHandler("disconnect", handleDisconnect);
    }

    // Cleanup event handlers
    return () => {
      if (isConnected) {
        GameService.removeEventHandler("game_update", handleGameUpdate);
        GameService.removeEventHandler("game_state", handleGameState);
        GameService.removeEventHandler("client_id", handleClientId);
        GameService.removeEventHandler("player_joined", handlePlayerJoined);
        GameService.removeEventHandler("dice_roll", handleDiceRoll);
        GameService.removeEventHandler("build_mode", handleBuildModeEnter);
        GameService.removeEventHandler("error", handleError);
        GameService.removeEventHandler("disconnect", handleDisconnect);
      }
    };
  }, [isConnected, board, gameDirector, myPlayerId]);

  // Dodatkowy efekt do debugowania stanu
  useEffect(() => {
    console.log("OnlineGame state update:");
    console.log("- myPlayerId:", myPlayerId);
    console.log("- currentPlayerId:", currentPlayerId);
    console.log("- isMyTurn:", myPlayerId === currentPlayerId);
    console.log("- players:", players);
  }, [myPlayerId, currentPlayerId, players]);

  // Awaryjne ustawienie myPlayerId, jeśli jesteśmy pierwszym graczem
  useEffect(() => {
    if (
      (!myPlayerId || myPlayerId === "") &&
      currentPlayerId &&
      players.length > 0
    ) {
      // Sprawdź czy jesteśmy pierwszym graczem (hostem)
      const isFirstPlayer = location.state?.createdRoom === true;
      if (isFirstPlayer) {
        console.log("Setting myPlayerId as first player:", currentPlayerId);
        setMyPlayerId(currentPlayerId);
      }
    }
  }, [myPlayerId, currentPlayerId, players, location.state]);

  // Player-related helper functions
  const getMyResources = () => {
    const myPlayer = players.find((p) => p.id === myPlayerId);
    return myPlayer ? myPlayer.resources : {};
  };

  const isMyTurn = () => {
    return myPlayerId === currentPlayerId;
  };

  const canBuildSettlement = () => {
    const myPlayer = players.find((p) => p.id === myPlayerId);
    if (!myPlayer) return false;

    const resources = myPlayer.resources || {};
    return (
      myPlayer.settlements_left > 0 &&
      resources.WOOD >= 1 &&
      resources.BRICK >= 1 &&
      resources.SHEEP >= 1 &&
      resources.WHEAT >= 1
    );
  };

  const canBuildCity = () => {
    const myPlayer = players.find((p) => p.id === myPlayerId);
    if (!myPlayer) return false;

    const resources = myPlayer.resources || {};
    return (
      myPlayer.cities_left > 0 && resources.ORE >= 3 && resources.WHEAT >= 2
    );
  };

  const canBuildRoad = () => {
    const myPlayer = players.find((p) => p.id === myPlayerId);
    if (!myPlayer) return false;

    const resources = myPlayer.resources || {};
    return (
      myPlayer.roads_left > 0 && resources.WOOD >= 1 && resources.BRICK >= 1
    );
  };

const handleCornerClick = (corner: any, tile: any) => {
  if (!isMyTurn() || !buildMode || !board) return;
  
  console.log("clicked corner!", corner, tile);

  if (buildMode === "settlement" || buildMode === "city") {
    try {
      // Instead of trying to get coordinates from the corner,
      // extract them from the tile's ID which is in the format "q,r,s"
      const coords: number[][] = [];
      
      if (tile && tile.tileId) {
        // Convert the tileId string (like "-1,1,0") to an array of numbers
        const tileCoords = tile.tileId.split(',').map(Number);
        if (tileCoords.length === 3) {
          coords.push(tileCoords);
          
          // Find which corner this is in the tile
          let cornerIndex = -1;
          if (tile.corners) {
            for (let i = 0; i < tile.corners.length; i++) {
              if (tile.corners[i] === corner) {
                cornerIndex = i;
                break;
              }
            }
          }
          
          console.log(`Corner index in tile: ${cornerIndex}`);
          
          // If we found the corner's index, add it as metadata
          if (cornerIndex !== -1) {
            // Add the corner direction as additional data
            // This is assuming the corners array is ordered according to TileCornerDir enum
            GameService.sendMessage({
              type: "game_action",
              action: `build_${buildMode}`,
              coords: coords,
              corner_index: cornerIndex
            });
            return;
          }
        }
      }
      
      // Alternative approach: try to use a simplified coordinate
      if (tile && typeof tile.getCornerCoordinates === 'function') {
        // If the tile has a method to get corner coordinates
        const cornerCoords = tile.getCornerCoordinates(corner);
        if (cornerCoords) {
          coords.push(cornerCoords);
        }
      } 
      
      // If we still don't have coordinates, try one more approach with the tile ID
      if (coords.length === 0 && tile && tile.tileId) {
        const tileCoords = tile.tileId.split(',').map(Number);
        if (tileCoords.length === 3) {
          coords.push(tileCoords);
        }
      }

      // Upewnij się, że mamy poprawne koordynaty zanim wyślemy wiadomość
      if (coords.length === 0) {
        console.error("No coordinates found for corner. Using fallback method.");
        
        // Fallback: If we can't determine coordinates from the corner or tile,
        // send a special message indicating we need the server to resolve the position
        GameService.sendMessage({
          type: "game_action",
          action: `build_${buildMode}`,
          fallback: true,
          // Include any useful identifiers
          tile_id: tile?.tileId || null
        });
        return;
      }

      console.log(`Building ${buildMode} at:`, coords);

      // Send build action to server
      GameService.sendMessage({
        type: "game_action",
        action: `build_${buildMode}`,
        coords: coords,
      });
    } catch (err) {
      console.error("Error processing corner click:", err);
      setError(`Error processing click: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
};

// Podobnie naprawiamy funkcję handleEdgeClick
const handleEdgeClick = (edge: any, tile: any) => {
  if (!isMyTurn() || buildMode !== "road" || !board) return;

  try {
    // Get coordinates for the edge
    const coords: number[][] = [];
    
    // Sprawdź czy edge.tiles istnieje i jest iterowalny
    if (edge.tiles && typeof edge.tiles[Symbol.iterator] === 'function') {
      for (const coord of edge.tiles) {
        if (Array.isArray(coord)) {
          coords.push([...coord]);
        } else if (typeof coord === 'object' && coord !== null && 
                   // Safe check for iterable
                   'forEach' in coord) {
          // Convert to array safely
          const coordArray: number[] = [];
          (coord as any).forEach((value: any) => {
            if (typeof value === 'number') {
              coordArray.push(value);
            }
          });
          if (coordArray.length > 0) {
            coords.push(coordArray);
          }
        } else {
          console.warn("Coordinates in unexpected format:", coord);
        }
      }
    } else if (edge.tiles instanceof Set) {
      // Jeśli to jest Set, konwertuj każdy element
      for (const coord of Array.from(edge.tiles)) {
        if (Array.isArray(coord)) {
          coords.push([...coord]);
        } else if (typeof coord === 'object' && coord !== null && 
                   // Safe check for iterable
                   'forEach' in coord) {
          // Convert to array safely
          const coordArray: number[] = [];
          (coord as any).forEach((value: any) => {
            if (typeof value === 'number') {
              coordArray.push(value);
            }
          });
          if (coordArray.length > 0) {
            coords.push(coordArray);
          }
        } else {
          console.warn("Coordinates in unexpected format:", coord);
        }
      }
    } else if (typeof edge.getTiles === 'function') {
      // Lub jeśli istnieje metoda getTiles()
      const tiles = edge.getTiles();
      for (const coord of tiles) {
        if (Array.isArray(coord)) {
          coords.push([...coord]);
        } else if (typeof coord === 'object' && coord !== null && 
                   // Safe check for iterable
                   'forEach' in coord) {
          // Convert to array safely
          const coordArray: number[] = [];
          (coord as any).forEach((value: any) => {
            if (typeof value === 'number') {
              coordArray.push(value);
            }
          });
          if (coordArray.length > 0) {
            coords.push(coordArray);
          }
        } else {
          console.warn("Coordinates in unexpected format:", coord);
        }
      }
    } else {
      // Jeśli nie możemy uzyskać koordynatów w żaden sposób, zgłaszamy błąd
      console.error("Cannot get edge coordinates:", edge);
      setError("Problem getting edge coordinates");
      return;
    }

    // Upewnij się, że mamy poprawne koordynaty zanim wyślemy wiadomość
    if (coords.length === 0) {
      console.error("No coordinates found for edge:", edge);
      setError("No coordinates found for edge");
      return;
    }

    console.log("Building road at:", coords);

    // Send build action to server
    GameService.sendMessage({
      type: "game_action",
      action: "build_road",
      coords: coords,
    });
  } catch (err) {
    console.error("Error processing edge click:", err);
    setError(`Error processing click: ${err instanceof Error ? err.message : String(err)}`);
  }
};

  const handleLeaveGame = () => {
    GameService.disconnectFromRoom();
    navigate("/");
  };

  if (loading) {
    return <LoadingMessage>Loading game...</LoadingMessage>;
  }

  if (!board) {
    return (
      <ErrorMessage>Failed to load game board. Please try again.</ErrorMessage>
    );
  }

  const handleTestEndTurn = () => {
    // Sprawdź jeszcze raz, czy to faktycznie Twoja tura
    if (isMyTurn()) {
      console.log("Testowanie funkcji końca tury");
      GameService.endTurn();
    } else {
      console.warn("Nie możesz zakończyć tury innego gracza!");
    }
  };

  return (
    <GameContainer>
      <GameHeader>
        <h2>Catan Online Game - Room: {roomId}</h2>
        <div>
          <TestButton onClick={handleTestEndTurn} disabled={!isMyTurn()}>
            {isMyTurn() ? "Zakończ turę" : "Oczekiwanie na twoją turę"}
          </TestButton>
          <LeaveButton onClick={handleLeaveGame}>Leave Game</LeaveButton>
        </div>
      </GameHeader>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {/* Dodaj prosty wskaźnik tury */}
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

      {diceResult && (
        <GameStatus>
          <h3>Dice Roll: {diceResult}</h3>
        </GameStatus>
      )}

      <GameLayout>
        <BoardContainer>
          <CatanBoard
            board={board}
            onCornerClick={handleCornerClick}
            onEdgeClick={handleEdgeClick}
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
