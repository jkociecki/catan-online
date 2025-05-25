// frontend/src/view/game/GameActions.tsx - KOMPLETNA WERSJA
import React, { useState, useEffect } from "react";
import styled from "styled-components";

interface GameActionsProps {
  isMyTurn: boolean;
  myResources: any;
  canBuildSettlement: boolean;
  canBuildCity: boolean;
  canBuildRoad: boolean;
  gamePhase: string;
  players: any[];
  myPlayerId: string;
  setBuildMode?: (mode: "settlement" | "city" | "road" | null) => void;
  buildMode?: "settlement" | "city" | "road" | null;
  onEndTurn?: () => void;
  onRollDice?: () => void;
}

const RightPanel = styled.div`
  width: 380px;
  background: white;
  border-left: 1px solid #e1e5e9;
  overflow-y: auto;

  @media (max-width: 1400px) {
    width: 340px;
  }

  @media (max-width: 1200px) {
    width: 100%;
    border-left: none;
    border-top: 1px solid #e1e5e9;
    max-height: 300px;
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

const ResourceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
  }
`;

const ResourceItem = styled.div`
  text-align: center;
  padding: 14px 10px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;

  &:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }
`;

const ResourceIcon = styled.div`
  font-size: 18px;
  margin-bottom: 6px;
`;

const ResourceCount = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 3px;
`;

const ResourceLabel = styled.div`
  font-size: 10px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ActionGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;

  @media (max-width: 1200px) {
    gap: 8px;
  }
`;

const ActionButton = styled.button<{
  variant?: "primary" | "secondary" | "danger" | "disabled";
  active?: boolean;
  fullWidth?: boolean;
}>`
  padding: 14px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  grid-column: ${(props) => (props.fullWidth ? "1 / -1" : "auto")};

  ${(props) => {
    if (props.active) {
      return `
        background: #3b82f6;
        border-color: #3b82f6;
        color: white;
        box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
        &:hover { background: #2563eb; border-color: #2563eb; }
      `;
    }

    switch (props.variant) {
      case "danger":
        return `
          background: #ef4444;
          border-color: #ef4444;
          color: white;
          &:hover:not(:disabled) { background: #dc2626; border-color: #dc2626; }
        `;
      case "disabled":
        return `
          background: #f1f5f9;
          border-color: #e2e8f0;
          color: #94a3b8;
          cursor: not-allowed;
        `;
      case "secondary":
        return `
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #475569;
          &:hover:not(:disabled) { background: #f1f5f9; border-color: #cbd5e1; }
        `;
      default:
        return `
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
          &:hover:not(:disabled) { background: #2563eb; border-color: #2563eb; }
        `;
    }
  }}

  &:disabled {
    background: #f1f5f9;
    border-color: #e2e8f0;
    color: #94a3b8;
    cursor: not-allowed;
  }

  @media (max-width: 1200px) {
    padding: 12px 14px;
    font-size: 12px;
  }
`;

const BuildModeIndicator = styled.div`
  background: #fef3c7;
  color: #d97706;
  padding: 12px;
  border-radius: 6px;
  text-align: center;
  font-size: 13px;
  border: 1px solid #fde68a;
`;

export default function GameActions({
  isMyTurn,
  myResources,
  canBuildSettlement,
  canBuildCity,
  canBuildRoad,
  gamePhase,
  players,
  myPlayerId,
  setBuildMode,
  buildMode,
  onEndTurn,
  onRollDice,
}: GameActionsProps) {
  const [hasRolled, setHasRolled] = useState<boolean>(false);
  const [setupProgress, setSetupProgress] = useState<{
    settlements: number;
    roads: number;
  }>({ settlements: 0, roads: 0 });

  const isSetupPhase = gamePhase === "setup";

  const resourceIcons: { [key: string]: string } = {
    WOOD: "🌲",
    wood: "🌲",
    BRICK: "🧱",
    brick: "🧱",
    SHEEP: "🐑",
    sheep: "🐑",
    WHEAT: "🌾",
    wheat: "🌾",
    ORE: "⛰️",
    ore: "⛰️",
  };

  // Process resources
  const processedResources = React.useMemo(() => {
    if (!myResources || typeof myResources !== "object") {
      return [];
    }

    const entries = Object.entries(myResources);
    const validEntries = entries.filter(([resource, count]) => {
      return typeof count === "number" && count >= 0;
    });

    return validEntries.sort(([a], [b]) => a.localeCompare(b));
  }, [myResources]);

  // Calculate setup progress
  useEffect(() => {
    if (isSetupPhase) {
      const myPlayer = players.find((p) => p.id === myPlayerId);
      if (myPlayer) {
        const settlementCount = 5 - (myPlayer.settlements_left || 5);
        const roadCount = 15 - (myPlayer.roads_left || 15);

        setSetupProgress({
          settlements: Math.min(settlementCount, 2),
          roads: Math.min(roadCount, 2),
        });
      }
    }
  }, [isSetupPhase, players, myPlayerId]);

  // Reset states when turn changes
  useEffect(() => {
    if (!isMyTurn) {
      setBuildMode?.(null);
      setHasRolled(false);
    }
  }, [isMyTurn, setBuildMode]);

  // Handle build mode toggle
  const handleBuild = (type: "settlement" | "city" | "road") => {
    if (!isMyTurn) return;

    if (buildMode === type) {
      setBuildMode?.(null);
    } else {
      setBuildMode?.(type);
    }
  };

  // Handle dice roll
  const handleRollDice = () => {
    if (!isMyTurn || hasRolled || isSetupPhase) return;

    if (onRollDice) {
      onRollDice();
      setHasRolled(true);
    }
  };

  // Handle end turn
  const handleEndTurn = () => {
    if (!isMyTurn) return;

    if (onEndTurn) {
      onEndTurn();
      setBuildMode?.(null);
      setHasRolled(false);
    }
  };

  return (
    <RightPanel>
      <Panel>
        <Section>
          <SectionHeader>Resources</SectionHeader>
          <ResourceGrid>
            {processedResources.length > 0 ? (
              processedResources.map(([resource, amount]) => (
                <ResourceItem key={resource}>
                  <ResourceIcon>
                    {resourceIcons[resource] ||
                      resourceIcons[resource.toLowerCase()] ||
                      "📦"}
                  </ResourceIcon>
                  <ResourceCount>{amount as number}</ResourceCount>
                  <ResourceLabel>{resource}</ResourceLabel>
                </ResourceItem>
              ))
            ) : (
              <ResourceItem style={{ gridColumn: "1 / -1" }}>
                <ResourceIcon>📦</ResourceIcon>
                <ResourceCount>0</ResourceCount>
                <ResourceLabel>No Resources</ResourceLabel>
              </ResourceItem>
            )}
          </ResourceGrid>
        </Section>

        <Section>
          <SectionHeader>Actions</SectionHeader>
          <ActionGrid>
            {isSetupPhase ? (
              <>
                <ActionButton variant="secondary" disabled={true}>
                  🎲 Roll Dice
                </ActionButton>

                <ActionButton
                  variant="danger"
                  onClick={handleEndTurn}
                  disabled={
                    !isMyTurn ||
                    setupProgress.roads <= setupProgress.settlements ||
                    (setupProgress.settlements === 1 &&
                      setupProgress.roads === 0) ||
                    (setupProgress.settlements === 2 &&
                      setupProgress.roads === 1)
                  }
                >
                  ⏭️ End Turn
                </ActionButton>
              </>
            ) : (
              <>
                <ActionButton
                  variant="secondary"
                  onClick={handleRollDice}
                  disabled={!isMyTurn || hasRolled}
                >
                  🎲 Roll Dice
                </ActionButton>

                <ActionButton
                  variant="danger"
                  onClick={handleEndTurn}
                  disabled={!isMyTurn}
                >
                  ⏭️ End Turn
                </ActionButton>
              </>
            )}
          </ActionGrid>
        </Section>

        <Section>
          <SectionHeader>Build</SectionHeader>
          <ActionGrid>
            <ActionButton
              active={buildMode === "settlement"}
              onClick={() => handleBuild("settlement")}
              disabled={!isMyTurn || (!canBuildSettlement && !isSetupPhase)}
            >
              🏠 Settlement
            </ActionButton>

            <ActionButton
              active={buildMode === "road"}
              onClick={() => handleBuild("road")}
              disabled={!isMyTurn || (!canBuildRoad && !isSetupPhase)}
            >
              🛣️ Road
            </ActionButton>

            <ActionButton
              active={buildMode === "city"}
              onClick={() => handleBuild("city")}
              disabled={!isMyTurn || !canBuildCity || isSetupPhase}
            >
              🏰 City
            </ActionButton>

            <ActionButton variant="disabled" disabled={true}>
              🃏 Dev Card
            </ActionButton>
          </ActionGrid>
        </Section>

        <Section>
          <SectionHeader>Trade</SectionHeader>
          <ActionGrid>
            <ActionButton variant="disabled" disabled={true}>
              🤝 Trade
            </ActionButton>

            <ActionButton variant="disabled" disabled={true}>
              🏪 Maritime
            </ActionButton>
          </ActionGrid>
        </Section>

        {buildMode && (
          <Section>
            <BuildModeIndicator>
              🔨 Building: {buildMode}
              <div style={{ fontSize: "11px", marginTop: "4px", opacity: 0.8 }}>
                Click on the board to place
              </div>
            </BuildModeIndicator>
          </Section>
        )}
      </Panel>
    </RightPanel>
  );
}
