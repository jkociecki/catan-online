import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import GameService from '../../engine/board/GameService';
import { CatanBoard } from '../../view/CatanBoard';
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

export default function OnlineGame() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialGameState = location.state?.gameState;
  const roomId = location.state?.roomId;
  
  const [board, setBoard] = useState<Board | null>(null);
  const [gameState, setGameState] = useState<any>(initialGameState);
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('');
  const [players, setPlayers] = useState<any[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [buildMode, setBuildMode] = useState<string | null>(null);
  const [diceResult, setDiceResult] = useState<number | null>(null);
  
  const gameDirector = new GameDirector();

  useEffect(() => {
    if (!initialGameState || !roomId) {
      // Redirect if game state or room ID is missing
      navigate('/');
      return;
    }

    // Load board from game state
    const newBoard = new Board(2, gameDirector.getConfig());
    newBoard.loadFromData(initialGameState.board);
    setBoard(newBoard);
    
    // Set players and current player
    setPlayers(initialGameState.players);
    if (initialGameState.players.length > 0) {
      const currentPlayerIndex = initialGameState.current_player_index || 0;
      setCurrentPlayerId(initialGameState.players[currentPlayerIndex].id);
    }
    
    // Save my player ID
    GameService.getClientId().then(id => {
      setMyPlayerId(id);
    });
    
    // Connect to WebSocket if not already connected
    const connectToRoom = async () => {
      if (!GameService.isConnected()) {
        try {
          await GameService.connectToRoom(roomId);
        } catch (err) {
          console.error('Failed to connect to room', err);
          navigate('/');
        }
      }
    };
    
    connectToRoom();
    
    // Set up event handlers
    const handleGameUpdate = (data: any) => {
      // Update game state
      setGameState(data.game_state);
      
      // Update board
      const updatedBoard = new Board(2, gameDirector.getConfig());
      updatedBoard.loadFromData(data.game_state.board);
      setBoard(updatedBoard);
      
      // Update players
      setPlayers(data.game_state.players);
      
      // Update current player
      const currentPlayerIndex = data.game_state.current_player_index || 0;
      if (data.game_state.players.length > 0) {
        setCurrentPlayerId(data.game_state.players[currentPlayerIndex].id);
      }
      
      // Clear build mode when game state updates
      setBuildMode(null);
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
    
    const handleDisconnect = () => {
      navigate('/');
    };
    
    GameService.addEventHandler('game_update', handleGameUpdate);
    GameService.addEventHandler('dice_roll', handleDiceRoll);
    GameService.addEventHandler('build_mode', handleBuildModeEnter);
    GameService.addEventHandler('disconnect', handleDisconnect);
    
    // Cleanup
    return () => {
      GameService.removeEventHandler('game_update', handleGameUpdate);
      GameService.removeEventHandler('dice_roll', handleDiceRoll);
      GameService.removeEventHandler('build_mode', handleBuildModeEnter);
      GameService.removeEventHandler('disconnect', handleDisconnect);
      GameService.disconnectFromRoom();
    };
  }, [initialGameState, roomId, gameDirector, navigate]);
  
  // Get my resources
  const getMyResources = () => {
    const myPlayer = players.find(p => p.id === myPlayerId);
    return myPlayer ? myPlayer.resources : {};
  };
  
  // Check if it's my turn
  const isMyTurn = () => {
    return myPlayerId === currentPlayerId;
  };
  
  // Check if I can build specific items
  const canBuildSettlement = () => {
    const myPlayer = players.find(p => p.id === myPlayerId);
    if (!myPlayer) return false;
    
    const resources = myPlayer.resources || {};
    return (
      resources.WOOD >= 1 && 
      resources.BRICK >= 1 && 
      resources.SHEEP >= 1 && 
      resources.WHEAT >= 1
    );
  };
  
  const canBuildCity = () => {
    const myPlayer = players.find(p => p.id === myPlayerId);
    if (!myPlayer) return false;
    
    const resources = myPlayer.resources || {};
    return resources.ORE >= 3 && resources.WHEAT >= 2;
  };
  
  const canBuildRoad = () => {
    const myPlayer = players.find(p => p.id === myPlayerId);
    if (!myPlayer) return false;
    
    const resources = myPlayer.resources || {};
    return resources.WOOD >= 1 && resources.BRICK >= 1;
  };
  
  // Handle corner click (for settlements/cities)
  const handleCornerClick = (corner: any, tile: any) => {
    if (!isMyTurn() || !buildMode || !board) return;
    
    if (buildMode === 'settlement' || buildMode === 'city') {
      // Get coordinates for the corner
      const coords = corner.getCoordinates();
      
      // Send build action to server
      GameService.sendMessage({
        type: 'game_action',
        action: `build_${buildMode}`,
        coords: coords
      });
    }
  };
  
  // Handle edge click (for roads)
  const handleEdgeClick = (edge: any, tile: any) => {
    if (!isMyTurn() || buildMode !== 'road' || !board) return;
    
    // Get coordinates for the edge
    const coords = edge.getCoordinates();
    
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
  
  if (!board) {
    return <div>Loading game...</div>;
  }

  return (
    <GameContainer>
      <GameHeader>
        <h2>Catan Online Game</h2>
        <LeaveButton onClick={handleLeaveGame}>Leave Game</LeaveButton>
      </GameHeader>
      
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