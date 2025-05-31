// frontend/src/view/game/PlayerList.tsx - KOMPLETNA WERSJA
import React from "react";
import styled from "styled-components";

interface PlayerListProps {
  players: Array<{
    id: string;
    color: string;
    resources: Record<string, number>;
    victory_points: number;
    settlements_left?: number;
    cities_left?: number;
    roads_left?: number;
    display_name?: string;
  }>;
  currentPlayerId: string;
  isMyTurn: boolean;
}

const LeftPanel = styled.div`
  width: 280px;
  background: white;
  border-right: 1px solid #e1e5e9;
  overflow-y: auto;

  @media (max-width: 1200px) {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e1e5e9;
    max-height: 200px;
  }
`;

const Panel = styled.div`
  padding: 24px;

  @media (max-width: 1200px) {
    padding: 16px;
  }
`;

const Section = styled.div`
  margin-bottom: 20px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionHeader = styled.div`
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
  margin-bottom: 14px;
`;

const PlayerCard = styled.div<{ isActive: boolean; color: string }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 12px;
  border-radius: 8px;
  border: 1px solid ${(props) => (props.isActive ? props.color : "#e1e5e9")};
  background: ${(props) => (props.isActive ? `${props.color}08` : "white")};
  margin-bottom: 10px;
  transition: all 0.2s;

  &:hover {
    border-color: ${(props) => props.color};
    background: ${(props) => `${props.color}06`};
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const PlayerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const PlayerDot = styled.div<{ color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${(props) => props.color};
  box-shadow: 0 0 0 2px white, 0 0 0 3px ${(props) => props.color}40;
`;

const PlayerName = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
`;

const PlayerStats = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: #64748b;

  @media (max-width: 1200px) {
    gap: 8px;
    font-size: 12px;
  }
`;

const VictoryPoints = styled.div<{ isLeading: boolean }>`
  background: ${(props) => (props.isLeading ? "#3b82f6" : "#f1f5f9")};
  color: ${(props) => (props.isLeading ? "white" : "#64748b")};
  padding: 6px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  min-width: 32px;
  text-align: center;
  box-shadow: ${(props) =>
    props.isLeading ? "0 2px 4px rgba(59, 130, 246, 0.2)" : "none"};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #64748b;
  font-style: italic;
  font-size: 14px;
`;

export default function PlayersList({
  players,
  currentPlayerId,
  isMyTurn,
}: PlayerListProps) {
  if (!players || players.length === 0) {
    return (
      <LeftPanel>
        <Panel>
          <Section>
            <SectionHeader>Players</SectionHeader>
            <EmptyState>Waiting for players...</EmptyState>
          </Section>
        </Panel>
      </LeftPanel>
    );
  }

  const maxVictoryPoints = Math.max(...players.map((p) => p.victory_points));

  return (
    <LeftPanel>
      <Panel>
        <Section>
          <SectionHeader>Players ({players.length})</SectionHeader>
          {players.map((player, index) => {
            const isCurrentPlayer = player.id === currentPlayerId;
            const isLeading =
              player.victory_points === maxVictoryPoints &&
              maxVictoryPoints > 0;
            const displayName = (player as any).display_name || player.id.substring(0, 8);
            const totalResources = Object.values(player.resources || {}).reduce(
              (a: number, b: number) => a + b,
              0
            );

            return (
              <PlayerCard
                key={player.id}
                isActive={isCurrentPlayer}
                color={player.color}
              >
                <PlayerInfo>
                  <PlayerDot color={player.color} />
                  <PlayerName>{displayName}</PlayerName>
                </PlayerInfo>
                <PlayerStats>
                  <span>{totalResources} cards</span>
                  <VictoryPoints isLeading={isLeading}>
                    {player.victory_points}
                  </VictoryPoints>
                </PlayerStats>
              </PlayerCard>
            );
          })}
        </Section>
      </Panel>
    </LeftPanel>
  );
}
