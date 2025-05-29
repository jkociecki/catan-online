import React, { useState } from "react";
import styled from "styled-components";

interface BankTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  myResources: Record<string, number>;
  onBankTrade: (
    givingResource: string,
    givingAmount: number,
    requestingResource: string
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
  max-width: 400px;
  width: 90%;
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

const TradeSection = styled.div`
  margin: 20px 0;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
`;

const SectionTitle = styled.h4`
  margin: 0 0 12px 0;
  color: #1e293b;
  font-size: 14px;
`;

const ResourceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
`;

const ResourceItem = styled.button<{ selected?: boolean; disabled?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  border: 2px solid ${(props) => (props.selected ? "#3b82f6" : "#e2e8f0")};
  border-radius: 8px;
  background: ${(props) => (props.selected ? "#eff6ff" : "white")};
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  opacity: ${(props) => (props.disabled ? 0.5 : 1)};
  transition: all 0.2s;

  &:hover:not(:disabled) {
    border-color: #3b82f6;
    background: #f8fafc;
  }
`;

const ResourceIcon = styled.div`
  font-size: 18px;
  margin-bottom: 4px;
`;

const ResourceName = styled.div`
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
`;

const ResourceCount = styled.div`
  font-size: 12px;
  color: #1e293b;
  font-weight: 600;
`;

const TradeInfo = styled.div`
  text-align: center;
  margin: 16px 0;
  padding: 12px;
  background: #fef3c7;
  border: 1px solid #fde68a;
  border-radius: 6px;
  font-size: 13px;
  color: #d97706;
  font-weight: 600;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
`;

const Button = styled.button<{ variant?: "primary" | "secondary" }>`
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  ${(props) =>
    props.variant === "primary"
      ? `
    background: #3b82f6;
    color: white;
    border: 1px solid #3b82f6;
    
    &:hover:not(:disabled) {
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
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

export default function BankTradeModal({
  isOpen,
  onClose,
  myResources,
  onBankTrade,
}: BankTradeModalProps) {
  const [givingResource, setGivingResource] = useState<string>("");
  const [requestingResource, setRequestingResource] = useState<string>("");

  const resources = ["wood", "brick", "sheep", "wheat", "ore"];
  const resourceIcons: Record<string, string> = {
    wood: "🌲",
    brick: "🧱",
    sheep: "🐑",
    wheat: "🌾",
    ore: "⛰️",
  };

  const canTrade =
    givingResource &&
    requestingResource &&
    givingResource !== requestingResource &&
    (myResources[givingResource] || 0) >= 4;

  const handleTrade = () => {
    if (canTrade) {
      onBankTrade(givingResource, 4, requestingResource);
      setGivingResource("");
      setRequestingResource("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <h3 style={{ margin: 0, color: "#1e293b" }}>🏪 Bank Trade (4:1)</h3>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        <TradeSection>
          <SectionTitle>Give 4 of:</SectionTitle>
          <ResourceGrid>
            {resources.map((resource) => {
              const count = myResources[resource] || 0;
              const canGive = count >= 4;

              return (
                <ResourceItem
                  key={resource}
                  selected={givingResource === resource}
                  disabled={!canGive}
                  onClick={() => canGive && setGivingResource(resource)}
                >
                  <ResourceIcon>{resourceIcons[resource]}</ResourceIcon>
                  <ResourceName>{resource}</ResourceName>
                  <ResourceCount>{count}</ResourceCount>
                </ResourceItem>
              );
            })}
          </ResourceGrid>
        </TradeSection>

        <TradeSection>
          <SectionTitle>Get 1 of:</SectionTitle>
          <ResourceGrid>
            {resources.map((resource) => (
              <ResourceItem
                key={resource}
                selected={requestingResource === resource}
                disabled={resource === givingResource}
                onClick={() =>
                  resource !== givingResource && setRequestingResource(resource)
                }
              >
                <ResourceIcon>{resourceIcons[resource]}</ResourceIcon>
                <ResourceName>{resource}</ResourceName>
              </ResourceItem>
            ))}
          </ResourceGrid>
        </TradeSection>

        {givingResource && requestingResource && (
          <TradeInfo>
            Trading 4 {resourceIcons[givingResource]} {givingResource} → 1{" "}
            {resourceIcons[requestingResource]} {requestingResource}
          </TradeInfo>
        )}

        <ButtonGroup>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleTrade} disabled={!canTrade}>
            Trade with Bank
          </Button>
        </ButtonGroup>
      </ModalContent>
    </Modal>
  );
}
