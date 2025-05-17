import React from 'react';
import styled from 'styled-components';

interface PlayerListProps {
  players: Array<{
    id: string;
    color: string;
    resources: Record<string, number>;
    victory_points: number;
  }>;
  currentPlayerId: string;
  isMyTurn: boolean;
}

const PlayerContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
  border-radius: 5px;
  overflow: hidden;
`;

const PlayerCard = styled.div<{ isActive: boolean; playerColor: string }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  margin-bottom: 5px;
  background-color: ${(props) => props.isActive ? props.playerColor : '#f5f5f5'};
  color: ${(props) => props.isActive ? 'white' : 'black'};
  border-left: 5px solid ${(props) => props.playerColor};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const PlayerName = styled.div`
  font-weight: bold;
`;

const PlayerStats = styled.div`
  display: flex;
  gap: 15px;
`;

const ResourceCount = styled.div`
  font-size: 0.9rem;
  display: flex;
  align-items: center;
`;

const ResourceIcon = styled.span`
  margin-right: 5px;
`;

const VictoryPoints = styled.div`
  background-color: rgba(255, 255, 255, 0.2);
  padding: 3px 8px;
  border-radius: 10px;
  font-weight: bold;
`;

const CurrentTurnIndicator = styled.div`
  font-weight: bold;
  color: gold;
  margin-right: 10px;
`;

export default function PlayersList({ players, currentPlayerId, isMyTurn }: PlayerListProps) {
  return (
    <PlayerContainer>
      <h3>Players</h3>
      {players.map((player) => {
        const isCurrentPlayer = player.id === currentPlayerId;
        // Display only first 8 characters of ID for readability
        const displayName = `Player ${player.id.substring(0, 8)}`;
        
        return (
          <PlayerCard 
            key={player.id}
            isActive={isCurrentPlayer}
            playerColor={player.color}
          >
            <PlayerName>
              {isCurrentPlayer && <CurrentTurnIndicator>→</CurrentTurnIndicator>}
              {displayName}
              {isMyTurn && isCurrentPlayer && " (Your Turn)"}
            </PlayerName>
            <PlayerStats>
              <ResourceCount>
                <>
                  <ResourceIcon>🎲</ResourceIcon>
                  {Object.values(player.resources || {}).reduce((a, b) => a + b, 0)}
                </>
              </ResourceCount>
              <VictoryPoints>{player.victory_points} VP</VictoryPoints>
            </PlayerStats>
          </PlayerCard>
        );
      })}
    </PlayerContainer>
  );
}