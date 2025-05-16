import React, { useState } from 'react';
import styled from 'styled-components';
import GameService from '../../engine/board/GameService';

interface GameActionsProps {
  isMyTurn: boolean;
  myResources: any;
  canBuildSettlement: boolean;
  canBuildCity: boolean;
  canBuildRoad: boolean;
}

const ActionsContainer = styled.div`
  margin-top: 20px;
  padding: 15px;
  background-color: #f8f8f8;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
`;

const ActionButton = styled.button<{ disabled: boolean }>`
  background-color: ${props => props.disabled ? '#cccccc' : '#4caf50'};
  color: white;
  border: none;
  padding: 10px 15px;
  margin: 5px;
  border-radius: 4px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.7 : 1};
  
  &:hover {
    background-color: ${props => props.disabled ? '#cccccc' : '#45a049'};
  }
`;

const ActionGroup = styled.div`
  margin-bottom: 15px;
`;

const ResourceCounter = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 15px;
  gap: 10px;
`;

const Resource = styled.div`
  display: flex;
  align-items: center;
  padding: 5px 10px;
  background-color: #eee;
  border-radius: 4px;
`;

const ResourceIcon = styled.span`
  margin-right: 5px;
`;

export default function GameActions({
  isMyTurn,
  myResources,
  canBuildSettlement,
  canBuildCity,
  canBuildRoad
}: GameActionsProps) {
  const [buildMode, setBuildMode] = useState<string | null>(null);

  const handleBuild = (type: string) => {
    if (!isMyTurn) return;
    
    // Toggle build mode
    if (buildMode === type) {
      setBuildMode(null);
    } else {
      setBuildMode(type);
      // Notify the game service about entering build mode
      GameService.sendMessage({
        type: 'enter_build_mode',
        build_type: type
      });
    }
  };

  const handleRollDice = () => {
    if (!isMyTurn) return;
    
    GameService.sendMessage({
      type: 'game_action',
      action: 'roll_dice'
    });
  };

  const handleEndTurn = () => {
    if (!isMyTurn) return;
    
    GameService.sendMessage({
      type: 'game_action',
      action: 'end_turn'
    });
  };

  // Resource icons mapping
  const resourceIcons: {[key: string]: string} = {
    'WOOD': '🌲',
    'BRICK': '🧱',
    'SHEEP': '🐑',
    'WHEAT': '🌾',
    'ORE': '⛰️'
  };

  return (
    <ActionsContainer>
      <h3>Game Actions</h3>
      
      <ResourceCounter>
        {Object.entries(myResources || {}).map(([resource, count]) => (
          <Resource key={resource}>
            <>
              <ResourceIcon>{resourceIcons[resource] || '📦'}</ResourceIcon>
              {resource}: {count}
            </>
          </Resource>
        ))}
      </ResourceCounter>
      
      <ActionGroup>
        <ActionButton 
          disabled={!isMyTurn} 
          onClick={handleRollDice}
        >
          Roll Dice
        </ActionButton>
        
        <ActionButton 
          disabled={!isMyTurn || !canBuildSettlement} 
          onClick={() => handleBuild('settlement')}
          style={{backgroundColor: buildMode === 'settlement' ? '#2196F3' : undefined}}
        >
          Build Settlement
        </ActionButton>
        
        <ActionButton 
          disabled={!isMyTurn || !canBuildCity} 
          onClick={() => handleBuild('city')}
          style={{backgroundColor: buildMode === 'city' ? '#2196F3' : undefined}}
        >
          Build City
        </ActionButton>
        
        <ActionButton 
          disabled={!isMyTurn || !canBuildRoad} 
          onClick={() => handleBuild('road')}
          style={{backgroundColor: buildMode === 'road' ? '#2196F3' : undefined}}
        >
          Build Road
        </ActionButton>
      </ActionGroup>
      
      <ActionGroup>
        <ActionButton 
          disabled={!isMyTurn} 
          onClick={handleEndTurn}
        >
          End Turn
        </ActionButton>
      </ActionGroup>
      
      {buildMode && (
        <div>
          <p>Click on the board to build a {buildMode}</p>
          <ActionButton 
            disabled={false} 
            onClick={() => setBuildMode(null)}
          >
            Cancel
          </ActionButton>
        </div>
      )}
    </ActionsContainer>
  );
}