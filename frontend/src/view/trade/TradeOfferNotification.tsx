import React, { useState, useEffect } from "react";
import styled from "styled-components";

interface TradeOffer {
  id: string;
  from_player_id: string;
  offering: Record<string, number>;
  requesting: Record<string, number>;
  target_player_id?: string;
  created_at: number;
}

interface TradeOfferNotificationProps {
  tradeOffer: TradeOffer;
  onAccept: (offerId: string) => void;
  onReject: (offerId: string) => void;
  getPlayerName: (playerId: string) => string;
  getPlayerColor: (playerId: string) => string;
  myResources: Record<string, number>;
}

const Notification = styled.div`
  position: fixed;
  top: 100px;
  right: 24px;
  background: white;
  border: 2px solid #3b82f6;
  border-radius: 12px;
  padding: 16px;
  max-width: 320px;
  z-index: 999;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease-out;

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
`;

const PlayerDot = styled.div<{ color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${(props) => props.color};
  box-shadow: 0 0 0 2px white, 0 0 0 3px ${(props) => props.color}40;
`;

const PlayerName = styled.h4`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
`;

const TradeIcon = styled.div`
  font-size: 16px;
  margin-left: auto;
`;

const TradeSection = styled.div`
  margin: 8px 0;
`;

const SectionLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ResourceList = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
`;

const ResourceChip = styled.span<{ canAfford?: boolean }>`
  background: ${(props) => (props.canAfford === false ? "#fef2f2" : "#f1f5f9")};
  color: ${(props) => (props.canAfford === false ? "#dc2626" : "#1e293b")};
  border: 1px solid
    ${(props) => (props.canAfford === false ? "#fecaca" : "#e2e8f0")};
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
`;

const Button = styled.button<{ variant: "accept" | "reject" }>`
  flex: 1;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;

  ${(props) =>
    props.variant === "accept"
      ? `
    background: #10b981;
    color: white;
    
    &:hover {
      background: #059669;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
    }
  `
      : `
    background: #ef4444;
    color: white;
    
    &:hover {
      background: #dc2626;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const Timer = styled.div`
  font-size: 10px;
  color: #94a3b8;
  text-align: center;
  margin-top: 8px;
`;

const WarningText = styled.div`
  font-size: 11px;
  color: #dc2626;
  background: #fef2f2;
  padding: 6px 8px;
  border-radius: 4px;
  margin: 8px 0;
  border: 1px solid #fecaca;
`;

export default function TradeOfferNotification({
  tradeOffer,
  onAccept,
  onReject,
  getPlayerName,
  getPlayerColor,
  myResources,
}: TradeOfferNotificationProps) {
  const [timeLeft, setTimeLeft] = useState(60); // 60 sekund na odpowiedź

  const resourceIcons: Record<string, string> = {
    wood: "🌲",
    brick: "🧱",
    sheep: "🐑",
    wheat: "🌾",
    ore: "⛰️",
  };

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onReject(tradeOffer.id); // Auto-reject po czasie
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [tradeOffer.id, onReject]);

  // Sprawdź czy gracz ma wystarczające zasoby
  const canAffordTrade = () => {
    return Object.entries(tradeOffer.requesting).every(([resource, amount]) => {
      return (myResources[resource] || 0) >= amount;
    });
  };

  const canAfford = canAffordTrade();
  const playerName = getPlayerName(tradeOffer.from_player_id);
  const playerColor = getPlayerColor(tradeOffer.from_player_id);

  return (
    <Notification>
      <Header>
        <PlayerDot color={playerColor} />
        <PlayerName>Trade from {playerName}</PlayerName>
        <TradeIcon>🤝</TradeIcon>
      </Header>

      <TradeSection>
        <SectionLabel>They offer:</SectionLabel>
        <ResourceList>
          {Object.entries(tradeOffer.offering).map(([resource, amount]) => (
            <ResourceChip key={resource}>
              {resourceIcons[resource]} {amount}
            </ResourceChip>
          ))}
        </ResourceList>
      </TradeSection>

      <TradeSection>
        <SectionLabel>They want:</SectionLabel>
        <ResourceList>
          {Object.entries(tradeOffer.requesting).map(([resource, amount]) => {
            const canAffordThis = (myResources[resource] || 0) >= amount;
            return (
              <ResourceChip key={resource} canAfford={canAffordThis}>
                {resourceIcons[resource]} {amount}
              </ResourceChip>
            );
          })}
        </ResourceList>
      </TradeSection>

      {!canAfford && (
        <WarningText>
          ⚠️ You don't have enough resources for this trade
        </WarningText>
      )}

      <ButtonGroup>
        <Button
          variant="accept"
          onClick={() => onAccept(tradeOffer.id)}
          disabled={!canAfford}
        >
          ✅ Accept
        </Button>
        <Button variant="reject" onClick={() => onReject(tradeOffer.id)}>
          ❌ Reject
        </Button>
      </ButtonGroup>

      <Timer>⏱️ {timeLeft}s left to respond</Timer>
    </Notification>
  );
}
