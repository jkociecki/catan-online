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

// Komponent animowanego wskaźnika sukcesu akcji
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
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [pendingBuilds, setPendingBuilds] = useState<any[]>([]);

  // Znajdź kolor mojego gracza (użytkownika)
  const myColor = players.find((p) => p.id === myPlayerId)?.color || "red";

  // Funkcja pomocnicza do wyświetlania wskaźnika sukcesu
  const showSuccessIndicator = useCallback((message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 2000);
  }, []);

  // Use useMemo to create gameDirector once
  const gameDirector = React.useMemo(() => new GameDirector(), []);

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

        // Set game phase
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

      // Pokaż powiadomienie o sukcesie
      if (data.action) {
        const actionMessages: { [key: string]: string } = {
          build_settlement: "Osada zbudowana!",
          build_city: "Miasto zbudowane!",
          build_road: "Droga zbudowana!",
          end_turn: "Tura zakończona",
        };

        if (actionMessages[data.action] && data.player_id === myPlayerId) {
          showSuccessIndicator(actionMessages[data.action]);

          // Usuń z listy oczekujących budowli tę, którą potwierdzono
          if (data.action.startsWith("build_") && data.coords) {
            setPendingBuilds((prev) =>
              prev.filter(
                (item) =>
                  !(
                    item.action === data.action &&
                    JSON.stringify(item.coords) === JSON.stringify(data.coords)
                  )
              )
            );
          }
        }
      }

      // Update game state
      if (data.game_state) {
        setGameState(data.game_state);

        // Update game phase
        if (data.game_state.phase) {
          setGamePhase(data.game_state.phase);
        }

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

    const handlePhaseChange = (data: any) => {
      console.log("Phase change received:", data);
      if (data.phase) {
        setGamePhase(data.phase);

        // Pokaż powiadomienie o zmianie fazy
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
      // Request updated game state when a player joins
      GameService.getGameState();
    };

    const handleDiceRoll = (data: any) => {
      console.log("Dice roll:", data);
      if (data.dice_result) {
        setDiceResult(data.dice_result.total);

        // Pokaż powiadomienie o rzucie kośćmi
        if (data.player_id === myPlayerId) {
          showSuccessIndicator(`Wyrzucono ${data.dice_result.total}!`);
        }
      } else if (data.result) {
        setDiceResult(data.result.total);

        if (data.player_id === myPlayerId) {
          showSuccessIndicator(`Wyrzucono ${data.result.total}!`);
        }
      }

      // Hide dice result after 3 seconds
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

    // Register event handlers
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

    // Cleanup event handlers
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

  // Player-related helper functions
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
      return true; // W fazie setup można budować za darmo
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
      return false; // W fazie setup nie można budować miast
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
      return true; // W fazie setup można budować za darmo
    }

    const resources = myPlayer.resources || {};
    return (
      myPlayer.roads_left > 0 && resources.WOOD >= 1 && resources.BRICK >= 1
    );
  }, [players, myPlayerId, gamePhase]);

  // Poprawiona funkcja obsługi kliknięcia w róg planszy, wykorzystująca getVertices
  // Zmodyfikowana funkcja handleCornerClick w kliencie
  // const handleCornerClick = (corner: Corner, tile: BaseTile) => {
  //   if (!isMyTurn() || !buildMode || !board) return;

  //   console.log("clicked corner!", corner, tile);

  //   if (buildMode === "settlement" || buildMode === "city") {
  //     try {
  //       // Sprawdź warunki budowania
  //       let canBuild = true;

  //       // Dla osady: sprawdź czy róg jest pusty
  //       if (buildMode === "settlement" && corner.getOwner()) {
  //         setError("Ten róg jest już zajęty!");
  //         canBuild = false;
  //       }

  //       // Dla miasta: sprawdź czy jest tam już nasza osada
  //       if (buildMode === "city") {
  //         const owner = corner.getOwner();
  //         if (!owner) {
  //           setError("Możesz ulepszać tylko własne osady!");
  //           canBuild = false;
  //         }else if (corner.hasCity()) {
  //           setError("Ta osada jest już ulepszona do miasta!");
  //           canBuild = false;
  //         }
  //       }

  //       if (!canBuild) {
  //         return;
  //       }

  //       // Przygotuj współrzędne dla serwera - użyj ID kafelka
  //       const tileCoords = tile.tileId.split(',').map(Number);
  //       if (tileCoords.length !== 3) {
  //         setError("Niepoprawne współrzędne kafelka");
  //         return;
  //       }

  //       // Znajdź indeks narożnika w kafelku
  //       const corners = tile.getCorners();
  //       let cornerIndex = -1;
  //       for (let i = 0; i < corners.length; i++) {
  //         if (corners[i] === corner) {
  //           cornerIndex = i;
  //           break;
  //         }
  //       }

  //       if (cornerIndex === -1) {
  //         setError("Nie można określić indeksu narożnika");
  //         return;
  //       }

  //       console.log(`Building ${buildMode} at tile ${tile.tileId}, corner index ${cornerIndex}`);

  //       // Dodaj budowlę do listy oczekujących (symulacja natychmiastowej odpowiedzi)
  //       const newPendingBuild = {
  //         action: `build_${buildMode}`,
  //         tileId: tile.tileId,
  //         cornerIndex: cornerIndex
  //       };

  //       // Zapobieganie duplikatom
  //       const existingBuildIndex = pendingBuilds.findIndex(
  //         item => item.action === newPendingBuild.action &&
  //               item.tileId === newPendingBuild.tileId &&
  //               item.cornerIndex === newPendingBuild.cornerIndex
  //       );

  //       if (existingBuildIndex === -1) {
  //         setPendingBuilds(prev => [...prev, newPendingBuild]);
  //       }

  //       // Wyślij akcję do serwera
  //       GameService.sendMessage({
  //         type: "game_action",
  //         action: `build_${buildMode}`,
  //         tileId: tile.tileId,
  //         cornerIndex: cornerIndex
  //       });

  //       // Pokaż komunikat o oczekiwaniu na odpowiedź serwera
  //       showSuccessIndicator(`Budowanie ${buildMode === "settlement" ? "osady" : "miasta"}...`);

  //       // Jeśli jesteśmy w fazie setup, zmień tryb budowania na drogę po postawieniu osady
  //       if (gamePhase === "setup" && buildMode === "settlement") {
  //         setTimeout(() => {
  //           setBuildMode("road");
  //         }, 500);
  //       }
  //     } catch (err) {
  //       console.error("Error processing corner click:", err);
  //       setError(`Error processing click: ${err instanceof Error ? err.message : String(err)}`);
  //     }
  //   }
  // };

  // Poprawiona funkcja handleCornerClick w OnlineGame.tsx
  const handleCornerClick = (corner: Corner, tile: BaseTile) => {
    if (!isMyTurn() || !buildMode || !board) return;

    console.log("clicked corner!", corner, tile);

    if (buildMode === "settlement" || buildMode === "city") {
      try {
        // Sprawdź warunki budowania
        let canBuild = true;

        // Dla osady: sprawdź czy róg jest pusty
        if (buildMode === "settlement" && corner.getOwner()) {
          setError("Ten róg jest już zajęty!");
          canBuild = false;
        }

        // Dla miasta: sprawdź czy jest tam już nasza osada
        if (buildMode === "city") {
          const owner = corner.getOwner();
          if (!owner) {
            setError("Możesz ulepszać tylko własne osady!");
            canBuild = false;
          } else if (corner.hasCity()) {
            setError("Ta osada jest już ulepszona do miasta!");
            canBuild = false;
          }
        }

        if (!canBuild) {
          return;
        }

        // Pobierz wszystkie wierzchołki rogu
        const vertices =
          typeof corner.getVertices === "function" ? corner.getVertices() : [];
        console.log("Raw vertex data:", vertices);

        // Sprawdź, czy mamy wystarczającą liczbę wierzchołków (powinny być 3 dla narożnika)
        if (vertices.length < 3) {
          console.warn(
            "Incomplete vertex data, corner should have 3 vertices but has:",
            vertices.length
          );

          // Spróbujmy uzupełnić brakujące dane
          // Pobierz istniejące współrzędne
          const coords = vertices.map((v) => v.split(",").map(Number));

          // Pobierz dane o kafelku
          const tileCoords = tile.tileId.split(",").map(Number);
          const cornerIndex = tile.getCorners().indexOf(corner);

          console.log(
            "Using coordinates from tile:",
            tileCoords,
            "corner index:",
            cornerIndex
          );

          // Manualne określenie prawidłowych koordynatów dla narożnika
          let vertexCoords: number[][] = [];

          // Używamy informacji o kafelku i indeksie narożnika do generowania prawidłowych koordynatów
          const [q, r, s] = tileCoords;

          if (cornerIndex === 0) {
            // North corner
            vertexCoords = [
              [q, r, s],
              [q + 1, r - 1, s],
              [q + 1, r, s - 1],
            ];
          } else if (cornerIndex === 1) {
            // South corner
            vertexCoords = [
              [q, r, s],
              [q, r + 1, s - 1],
              [q - 1, r + 1, s],
            ];
          } else {
            setError("Nieznany indeks narożnika");
            return;
          }

          console.log("Generated vertex coordinates:", vertexCoords);

          // Wyślij wygenerowane koordynaty
          console.log(
            "Sending vertex coordinates in format:",
            JSON.stringify(vertexCoords)
          );

          GameService.sendMessage({
            type: "game_action",
            action: `build_${buildMode}`,
            coords: vertexCoords,
          });
        } else {
          // Przetwórz wierzchołki na tablicę koordynatów
          const vertexCoords = vertices.map((vertex) =>
            vertex.split(",").map(Number)
          );
          console.log("Sending complete vertex coordinates:", vertexCoords);

          // Wyślij koordynaty
          GameService.sendMessage({
            type: "game_action",
            action: `build_${buildMode}`,
            coords: vertexCoords,
          });
        }

        // Dodaj budowlę do listy oczekujących (symulacja natychmiastowej odpowiedzi)
        const newPendingBuild = {
          action: `build_${buildMode}`,
          tileId: tile.tileId,
          cornerIndex: tile.getCorners().indexOf(corner),
        };

        // Zapobieganie duplikatom
        const existingBuildIndex = pendingBuilds.findIndex(
          (item) =>
            item.action === newPendingBuild.action &&
            item.tileId === newPendingBuild.tileId &&
            item.cornerIndex === newPendingBuild.cornerIndex
        );

        if (existingBuildIndex === -1) {
          setPendingBuilds((prev) => [...prev, newPendingBuild]);
        }

        // Pokaż komunikat o oczekiwaniu na odpowiedź serwera
        showSuccessIndicator(
          `Budowanie ${buildMode === "settlement" ? "osady" : "miasta"}...`
        );

        // Jeśli jesteśmy w fazie setup, zmień tryb budowania na drogę po postawieniu osady
        if (gamePhase === "setup" && buildMode === "settlement") {
          setTimeout(() => {
            setBuildMode("road");
          }, 500);
        }
      } catch (err) {
        console.error("Error processing corner click:", err);
        setError(
          `Error processing click: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }
  };

  // Poprawiona funkcja do obsługi kliknięcia krawędzi planszy, wykorzystująca getVertices
  const handleEdgeClick = (edge: Edge, tile: BaseTile) => {
    if (!isMyTurn() || buildMode !== "road" || !board) return;

    try {
      // Przygotuj współrzędne dla serwera wykorzystując metodę getVertices
      const coords: number[][] = [];
      const edgeVertices = edge.getVertices();

      console.log("Edge vertices:", edgeVertices);

      // Przetwarzanie wierzchołków z edge.getVertices()
      if (edgeVertices && edgeVertices.length > 0) {
        for (const vertex of edgeVertices) {
          const tileCoords = vertex.split(",").map(Number);
          if (tileCoords.length === 3) {
            coords.push(tileCoords);
          }
        }
      } else {
        // Fallback do starej metody, jeśli getVertices nie zwraca danych
        if (tile && tile.tileId) {
          const tileCoords = tile.tileId.split(",").map(Number);
          if (tileCoords.length === 3) {
            coords.push(tileCoords);
          }
        }
      }

      console.log("Sending coordinates for road:", coords);

      // Sprawdź czy krawędź jest już zajęta
      if (edge.getOwner()) {
        setError("Ta krawędź jest już zajęta!");
        return;
      }

      if (coords.length === 0) {
        setError("Nie można określić pozycji dla drogi. Spróbuj ponownie.");
        return;
      }

      // Dodaj drogę do listy oczekujących (symulacja natychmiastowej odpowiedzi)
      const newPendingBuild = {
        action: "build_road",
        coords: coords,
      };

      // Zapobieganie duplikatom
      const existingBuildIndex = pendingBuilds.findIndex(
        (item) =>
          item.action === newPendingBuild.action &&
          JSON.stringify(item.coords) === JSON.stringify(newPendingBuild.coords)
      );

      if (existingBuildIndex === -1) {
        setPendingBuilds((prev) => [...prev, newPendingBuild]);
      }

      // Wyślij akcję do serwera
      GameService.sendMessage({
        type: "game_action",
        action: "build_road",
        coords: coords,
      });

      // Pokaż komunikat o oczekiwaniu na odpowiedź serwera
      showSuccessIndicator("Budowanie drogi...");

      // W fazie setup po postawieniu drogi automatycznie zakończ turę
      if (gamePhase === "setup") {
        setTimeout(() => {
          GameService.endTurn();
          setBuildMode(null);
        }, 1000);
      }
    } catch (err) {
      console.error("Error processing edge click:", err);
      setError(
        `Error processing click: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  };

  const handleLeaveGame = () => {
    GameService.disconnectFromRoom();
    navigate("/");
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

  const handleTestEndTurn = () => {
    // Sprawdź jeszcze raz, czy to faktycznie Twoja tura
    if (isMyTurn()) {
      console.log("Testowanie funkcji końca tury");
      GameService.endTurn();
      setBuildMode(null);
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
          <LeaveButton onClick={handleLeaveGame}>Opuść grę</LeaveButton>
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

      {/* Wskaźnik sukcesu akcji */}
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
