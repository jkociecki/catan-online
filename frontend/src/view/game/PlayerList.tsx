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
  myPlayerId: string;
}

const PlayerContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
  border-radius: 5px;
  overflow: hidden;
`;

const PlayerCard = styled.div<{ isActive: boolean; isMe: boolean; playerColor: string }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  margin-bottom: 5px;
  background-color: ${(props) => props.isActive ? props.playerColor : '#f5f5f5'};
  color: ${(props) => props.isActive ? 'white' : 'black'};
  border-left: 5px solid ${(props) => props.playerColor};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  ${(props) => props.isMe && `
    border: 2px solid #333;
    font-weight: ${props.isActive ? 'bold' : 'normal'};
  `}
`;

const PlayerName = styled.div`
  font-weight: bold;
  display: flex;
  align-items: center;
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

const YourPlayerIndicator = styled.span`
  background-color: #ffeb3b;
  color: #333;
  border-radius: 3px;
  padding: 2px 4px;
  font-size: 0.8rem;
  margin-left: 8px;
`;

export default function PlayersList({ players, currentPlayerId, myPlayerId }: PlayerListProps) {
  return (
    <PlayerContainer>
      <h3>Players</h3>
      {players.map((player) => {
        const isCurrentPlayer = player.id === currentPlayerId;
        const isMe = player.id === myPlayerId;
        
        // Display only first 8 characters of ID for readability
        const displayName = `Player ${player.id.substring(0, 8)}`;
        
        return (
          <PlayerCard 
            key={player.id}
            isActive={isCurrentPlayer}
            isMe={isMe}
            playerColor={player.color}
          >
            <PlayerName>
              {isCurrentPlayer && <CurrentTurnIndicator>→</CurrentTurnIndicator>}
              {displayName}
              {isMe && <YourPlayerIndicator>YOU</YourPlayerIndicator>}
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