import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

interface GameActionsProps {
  isMyTurn: boolean;
  myResources: any;
  canBuildSettlement: boolean;
  canBuildCity: boolean;
  canBuildRoad: boolean;
  buildMode: string | null;
  setBuildMode: (type: string | null) => void;
  onRollDice: () => void;
  onEndTurn: () => void;
}

const ActionsContainer = styled.div`
  margin-top: 20px;
  padding: 15px;
  background-color: #f8f8f8;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
`;

const ActionButton = styled.button<{ disabled: boolean; active?: boolean }>`
  background-color: ${props => 
    props.active ? '#2196F3' : 
    props.disabled ? '#cccccc' : '#4caf50'};
  color: white;
  border: none;
  padding: 10px 15px;
  margin: 5px;
  border-radius: 4px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.7 : 1};
  
  &:hover {
    background-color: ${props => 
      props.active ? '#1976D2' : 
      props.disabled ? '#cccccc' : '#45a049'};
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
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
`;

const ResourceIcon = styled.span`
  margin-right: 5px;
`;

const ResourceText = styled.span`
  display: inline-block;
`;

const BuildInstructions = styled.div`
  background-color: #e3f2fd;
  padding: 10px;
  margin-top: 10px;
  border-radius: 4px;
  font-style: italic;
`;

const StatusBadge = styled.div<{type: 'active' | 'waiting' | 'ready'}>`
  background-color: ${props => 
    props.type === 'active' ? '#4caf50' : 
    props.type === 'ready' ? '#2196F3' : '#f57c00'};
  color: white;
  border-radius: 15px;
  padding: 3px 8px;
  font-size: 12px;
  font-weight: bold;
  display: inline-block;
  margin-bottom: 15px;
`;

export default function GameActions({
  isMyTurn,
  myResources,
  canBuildSettlement,
  canBuildCity,
  canBuildRoad,
  buildMode,
  setBuildMode,
  onRollDice,
  onEndTurn
}: GameActionsProps) {
  const [hasRolled, setHasRolled] = useState<boolean>(false);

  // Reset hasRolled state when turn changes
  useEffect(() => {
    if (!isMyTurn) {
      setHasRolled(false);
    }
  }, [isMyTurn]);

  const handleBuild = (type: string) => {
    if (!isMyTurn || !hasRolled) {
      console.log("Cannot build: not your turn or haven't rolled dice");
      return;
    }
    
    // Toggle build mode
    if (buildMode === type) {
      setBuildMode(null);
    } else {
      setBuildMode(type);
    }
  };

  const handleRollDice = () => {
    if (!isMyTurn || hasRolled) {
      console.log("Cannot roll dice: not your turn or already rolled");
      return;
    }
    
    onRollDice();
    setHasRolled(true);
  };

  const handleEndTurn = () => {
    if (!isMyTurn || !hasRolled) {
      console.log("Cannot end turn: not your turn or haven't rolled dice");
      return;
    }
    
    onEndTurn();
    setBuildMode(null);
    setHasRolled(false);
  };

  // Resource icons mapping
  const resourceIcons: {[key: string]: string} = {
    'WOOD': '🌲',
    'BRICK': '🧱',
    'SHEEP': '🐑',
    'WHEAT': '🌾',
    'ORE': '⛰️'
  };

  // Sort resources for consistent display
  const sortedResources = Object.entries(myResources || {})
    .sort(([a], [b]) => a.localeCompare(b));

  const getStatusBadge = () => {
    if (!isMyTurn) {
      return <StatusBadge type="waiting">Waiting for Opponent</StatusBadge>;
    }
    if (isMyTurn && !hasRolled) {
      return <StatusBadge type="ready">Your Turn - Roll Dice</StatusBadge>;
    }
    return <StatusBadge type="active">Your Turn - Building Phase</StatusBadge>;
  };

  return (
    <ActionsContainer>
      <h3>Game Actions</h3>
      
      {getStatusBadge()}
      
      <ResourceCounter>
        {sortedResources.length > 0 ? (
          sortedResources.map(([resource, count]) => (
            <Resource key={resource}>
              <ResourceIcon>{resourceIcons[resource] || '📦'}</ResourceIcon>
              {/* <ResourceText>{resource}: {count}</ResourceText> */}
            </Resource>
          ))
        ) : (
          <Resource>
            <ResourceText>No resources yet</ResourceText>
          </Resource>
        )}
      </ResourceCounter>
      
      <ActionGroup>
        <ActionButton 
          disabled={!isMyTurn || hasRolled} 
          onClick={handleRollDice}
        >
          Roll Dice
        </ActionButton>
        
        <ActionButton 
          disabled={!isMyTurn || !hasRolled || !canBuildSettlement} 
          active={buildMode === 'settlement'}
          onClick={() => handleBuild('settlement')}
        >
          Build Settlement
        </ActionButton>
        
        <ActionButton 
          disabled={!isMyTurn || !hasRolled || !canBuildCity} 
          active={buildMode === 'city'}
          onClick={() => handleBuild('city')}
        >
          Build City
        </ActionButton>
        
        <ActionButton 
          disabled={!isMyTurn || !hasRolled || !canBuildRoad} 
          active={buildMode === 'road'}
          onClick={() => handleBuild('road')}
        >
          Build Road
        </ActionButton>
      </ActionGroup>
      
      <ActionGroup>
        <ActionButton 
          disabled={!isMyTurn || !hasRolled} 
          onClick={handleEndTurn}
        >
          End Turn
        </ActionButton>
      </ActionGroup>
      
      {buildMode && (
        <BuildInstructions>
          <p>Click on the board to build a {buildMode}</p>
          <ActionButton 
            disabled={false} 
            onClick={() => setBuildMode(null)}
          >
            Cancel Building
          </ActionButton>
        </BuildInstructions>
      )}

      {!isMyTurn && (
        <BuildInstructions>
          Waiting for other player's turn to complete...
        </BuildInstructions>
      )}
      
      {isMyTurn && !hasRolled && (
        <BuildInstructions>
          Roll the dice to start your turn!
        </BuildInstructions>
      )}
    </ActionsContainer>
  );
}