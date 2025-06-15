// frontend/src/view/game/GameEndModal.tsx
import React from "react";
import styled from "styled-components";
import { Trophy, Medal, Users, Clock, Home, RotateCcw, X } from "lucide-react";

interface Player {
  player_id: string;
  display_name: string;
  color: string;
  victory_points: number;
  settlements_built: number;
  cities_built: number;
  roads_built: number;
  longest_road: boolean;
  largest_army: boolean;
  is_winner: boolean;
}

interface GameEndModalProps {
  isVisible: boolean;
  winner: Player | null;
  players: Player[];
  gameStats: {
    duration: string;
    totalTurns: number;
  };
  onClose: () => void;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

const Modal = styled.div<{ isVisible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: ${props => props.isVisible ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 20px;
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.4s ease-out;
  position: relative;

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.1);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  color: #64748b;

  &:hover {
    background: rgba(0, 0, 0, 0.2);
    color: #374151;
  }
`;

const Header = styled.div`
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  color: white;
  padding: 40px 30px 30px;
  text-align: center;
  border-radius: 20px 20px 0 0;
`;

const HeaderTitle = styled.h1`
  font-size: 32px;
  font-weight: bold;
  margin: 0 0 10px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
`;

const HeaderSubtitle = styled.p`
  font-size: 16px;
  opacity: 0.9;
  margin: 0;
`;

const WinnerSection = styled.div`
  text-align: center;
  padding: 30px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-bottom: 1px solid #f3f4f6;
`;

const WinnerBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #f59e0b;
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 15px;
`;

const WinnerName = styled.h2`
  font-size: 28px;
  font-weight: bold;
  color: #92400e;
  margin: 0 0 8px 0;
`;

const WinnerPoints = styled.div`
  font-size: 18px;
  color: #b45309;
  font-weight: 600;
`;

const PlayersList = styled.div`
  padding: 20px 30px;
`;

const SectionTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PlayerRow = styled.div<{ isWinner: boolean; color: string }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  margin-bottom: 12px;
  border-radius: 12px;
  border: 2px solid ${props => props.isWinner ? props.color : '#e5e7eb'};
  background: ${props => props.isWinner ? `${props.color}15` : '#f9fafb'};
  transition: all 0.2s;
  position: relative;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
`;

const RankBadge = styled.div<{ rank: number }>`
  position: absolute;
  left: -8px;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  color: white;
  background: ${props => {
    switch (props.rank) {
      case 1: return '#f59e0b'; // gold
      case 2: return '#9ca3af'; // silver  
      case 3: return '#cd7c2f'; // bronze
      default: return '#6b7280'; // gray
    }
  }};
  border: 3px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const PlayerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: 20px;
`;

const PlayerDot = styled.div<{ color: string }>`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${props => props.color};
  border: 2px solid white;
  box-shadow: 0 0 0 2px ${props => props.color}40;
`;

const PlayerName = styled.div<{ isWinner: boolean }>`
  font-weight: ${props => props.isWinner ? '700' : '600'};
  color: ${props => props.isWinner ? '#1f2937' : '#4b5563'};
  font-size: 16px;
`;

const PlayerStats = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  font-size: 14px;
`;

const Stat = styled.div`
  text-align: center;
  min-width: 50px;
`;

const StatValue = styled.div<{ highlight?: boolean }>`
  font-weight: 700;
  font-size: 18px;
  color: ${props => props.highlight ? '#3b82f6' : '#374151'};
`;

const StatLabel = styled.div`
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #6b7280;
  margin-top: 2px;
`;

const BonusBadges = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 8px;
`;

const BonusBadge = styled.div<{ type: 'road' | 'army' }>`
  font-size: 10px;
  padding: 3px 6px;
  border-radius: 6px;
  background: ${props => props.type === 'road' ? '#3b82f6' : '#ef4444'};
  color: white;
  font-weight: 600;
`;

const GameStatsSection = styled.div`
  padding: 20px 30px;
  background: #f8fafc;
  display: flex;
  justify-content: space-around;
  text-align: center;
  border-top: 1px solid #e5e7eb;
`;

const GameStat = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

const GameStatIcon = styled.div`
  color: #3b82f6;
`;

const GameStatValue = styled.div`
  font-size: 20px;
  font-weight: bold;
  color: #1f2937;
`;

const GameStatLabel = styled.div`
  font-size: 12px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ActionsSection = styled.div`
  padding: 30px;
  display: flex;
  gap: 15px;
  justify-content: center;
  background: #f9fafb;
  border-radius: 0 0 20px 20px;
`;

const ActionButton = styled.button<{ variant: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid;
  min-width: 140px;
  justify-content: center;

  ${props => props.variant === 'primary' 
    ? `
      background: #3b82f6;
      color: white;
      border-color: #3b82f6;
      
      &:hover {
        background: #2563eb;
        border-color: #2563eb;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
      }
    `
    : `
      background: white;
      color: #6b7280;
      border-color: #d1d5db;
      
      &:hover {
        background: #f9fafb;
        color: #374151;
        border-color: #9ca3af;
        transform: translateY(-1px);
      }
    `
  }
`;

const GameEndModal: React.FC<GameEndModalProps> = ({
  isVisible,
  winner,
  players,
  gameStats,
  onClose,
  onPlayAgain,
  onMainMenu,
}) => {
  if (!isVisible) return null;

  const getPlayerColor = (color: string) => {
    const colorMap: Record<string, string> = {
      red: '#ef4444',
      blue: '#3b82f6', 
      green: '#10b981',
      yellow: '#f59e0b',
      orange: '#f97316',
      purple: '#8b5cf6',
      pink: '#ec4899',
      brown: '#a3a3a3'
    };
    return colorMap[color.toLowerCase()] || '#6b7280';
  };

  return (
    <Modal isVisible={isVisible}>
      <ModalContent>
        <CloseButton onClick={onClose}>
          <X size={20} />
        </CloseButton>

        <Header>
          <HeaderTitle>
            <Trophy size={36} />
            Gra zakończona!
          </HeaderTitle>
          <HeaderSubtitle>Oto końcowe wyniki rozgrywki</HeaderSubtitle>
        </Header>

        {winner && (
          <WinnerSection>
            <WinnerBadge>
              <Medal size={16} />
              Zwycięzca
            </WinnerBadge>
            <WinnerName>{winner.display_name}</WinnerName>
            <WinnerPoints>{winner.victory_points} punktów zwycięstwa</WinnerPoints>
          </WinnerSection>
        )}

        <PlayersList>
          <SectionTitle>
            <Users size={18} />
            Końcowa klasyfikacja
          </SectionTitle>
          
          {players.map((player, index) => (
            <PlayerRow 
              key={player.player_id} 
              isWinner={player.is_winner}
              color={getPlayerColor(player.color)}
            >
              <RankBadge rank={index + 1}>
                {index + 1}
              </RankBadge>
              
              <PlayerInfo>
                <PlayerDot color={getPlayerColor(player.color)} />
                <div>
                  <PlayerName isWinner={player.is_winner}>
                    {player.display_name}
                  </PlayerName>
                  <BonusBadges>
                    {player.longest_road && (
                      <BonusBadge type="road">Najdłuższa droga</BonusBadge>
                    )}
                    {player.largest_army && (
                      <BonusBadge type="army">Największa armia</BonusBadge>
                    )}
                  </BonusBadges>
                </div>
              </PlayerInfo>

              <PlayerStats>
                <Stat>
                  <StatValue highlight={player.is_winner}>
                    {player.victory_points}
                  </StatValue>
                  <StatLabel>Punkty</StatLabel>
                </Stat>
                <Stat>
                  <StatValue>{player.settlements_built}</StatValue>
                  <StatLabel>Osady</StatLabel>
                </Stat>
                <Stat>
                  <StatValue>{player.cities_built}</StatValue>
                  <StatLabel>Miasta</StatLabel>
                </Stat>
                <Stat>
                  <StatValue>{player.roads_built}</StatValue>
                  <StatLabel>Drogi</StatLabel>
                </Stat>
              </PlayerStats>
            </PlayerRow>
          ))}
        </PlayersList>

        <GameStatsSection>
          <GameStat>
            <GameStatIcon>
              <Clock size={24} />
            </GameStatIcon>
            <GameStatValue>{gameStats.duration}</GameStatValue>
            <GameStatLabel>Czas gry</GameStatLabel>
          </GameStat>
          
          <GameStat>
            <GameStatIcon>
              <RotateCcw size={24} />
            </GameStatIcon>
            <GameStatValue>{gameStats.totalTurns}</GameStatValue>
            <GameStatLabel>Tury</GameStatLabel>
          </GameStat>
          
          <GameStat>
            <GameStatIcon>
              <Users size={24} />
            </GameStatIcon>
            <GameStatValue>{players.length}</GameStatValue>
            <GameStatLabel>Gracze</GameStatLabel>
          </GameStat>
        </GameStatsSection>

        <ActionsSection>
          <ActionButton variant="primary" onClick={onPlayAgain}>
            <RotateCcw size={16} />
            Zagraj ponownie
          </ActionButton>
          
          <ActionButton variant="secondary" onClick={onMainMenu}>
            <Home size={16} />
            Menu główne
          </ActionButton>
        </ActionsSection>
      </ModalContent>
    </Modal>
  );
};

export default GameEndModal;