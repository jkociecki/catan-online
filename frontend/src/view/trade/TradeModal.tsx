import React, { useState, useEffect } from "react";
import styled from "styled-components";

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  myResources: Record<string, number>;
  players: Array<{
    id: string;
    color: string;
    resources: Record<string, number>;
  }>;
  myPlayerId: string;
  onCreateOffer: (
    offering: Record<string, number>,
    requesting: Record<string, number>,
    targetPlayer?: string
  ) => void;
}

const Modal = styled.div<{ isOpen: boolean }>`
  display: ${(props) => (props.isOpen ? "flex" : "none")};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #64748b;

  &:hover {
    color: #ef4444;
  }
`;

const SectionTitle = styled.h4`
  margin: 16px 0 8px 0;
  color: #1e293b;
  font-size: 16px;
`;

const ResourceSelector = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin: 16px 0;
`;

const ResourceItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
`;

const ResourceIcon = styled.div`
  font-size: 20px;
  margin-bottom: 4px;
`;

const ResourceName = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 4px;
  text-transform: uppercase;
`;

const AvailableCount = styled.div`
  font-size: 10px;
  color: #94a3b8;
  margin-bottom: 8px;
`;

const ResourceControls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CountButton = styled.button`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid #cbd5e1;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;

  &:hover:not(:disabled) {
    background: #f1f5f9;
    border-color: #3b82f6;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CountDisplay = styled.span`
  min-width: 20px;
  text-align: center;
  font-weight: 600;
  color: #1e293b;
`;

const PlayerSelect = styled.select`
  width: 100%;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  margin-bottom: 20px;
  font-size: 14px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
`;

const Button = styled.button<{ variant?: "primary" | "secondary" }>`
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  ${(props) =>
    props.variant === "primary"
      ? `
    background: #3b82f6;
    color: white;
    border: 1px solid #3b82f6;
    
    &:hover {
      background: #2563eb;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
  `
      : `
    background: white;
    color: #64748b;
    border: 1px solid #e2e8f0;
    
    &:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const TradePreview = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
`;

const TradePreviewRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 8px 0;
`;

const ResourceChip = styled.span`
  background: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
  border: 1px solid #e2e8f0;
`;

export default function TradeModal({
  isOpen,
  onClose,
  myResources,
  players,
  myPlayerId,
  onCreateOffer,
}: TradeModalProps) {
  const [offering, setOffering] = useState<Record<string, number>>({});
  const [requesting, setRequesting] = useState<Record<string, number>>({});
  const [targetPlayer, setTargetPlayer] = useState<string>("");

  const resources = ["wood", "brick", "sheep", "wheat", "ore"];
  const resourceIcons: Record<string, string> = {
    wood: "🌲",
    brick: "🧱",
    sheep: "🐑",
    wheat: "🌾",
    ore: "⛰️",
  };
  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setOffering({});
      setRequesting({});
      setTargetPlayer("");
    }
  }, [isOpen]);

  const updateOffering = (resource: string, delta: number) => {
    const current = offering[resource] || 0;
    const available = myResources[resource] || 0;
    const newValue = Math.max(0, Math.min(available, current + delta));

    setOffering((prev) => ({
      ...prev,
      [resource]: newValue === 0 ? 0 : newValue,
    }));
  };

  const updateRequesting = (resource: string, delta: number) => {
    const current = requesting[resource] || 0;
    const newValue = Math.max(0, current + delta);

    setRequesting((prev) => ({
      ...prev,
      [resource]: newValue === 0 ? 0 : newValue,
    }));
  };

  const handleCreateOffer = () => {
    const cleanOffering = Object.fromEntries(
      Object.entries(offering).filter(([_, count]) => count && count > 0)
    );
    const cleanRequesting = Object.fromEntries(
      Object.entries(requesting).filter(([_, count]) => count && count > 0)
    );

    if (Object.keys(cleanOffering).length === 0) {
      alert("You must offer at least one resource");
      return;
    }

    if (Object.keys(cleanRequesting).length === 0) {
      alert("You must request at least one resource");
      return;
    }

    onCreateOffer(cleanOffering, cleanRequesting, targetPlayer || undefined);
    onClose();
  };

  const hasValidOffer = () => {
    const hasOffering = Object.values(offering).some((count) => count > 0);
    const hasRequesting = Object.values(requesting).some((count) => count > 0);
    return hasOffering && hasRequesting;
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <h3 style={{ margin: 0, color: "#1e293b" }}>Create Trade Offer</h3>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        <SectionTitle>I'm offering:</SectionTitle>
        <ResourceSelector>
          {resources.map((resource) => (
            <ResourceItem key={resource}>
              <ResourceIcon>{resourceIcons[resource]}</ResourceIcon>
              <ResourceName>{resource}</ResourceName>
              <AvailableCount>
                Have: {myResources[resource] || 0}
              </AvailableCount>
              <ResourceControls>
                <CountButton
                  onClick={() => updateOffering(resource, -1)}
                  disabled={(offering[resource] || 0) <= 0}
                >
                  -
                </CountButton>
                <CountDisplay>{offering[resource] || 0}</CountDisplay>
                <CountButton
                  onClick={() => updateOffering(resource, 1)}
                  disabled={
                    (offering[resource] || 0) >= (myResources[resource] || 0)
                  }
                >
                  +
                </CountButton>
              </ResourceControls>
            </ResourceItem>
          ))}
        </ResourceSelector>

        <SectionTitle>I want:</SectionTitle>
        <ResourceSelector>
          {resources.map((resource) => (
            <ResourceItem key={resource}>
              <ResourceIcon>{resourceIcons[resource]}</ResourceIcon>
              <ResourceName>{resource}</ResourceName>
              <AvailableCount> </AvailableCount>
              <ResourceControls>
                <CountButton
                  onClick={() => updateRequesting(resource, -1)}
                  disabled={(requesting[resource] || 0) <= 0}
                >
                  -
                </CountButton>
                <CountDisplay>{requesting[resource] || 0}</CountDisplay>
                <CountButton onClick={() => updateRequesting(resource, 1)}>
                  +
                </CountButton>
              </ResourceControls>
            </ResourceItem>
          ))}
        </ResourceSelector>

        <SectionTitle>Target Player (optional):</SectionTitle>
        <PlayerSelect
          value={targetPlayer}
          onChange={(e) => setTargetPlayer(e.target.value)}
        >
          <option value="">All players</option>
          {players
            .filter((p) => p.id !== myPlayerId)
            .map((player) => (
              <option key={player.id} value={player.id}>
                Player {player.id.substring(0, 8)} ({player.color})
              </option>
            ))}
        </PlayerSelect>

        {hasValidOffer() && (
          <TradePreview>
            <strong>Trade Preview:</strong>
            <TradePreviewRow>
              <span>Giving:</span>
              {Object.entries(offering)
                .filter(([_, count]) => count > 0)
                .map(([resource, amount]) => (
                  <ResourceChip key={resource}>
                    {resourceIcons[resource]} {amount}
                  </ResourceChip>
                ))}
            </TradePreviewRow>
            <TradePreviewRow>
              <span>Getting:</span>
              {Object.entries(requesting)
                .filter(([_, count]) => count > 0)
                .map(([resource, amount]) => (
                  <ResourceChip key={resource}>
                    {resourceIcons[resource]} {amount}
                  </ResourceChip>
                ))}
            </TradePreviewRow>
          </TradePreview>
        )}

        <ButtonGroup>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleCreateOffer}
            disabled={!hasValidOffer()}
          >
            Create Offer
          </Button>
        </ButtonGroup>
      </ModalContent>
    </Modal>
  );
}
