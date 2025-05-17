import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import GameService from '../../engine/board/GameService';
import { BoardService } from '../../engine/board/BoardService';
import { CatanBoard } from '../CatanBoard';
import { Board } from '../../engine/board';
import { GameDirector } from '../../game/GameDirector';
import styled from 'styled-components';
import PlayersList from './PlayerList';
import GameActions from './GameActions';

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
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('');
  const [players, setPlayers] = useState<any[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [buildMode, setBuildMode] = useState<string | null>(null);
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  
  // Use useMemo to create gameDirector once
  const gameDirector = useMemo(() => new GameDirector(), []);

  const fetchRandomBoardIfNeeded = useCallback(async () => {
    if (!initialGameState) {
      try {
        const boardData = await BoardService.getRandomBoard();
        const newBoard = new Board(2, gameDirector.getConfig());
        newBoard.loadFromData(boardData);
        setBoard(newBoard);
        setGameState({ board: boardData, players: [] });
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch random board', err);
        setError('Failed to load game board. Please try again.');
        setLoading(false);
      }
    } else {
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
    }
  }, [initialGameState, gameDirector]);

  // Setup WebSocket connection
  useEffect(() => {
    if (!roomId) {
      // Redirect if room ID is missing
      navigate('/');
      return;
    }

    const setupConnection = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Connect to WebSocket if not already connected
        if (!GameService.isConnected()) {
          console.log(`Attempting to connect to room: ${roomId}`);
          await GameService.connectToRoom(roomId);
          setIsConnected(true);
          
          // Try to get client ID
          try {
            const id = await GameService.getClientId();
            setMyPlayerId(id);
            console.log("Got player ID:", id);
          } catch (idErr) {
            console.warn("Couldn't get client ID immediately, will try again later", idErr);
          }
        } else {
          setIsConnected(true);
        }
        
        // Fetch board data if needed
        await fetchRandomBoardIfNeeded();
        
        // Request game state once connected
        GameService.getGameState();
        
        setLoading(false);
      } catch (err) {
        console.error("Failed to setup game connection:", err);
        setError(`Connection error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsConnected(false);
        setLoading(false);
      }
    };
    
    setupConnection();
    
    // Cleanup on unmount
    return () => {
      // No need to disconnect on page navigation within the app
    };
  }, [roomId, fetchRandomBoardIfNeeded, navigate]);
  
  // Setup WebSocket event handlers
  useEffect(() => {
    // Handle game state updates
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
      setDiceResult(data.result);
      
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
      GameService.addEventHandler('game_update', handleGameUpdate);
      GameService.addEventHandler('game_state', handleGameState);
      GameService.addEventHandler('client_id', handleClientId);
      GameService.addEventHandler('player_joined', handlePlayerJoined);
      GameService.addEventHandler('dice_roll', handleDiceRoll);
      GameService.addEventHandler('build_mode', handleBuildModeEnter);
      GameService.addEventHandler('error', handleError);
      GameService.addEventHandler('disconnect', handleDisconnect);
    }
    
    // Cleanup event handlers
    return () => {
      if (isConnected) {
        GameService.removeEventHandler('game_update', handleGameUpdate);
        GameService.removeEventHandler('game_state', handleGameState);
        GameService.removeEventHandler('client_id', handleClientId);
        GameService.removeEventHandler('player_joined', handlePlayerJoined);
        GameService.removeEventHandler('dice_roll', handleDiceRoll);
        GameService.removeEventHandler('build_mode', handleBuildModeEnter);
        GameService.removeEventHandler('error', handleError);
        GameService.removeEventHandler('disconnect', handleDisconnect);
      }
    };
  }, [isConnected, board, gameDirector, myPlayerId]);
  
  // Player-related helper functions
  const getMyResources = () => {
    const myPlayer = players.find(p => p.id === myPlayerId);
    return myPlayer ? myPlayer.resources : {};
  };
  
  const isMyTurn = () => {
    return myPlayerId === currentPlayerId;
  };
  
  const canBuildSettlement = () => {
    const myPlayer = players.find(p => p.id === myPlayerId);
    if (!myPlayer) return false;
    
    const resources = myPlayer.resources || {};
    return (
      (myPlayer.settlements_left > 0) &&
      (resources.WOOD >= 1 && 
      resources.BRICK >= 1 && 
      resources.SHEEP >= 1 && 
      resources.WHEAT >= 1)
    );
  };
  
  const canBuildCity = () => {
    const myPlayer = players.find(p => p.id === myPlayerId);
    if (!myPlayer) return false;
    
    const resources = myPlayer.resources || {};
    return (myPlayer.cities_left > 0) && (resources.ORE >= 3 && resources.WHEAT >= 2);
  };
  
  const canBuildRoad = () => {
    const myPlayer = players.find(p => p.id === myPlayerId);
    if (!myPlayer) return false;
    
    const resources = myPlayer.resources || {};
    return (myPlayer.roads_left > 0) && (resources.WOOD >= 1 && resources.BRICK >= 1);
  };
  
  // Handle building actions
  const handleCornerClick = (corner: any, tile: any) => {
    if (!isMyTurn() || !buildMode || !board) return;
    
    if (buildMode === 'settlement' || buildMode === 'city') {
      // Get coordinates for the corner
      const coords = [];
      for (const coord of corner.tiles) {
        coords.push(Array.from(coord));
      }
      
      console.log(`Building ${buildMode} at:`, coords);
      
      // Send build action to server
      GameService.sendMessage({
        type: 'game_action',
        action: `build_${buildMode}`,
        coords: coords
      });
    }
  };
  
  const handleEdgeClick = (edge: any, tile: any) => {
    if (!isMyTurn() || buildMode !== 'road' || !board) return;
    
    // Get coordinates for the edge
    const coords = [];
    for (const coord of edge.tiles) {
      coords.push(Array.from(coord));
    }
    
    console.log("Building road at:", coords);
    
    // Send build action to server
    GameService.sendMessage({
      type: 'game_action',
      action: 'build_road',
      coords: coords
    });
  };
  
  const handleLeaveGame = () => {
    GameService.disconnectFromRoom();
    navigate('/');
  };
  
  if (loading) {
    return <LoadingMessage>Loading game...</LoadingMessage>;
  }
  
  if (!board) {
    return <ErrorMessage>Failed to load game board. Please try again.</ErrorMessage>;
  }

  return (
    <GameContainer>
      <GameHeader>
        <h2>Catan Online Game - Room: {roomId}</h2>
        <LeaveButton onClick={handleLeaveGame}>Leave Game</LeaveButton>
      </GameHeader>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      
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
          />
        </SidePanel>
      </GameLayout>
    </GameContainer>
  );
}