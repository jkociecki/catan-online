// frontend/src/view/game/SimpleOnlineGame.tsx - COMPLETE VERSION WITH GAME END MODAL
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import SimpleGameService from "../../view/board/SimpleGameService";
import OnlineCatanSVGBoard from "../board/OnlineCatanSVGBoard";
import styled from "styled-components";
import PlayersList from "./PlayerList";
import TradeModal from "../trade/TradeModal";
import TradeOfferNotification from "../trade/TradeOfferNotification";
import { useAuth } from "../../context/AuthContext";
import GameEndModal from "./GameEndModal";

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #fafafa;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
    sans-serif;
  color: #1e293b;
  overflow: hidden;
`;

const TopBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
`;

const GameTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const Title = styled.h1`
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: #1e293b;
`;

const GameInfo = styled.div`
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
`;

const TurnIndicator = styled.div<{ isMyTurn: boolean }>`
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  background: #f1f5f9;
  color: ${(props) => (props.isMyTurn ? "#059669" : "#64748b")};
  border: 1px solid #e2e8f0;
`;

const LeaveButton = styled.button`
  background: #ef4444;
  color: white;
  border: none;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #dc2626;
  }
`;

const MainContent = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
`;

const LeftPanel = styled.div`
  width: 260px;
  background: white;
  border-right: 1px solid #e2e8f0;
  overflow-y: auto;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
`;

const GameBoard = styled.div`
  flex: 1;
  background: white;
  display: flex;
  align-items: flex-start;
  padding-top: -50px;
  justify-content: center;
  position: relative;
  overflow: hidden;
`;

const RightPanel = styled.div`
  width: 420px;
  background: white;
  border-left: 1px solid #e2e8f0;
  overflow-y: auto;
  flex-shrink: 0;
`;

const Panel = styled.div`
  padding: 20px;
`;

const PlayersSection = styled.div`
  flex-shrink: 0;
  border-bottom: 1px solid #e2e8f0;
`;

const HistorySection = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
`;

const Section = styled.div`
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionHeader = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #64748b;
  margin-bottom: 12px;
`;

const HistoryContainer = styled.div`
  max-height: 300px;
  overflow-y: auto;
  background: #fafafa;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f8fafc;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;

const HistoryEntry = styled.div`
  padding: 8px 12px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s;
  background: white;
  color: #475569;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #f8fafc;
  }

  &:nth-child(even) {
    background: #fafafa;
  }

  &:nth-child(even):hover {
    background: #f1f5f9;
  }
`;

const HistoryIcon = styled.div`
  font-size: 14px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
`;

const HistoryText = styled.div`
  flex: 1;
  font-weight: 500;
  color: #334155;
`;

const HistoryTime = styled.div`
  font-size: 10px;
  color: #94a3b8;
  font-weight: 400;
`;

const PlayerDot = styled.div<{ color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(props) => props.color};
  flex-shrink: 0;
  opacity: 0.8;
`;

const PlayerCard = styled.div<{ isActive: boolean; color: string }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid ${(props) => (props.isActive ? props.color : "#e2e8f0")};
  background: ${(props) => (props.isActive ? `${props.color}08` : "white")};
  margin-bottom: 8px;
  transition: all 0.2s;

  &:hover {
    border-color: ${(props) => props.color};
    background: ${(props) => `${props.color}05`};
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const PlayerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const PlayerDotLarge = styled.div<{ color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(props) => props.color};
  box-shadow: 0 0 0 2px white, 0 0 0 3px ${(props) => props.color}30;
`;

const PlayerName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
`;

const PlayerStats = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
`;

const VictoryPoints = styled.div<{ isLeading: boolean }>`
  background: ${(props) => (props.isLeading ? "#3b82f6" : "#f1f5f9")};
  color: ${(props) => (props.isLeading ? "white" : "#64748b")};
  padding: 4px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  min-width: 24px;
  text-align: center;
`;

const ResourceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
`;

const ResourceItem = styled.div`
  text-align: center;
  padding: 12px 6px;
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
  font-size: 20px;
  margin-bottom: 4px;
`;

const ResourceCount = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 2px;
`;

const ResourceLabel = styled.div`
  font-size: 9px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
`;

const ActionsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

const BuildGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

const ActionButton = styled.button<{
  variant?: "primary" | "secondary" | "danger" | "disabled";
  active?: boolean;
  compact?: boolean;
}>`
  padding: ${(props) => (props.compact ? "10px 8px" : "12px 12px")};
  border-radius: 8px;
  font-size: ${(props) => (props.compact ? "11px" : "12px")};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: ${(props) => (props.compact ? "50px" : "60px")};

  ${(props) => {
    if (props.active) {
      return `
        background: #3b82f6;
        border-color: #3b82f6;
        color: white;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        transform: translateY(-1px);
      `;
    }

    switch (props.variant) {
      case "danger":
        return `
          background: #ef4444;
          border-color: #ef4444;
          color: white;
          &:hover:not(:disabled) { 
            background: #dc2626; 
            border-color: #dc2626;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
          }
        `;
      case "disabled":
        return `
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #94a3b8;
          cursor: not-allowed;
        `;
      case "secondary":
        return `
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #475569;
          &:hover:not(:disabled) { 
            background: #f1f5f9; 
            border-color: #cbd5e1;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          }
        `;
      default:
        return `
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
          &:hover:not(:disabled) { 
            background: #2563eb; 
            border-color: #2563eb;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          }
        `;
    }
  }}

  &:disabled {
    background: #f8fafc;
    border-color: #e2e8f0;
    color: #94a3b8;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const ButtonIcon = styled.div`
  font-size: 16px;
`;

const BuildModeIndicator = styled.div`
  background: #fef3c7;
  color: #d97706;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid #fde68a;
`;

const LoadingMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 16px;
  color: #64748b;
  gap: 16px;
`;

const LoadingSpinner = styled.div`
  width: 32px;
  height: 32px;
  border: 3px solid #f1f5f9;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const ErrorMessage = styled.div`
  background: #fef2f2;
  color: #dc2626;
  padding: 16px;
  border-radius: 8px;
  margin: 16px;
  font-weight: 500;
  text-align: center;
  border: 1px solid #fecaca;
`;

const SuccessIndicator = styled.div<{ show: boolean }>`
  position: fixed;
  top: 80px;
  right: 24px;
  background: white;
  color: #059669;
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 600;
  opacity: ${(props) => (props.show ? 1 : 0)};
  transform: translateX(${(props) => (props.show ? "0" : "100px")});
  transition: all 0.3s ease;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid #bbf7d0;
`;

const DiceResult = styled.div`
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  color: #3b82f6;
  padding: 16px 24px;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 999;
  border: 2px solid #3b82f6;
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
`;

const UserAvatar = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
`;

const UserName = styled.div`
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
`;

const GuestBadge = styled.span`
  background-color: #f1f5f9;
  color: #64748b;
  padding: 1px 4px;
  border-radius: 6px;
  font-size: 9px;
  margin-left: 4px;
  font-weight: 500;
`;

const LogoutButton = styled.button`
  background: #64748b;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #475569;
    transform: translateY(-1px);
  }
`;

interface HistoryItem {
  id: string;
  playerId: string;
  playerColor: string;
  message: string;
  timestamp: Date;
  icon: string;
}

interface FinalPlayer {
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

export default function SimpleOnlineGame() {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomId: urlRoomId } = useParams();

  const roomId = urlRoomId || location.state?.roomId;
  const initialGameState = location.state?.gameState;

  const [gameState, setGameState] = useState<any>(initialGameState);
  const [currentPlayerId, setCurrentPlayerId] = useState<string>("");
  const [players, setPlayers] = useState<any[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string>("");
  const [buildMode, setBuildMode] = useState<
    "settlement" | "city" | "road" | null
  >(null);
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [gamePhase, setGamePhase] = useState<string>("setup");
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [gameHistory, setGameHistory] = useState<HistoryItem[]>([]);

  // Trade states
  const [showTradeModal, setShowTradeModal] = useState<boolean>(false);
  const [activeTradeOffers, setActiveTradeOffers] = useState<any[]>([]);

  // Game end states
  const [isGameEnded, setIsGameEnded] = useState(false);
  const [winner, setWinner] = useState<FinalPlayer | null>(null);
  const [finalStandings, setFinalStandings] = useState<FinalPlayer[]>([]);
  const [gameStartTime] = useState<Date>(new Date());
  const [hasCurrentPlayerRolledDice, setHasCurrentPlayerRolledDice] = useState<boolean>(false);

  const { user, logout } = useAuth();

  const myColor = useMemo(() => {
    return players.find((p) => p.id === myPlayerId)?.color || "red";
  }, [players, myPlayerId]);

  const showSuccessIndicator = useCallback((message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 2000);
  }, []);

  // Helper function to add history entry
  const addHistoryEntry = useCallback(
    (playerId: string, message: string, icon: string, playerColor?: string) => {
      const finalPlayerColor = playerColor || players.find((p) => p.id === playerId)?.color || "#64748b";

      const newEntry: HistoryItem = {
        id: `${Date.now()}-${Math.random()}`,
        playerId,
        playerColor: finalPlayerColor,
        message,
        timestamp: new Date(),
        icon,
      };

      setGameHistory((prev) => [newEntry, ...prev].slice(0, 50));
    },
    [players]
  );

  // Get player name helper
  const getPlayerName = useCallback((playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return (player as any)?.display_name || playerId.substring(0, 8);
  }, [players]);

  // Get player color helper
  const getPlayerColor = useCallback(
    (playerId: string) => {
      const player = players.find((p) => p.id === playerId);
      return player?.color || "#64748b";
    },
    [players]
  );

  // Trade handlers
  const handleCreateTradeOffer = useCallback(
    (
      offering: Record<string, number>,
      requesting: Record<string, number>,
      targetPlayer?: string
    ) => {
      SimpleGameService.sendMessage({
        type: "create_trade_offer",
        offering,
        requesting,
        target_player_id: targetPlayer,
      });
      showSuccessIndicator("Trade offer sent!");
    },
    [showSuccessIndicator]
  );

  const handleAcceptTrade = useCallback(
    (offerId: string) => {
      SimpleGameService.sendMessage({
        type: "accept_trade_offer",
        trade_offer_id: offerId,
      });

      setActiveTradeOffers((prev) =>
        prev.filter((offer) => offer.id !== offerId)
      );
      showSuccessIndicator("Trade accepted!");
    },
    [showSuccessIndicator]
  );

  const handleRejectTrade = useCallback((offerId: string) => {
    setActiveTradeOffers((prev) =>
      prev.filter((offer) => offer.id !== offerId)
    );
  }, []);

  // Trade event handlers
  const handleTradeOfferReceived = useCallback(
    (data: any) => {
      if (data.trade_offer && data.trade_offer.from_player_id !== myPlayerId) {
        setActiveTradeOffers((prev) => [...prev, data.trade_offer]);

        const playerName = getPlayerName(data.trade_offer.from_player_id);
        addHistoryEntry(
          data.trade_offer.from_player_id,
          `${playerName} sent a trade offer`,
          "🤝",
          data.trade_offer.from_player_color
        );
      }
    },
    [myPlayerId, addHistoryEntry, getPlayerName]
  );

  const handleTradeCompleted = useCallback(
    (data: any) => {
      if (data.trade_offer) {
        setActiveTradeOffers((prev) =>
          prev.filter((offer) => offer.id !== data.trade_offer.id)
        );
      }

      if (data.game_state) {
        handleGameUpdate(data);
      }

      if (data.trade_offer && data.accepting_player_id) {
        const fromPlayerName = getPlayerName(data.trade_offer.from_player_id);
        const toPlayerName = getPlayerName(data.accepting_player_id);
        addHistoryEntry(
          data.accepting_player_id,
          `${toPlayerName} accepted trade from ${fromPlayerName}`,
          "✅",
          data.accepting_player_color
        );
      }

      showSuccessIndicator("Trade completed!");
    },
    [addHistoryEntry, getPlayerName, showSuccessIndicator]
  );

  const handleGameEnded = useCallback((data: any) => {
    setIsGameEnded(true);
    
    if (data.final_standings && data.final_standings.length > 0) {
      const winnerData = data.final_standings.find((p: any) => p.is_winner);
      setWinner(winnerData || data.final_standings[0]);
      setFinalStandings(data.final_standings);
    }
    
    if (data.game_state) {
      setGameState(data.game_state);
    }
    
    if (data.final_standings) {
      const winnerData = data.final_standings.find((p: any) => p.is_winner);
      if (winnerData) {
        addHistoryEntry(
          winnerData.player_id,
          `🎉 Game ended! ${winnerData.display_name} wins!`,
          "👑",
          winnerData.color
        );
      }
    }
  }, [addHistoryEntry]);

  // Helper functions
  const getMyResources = useCallback(() => {
    const myPlayer = players.find((p) => p.id === myPlayerId);
    return myPlayer ? myPlayer.resources : {};
  }, [players, myPlayerId]);

  const isMyTurn = useCallback(() => {
    return myPlayerId === currentPlayerId && !isGameEnded;
  }, [myPlayerId, currentPlayerId, isGameEnded]);

  const canBuildSettlement = useCallback(() => {
    if (isGameEnded) return false;
    const myPlayer = players.find((p) => p.id === myPlayerId);
    if (!myPlayer) return false;

    if (gamePhase === "setup") {
      return true;
    }

    const resources = myPlayer.resources || {};
    return (
      myPlayer.settlements_left > 0 &&
      resources.wood >= 1 &&
      resources.brick >= 1 &&
      resources.sheep >= 1 &&
      resources.wheat >= 1
    );
  }, [players, myPlayerId, gamePhase, isGameEnded]);

  const canBuildCity = useCallback(() => {
    if (isGameEnded) return false;
    const myPlayer = players.find((p) => p.id === myPlayerId);
    if (!myPlayer) return false;

    if (gamePhase === "setup") {
      return false;
    }

    const resources = myPlayer.resources || {};
    return (
      myPlayer.cities_left > 0 && resources.ore >= 3 && resources.wheat >= 2
    );
  }, [players, myPlayerId, gamePhase, isGameEnded]);

  const canBuildRoad = useCallback(() => {
    if (isGameEnded) return false;
    const myPlayer = players.find((p) => p.id === myPlayerId);
    if (!myPlayer) return false;

    if (gamePhase === "setup") {
      return true;
    }

    const resources = myPlayer.resources || {};
    return (
      myPlayer.roads_left > 0 && resources.wood >= 1 && resources.brick >= 1
    );
  }, [players, myPlayerId, gamePhase, isGameEnded]);

  // NOWE FUNKCJE KONTROLNE DLA SETUP
   const canEndTurnInSetup = useCallback(() => {
    if (gamePhase !== "setup" || !isMyTurn()) return false;
    
    const setupProgress = gameState?.setup_progress?.[myPlayerId];
    if (!setupProgress) return false;
    
    const setupRound = gameState?.setup_round || 1;
    
    if (setupRound === 1) {
      // Pierwsza runda: potrzeba 1 osady i 1 drogi
      return setupProgress.settlements >= 1 && setupProgress.roads >= 1;
    } else {
      // Druga runda: potrzeba 2 osad i 2 dróg
      return setupProgress.settlements >= 2 && setupProgress.roads >= 2;
    }
  }, [gamePhase, isMyTurn, gameState, myPlayerId]);

  const canTakeActionsInSetup = useCallback(() => {
    if (gamePhase !== "setup") return isMyTurn();
    if (!isMyTurn()) return false;
    
    // W setup zawsze można próbować budować (logika sprawdzania jest po stronie serwera)
    return true;
  }, [gamePhase, isMyTurn]);

  

  const canBuildInSetup = useCallback((type: 'settlement' | 'road') => {
    if (gamePhase !== "setup" || !isMyTurn()) return false;
    
    const setupProgress = gameState?.setup_progress?.[myPlayerId];
    if (!setupProgress) return true; // Pozwól próbować, serwer sprawdzi
    
    const setupRound = gameState?.setup_round || 1;
    
    if (type === 'settlement') {
      if (setupRound === 1) {
        // Pierwsza runda: może budować osadę jeśli nie ma jeszcze żadnej w tej rundzie
        return setupProgress.settlements < 1;
      } else {
        // Druga runda: może budować drugą osadę jeśli ma już jedną
        return setupProgress.settlements < 2;
      }
    } else if (type === 'road') {
      if (setupRound === 1) {
        // Pierwsza runda: może budować drogę tylko jeśli już ma osadę w tej rundzie
        return setupProgress.settlements >= 1 && setupProgress.roads < 1;
      } else {
        // Druga runda: może budować drugą drogę jeśli ma już drugą osadę
        return setupProgress.settlements >= 2 && setupProgress.roads < 2;
      }
    }
    
    return false;
  }, [gamePhase, isMyTurn, gameState, myPlayerId]);

  const canRollDiceInGame = useCallback(() => {
    if (gamePhase !== "playing" || !isMyTurn()) return false;
    
    // Sprawdź czy gracz już rzucił kostką w tej turze (z backend state)
    const hasRolledFromBackend = gameState?.has_rolled_dice?.[myPlayerId] || false;
    
    return !hasRolledFromBackend && !hasCurrentPlayerRolledDice;
  }, [gamePhase, isMyTurn, gameState?.has_rolled_dice, myPlayerId, hasCurrentPlayerRolledDice]);

  const canTakeActionsInGame = useCallback(() => {
    if (gamePhase !== "playing" || !isMyTurn()) return false;
    
    // W normalnej grze można budować/handlować tylko po rzucie kości
    const hasRolledFromBackend = gameState?.has_rolled_dice?.[myPlayerId] || false;
    
    return hasRolledFromBackend || hasCurrentPlayerRolledDice;
  }, [gamePhase, isMyTurn, gameState?.has_rolled_dice, myPlayerId, hasCurrentPlayerRolledDice]);




   const canEndTurnInGame = useCallback(() => {
    if (gamePhase !== "playing" || !isMyTurn()) return false;
    
    // W normalnej grze można zakończyć turę tylko po rzucie kości
    const hasRolledFromBackend = gameState?.has_rolled_dice?.[myPlayerId] || false;
    
    return hasRolledFromBackend || hasCurrentPlayerRolledDice;
  }, [gamePhase, isMyTurn, gameState?.has_rolled_dice, myPlayerId, hasCurrentPlayerRolledDice]);

   useEffect(() => {
    if (!isMyTurn()) {
      setHasCurrentPlayerRolledDice(false);
    }
  }, [isMyTurn]);

  // ✅ RESETUJ STAN KOŚCI przy zmianie gracza
  useEffect(() => {
    const currentPlayerFromBackend = gameState?.player_order?.[gameState?.current_player_index];
    if (currentPlayerFromBackend && currentPlayerFromBackend !== myPlayerId) {
      setHasCurrentPlayerRolledDice(false);
    }
  }, [gameState?.current_player_index, gameState?.player_order, myPlayerId]);


  // Action handlers
  const handleEndTurn = useCallback(() => {
    if (!isMyTurn()) return;
    SimpleGameService.endTurn();
    setBuildMode(null);
    setHasCurrentPlayerRolledDice(false); // ✅ RESETUJ PO KOŃCU TURY
    showSuccessIndicator("Ending turn...");
  }, [isMyTurn, showSuccessIndicator]);

  const handleRollDice = useCallback(() => {
    if (gamePhase === "setup") {
      showSuccessIndicator("Cannot roll dice in setup phase");
      return;
    }
    if (!canRollDiceInGame()) return;
    
    SimpleGameService.rollDice();
    setHasCurrentPlayerRolledDice(true); // ✅ USTAW FLAGĘ LOKALNIE
    showSuccessIndicator("Rolling dice...");
  }, [canRollDiceInGame, gamePhase, showSuccessIndicator]);

  // Click handlers
  const handleVertexClick = useCallback(
    (vertexId: number) => {
      if (!isMyTurn() || isGameEnded) return;
      
      if (buildMode === "settlement") {
        SimpleGameService.buildSettlement(vertexId);
        showSuccessIndicator("Building settlement...");
      } else if (buildMode === "city") {
        SimpleGameService.buildCity(vertexId);
        showSuccessIndicator("Building city...");
      }
    },
    [isMyTurn, buildMode, showSuccessIndicator, isGameEnded]
  );

  const handleEdgeClick = useCallback(
    (edgeId: number) => {
      if (!isMyTurn() || buildMode !== "road" || isGameEnded) return;
      SimpleGameService.buildRoad(edgeId);
      showSuccessIndicator("Building road...");
    },
    [isMyTurn, buildMode, showSuccessIndicator, isGameEnded]
  );

  const handleLeaveGame = () => {
    SimpleGameService.disconnectFromRoom();
    navigate("/");
  };

  // Build mode toggle
  const handleBuild = (type: "settlement" | "city" | "road") => {
    if (!isMyTurn() || isGameEnded) return;
    if (buildMode === type) {
      setBuildMode(null);
    } else {
      setBuildMode(type);
    }
  };

  const handleSeedResources = () => {
    SimpleGameService.seedResources();
    showSuccessIndicator("Resources seeded! 🎯");
  };

  // Resource processing
  const processedResources = React.useMemo(() => {
    const myResources = getMyResources();
    if (!myResources || typeof myResources !== "object") {
      return [];
    }

    const entries = Object.entries(myResources);
    const validEntries = entries.filter(([resource, count]) => {
      return typeof count === "number" && count >= 0;
    });

    return validEntries.sort(([a], [b]) => a.localeCompare(b));
  }, [getMyResources]);

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

  // useEffect hooks
  useEffect(() => {
    if (
      gameState?.player_order &&
      gameState?.current_player_index !== undefined
    ) {
      const expectedCurrentPlayer =
        gameState.player_order[gameState.current_player_index];

      if (expectedCurrentPlayer && expectedCurrentPlayer !== currentPlayerId) {
        setCurrentPlayerId(expectedCurrentPlayer);
      }
    }
  }, [
    gameState?.player_order,
    gameState?.current_player_index,
    currentPlayerId,
  ]);

  useEffect(() => {
    if (!roomId) {
      navigate("/");
    }
  }, [roomId, navigate]);

  // WebSocket connection
  useEffect(() => {
    if (!roomId) {
      navigate("/");
      return;
    }

    const setupConnection = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!SimpleGameService.isConnected()) {
          await SimpleGameService.connectToRoom(roomId);
          setIsConnected(true);
        } else {
          setIsConnected(true);
        }

        setTimeout(() => {
          SimpleGameService.getGameState();
        }, 100);

        try {
          const clientId = await SimpleGameService.getClientId();
          setMyPlayerId(clientId);
        } catch (err) {
          setTimeout(() => {
            SimpleGameService.getClientId()
              .then((clientId) => {
                setMyPlayerId(clientId);
              })
              .catch(console.warn);
          }, 500);
        }

        setLoading(false);
      } catch (err) {
        setError(
          `Connection error: ${err instanceof Error ? err.message : "Unknown error"}`
        );
        setIsConnected(false);
        setLoading(false);
      }
    };

    setupConnection();
  }, [roomId, navigate]);

  // Game update handler
  const handleGameUpdate = useCallback(
    (data: any) => {
      let newPlayersList = players;

      if (data.game_state) {
        setGameState(data.game_state);

        if (data.game_state.phase) {
          setGamePhase(data.game_state.phase);
        }

        if (
          data.game_state.current_player_index !== undefined &&
          data.game_state.player_order &&
          data.game_state.player_order.length > 0
        ) {
          const newCurrentPlayerId =
            data.game_state.player_order[data.game_state.current_player_index];
          if (newCurrentPlayerId && newCurrentPlayerId !== currentPlayerId) {
            setCurrentPlayerId(newCurrentPlayerId);
          }
        }

        if (data.game_state.players) {
          let playersData;
          if (Array.isArray(data.game_state.players)) {
            playersData = data.game_state.players;
          } else {
            playersData = Object.values(data.game_state.players);
          }

          const playersList = playersData.map((p: any) => ({
            id: p.player_id,
            color: p.color,
            display_name: p.display_name,
            resources: p.resources || {},
            victory_points: p.victory_points || 0,
            settlements_left: p.settlements_left || 5,
            cities_left: p.cities_left || 4,
            roads_left: p.roads_left || 15,
          }));

          setPlayers(playersList);
          newPlayersList = playersList;
        }
      }

      if (data.turn_advanced) {
        setCurrentPlayerId(data.new_current_player);
      }

      if (data.setup_complete) {
        setGamePhase('playing');
      }

      if (data.action && data.player_id) {
        const player = newPlayersList.find(p => p.id === data.player_id);
        const playerName = player?.display_name || data.player_id.substring(0, 8);
        const playerColor = player?.color || "#64748b";

        switch (data.action) {
          case "build_settlement":
            addHistoryEntry(data.player_id, `${playerName} built a settlement`, "🏠", playerColor);
            break;
          case "build_city":
            addHistoryEntry(data.player_id, `${playerName} built a city`, "🏰", playerColor);
            break;
          case "build_road":
            addHistoryEntry(data.player_id, `${playerName} built a road`, "🛣️", playerColor);
            break;
          case "end_turn":
            addHistoryEntry(data.player_id, `${playerName} ended their turn`, "⏭️", playerColor);
            break;
        }
      }

      if (data.action) {
        const actionMessages: { [key: string]: string } = {
          build_settlement: "Settlement built!",
          build_city: "City built!",
          build_road: "Road built!",
          end_turn: "Turn ended",
        };

        if (actionMessages[data.action] && data.player_id === myPlayerId) {
          showSuccessIndicator(actionMessages[data.action]);
        }
      }

      if (data.action === "build_road" && gamePhase === "setup") {
        setBuildMode(null);
      }
    },
    [currentPlayerId, myPlayerId, gamePhase, showSuccessIndicator, addHistoryEntry, players]
  );

  // Event handlers
  useEffect(() => {
    const handleGameState = (data: any) => {
      if (data.game_state) {
        handleGameUpdate(data);
      }
    };

    const handleClientId = (data: any) => {
      if (data.player_id) {
        setMyPlayerId(data.player_id);
      }
    };

    const handlePlayerJoined = (data: any) => {
      if (data.player_id) {
        const playerName = getPlayerName(data.player_id);
        addHistoryEntry(data.player_id, `${playerName} joined the game`, "👋", data.player_color);
      }
      SimpleGameService.getGameState();
    };

    const handleDiceRoll = (data: any) => {
      if (data.total && data.player_id) {
        setDiceResult(data.total);

        const playerName = getPlayerName(data.player_id);
        addHistoryEntry(
          data.player_id,
          `${playerName} rolled ${data.total}`,
          "🎲",
          data.player_color
        );

        if (data.player_id === myPlayerId) {
          showSuccessIndicator(`Rolled ${data.total}!`);
        }
      }

      setTimeout(() => {
        setDiceResult(null);
      }, 3000);
    };

    const handleError = (data: any) => {
      setError(data.message || "An unknown error occurred");
      setTimeout(() => {
        setError(null);
      }, 5000);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setError("Disconnected from game server. Try refreshing the page.");
    };

    const handleInitialGameState = (data: any) => {
      if (data.game_state) {
        handleGameUpdate(data);
      }
    };

    if (isConnected) {
      SimpleGameService.addEventHandler("game_ended", handleGameEnded);
      SimpleGameService.addEventHandler("game_update", handleGameUpdate);
      SimpleGameService.addEventHandler("game_state", handleGameState);
      SimpleGameService.addEventHandler("client_id", handleClientId);
      SimpleGameService.addEventHandler("player_joined", handlePlayerJoined);
      SimpleGameService.addEventHandler("dice_roll", handleDiceRoll);
      SimpleGameService.addEventHandler("error", handleError);
      SimpleGameService.addEventHandler("disconnect", handleDisconnect);
      SimpleGameService.addEventHandler("trade_offer_received", handleTradeOfferReceived);
      SimpleGameService.addEventHandler("trade_completed", handleTradeCompleted);
      SimpleGameService.addEventHandler("game_state", handleInitialGameState);
    }

    return () => {
      if (isConnected) {
        SimpleGameService.removeEventHandler("game_ended", handleGameEnded);
        SimpleGameService.removeEventHandler("game_update", handleGameUpdate);
        SimpleGameService.removeEventHandler("game_state", handleGameState);
        SimpleGameService.removeEventHandler("client_id", handleClientId);
        SimpleGameService.removeEventHandler("player_joined", handlePlayerJoined);
        SimpleGameService.removeEventHandler("dice_roll", handleDiceRoll);
        SimpleGameService.removeEventHandler("error", handleError);
        SimpleGameService.removeEventHandler("disconnect", handleDisconnect);
        SimpleGameService.removeEventHandler("trade_offer_received", handleTradeOfferReceived);
        SimpleGameService.removeEventHandler("trade_completed", handleTradeCompleted);
        SimpleGameService.removeEventHandler("game_state", handleInitialGameState);
      }
    };
  }, [
    isConnected,
    handleGameUpdate,
    handleGameEnded,
    myPlayerId,
    showSuccessIndicator,
    addHistoryEntry,
    getPlayerName,
    handleTradeOfferReceived,
    handleTradeCompleted,
  ]);

  // Game end handlers
  const handleGameEndClose = () => {
    setIsGameEnded(false);
  };

  const handlePlayAgain = () => {
    navigate('/room/new');
  };

  const handleMainMenu = () => {
    navigate('/');
  };

  const calculateGameStats = () => {
    const now = new Date();
    const durationMs = now.getTime() - gameStartTime.getTime();
    const durationMinutes = Math.floor(durationMs / 60000);
    
    return {
      duration: `${durationMinutes} min`,
      totalTurns: gameState?.current_turn || 0
    };
  };

  if (loading) {
    return (
      <LoadingMessage>
        <LoadingSpinner />
        Loading game...
      </LoadingMessage>
    );
  }

  if (error) {
    return (
      <AppContainer>
        <ErrorMessage>{error}</ErrorMessage>
      </AppContainer>
    );
  }

  const maxVictoryPoints = Math.max(...players.map((p) => p.victory_points));

  return (
    <AppContainer>
      <TopBar>
        <LeftSection>
          <GameTitle>
            <Title>Catan</Title>
            <GameInfo>
              Room: {roomId} • {players.length} players
            </GameInfo>
          </GameTitle>
          <TurnIndicator isMyTurn={isMyTurn()}>
            {isGameEnded 
              ? "🏆 Game Ended" 
              : isMyTurn() 
                ? "✨ Your Turn" 
                : "⏳ Waiting..."
            }
          </TurnIndicator>
        </LeftSection>

        <RightSection>
          {user && (
            <UserInfo>
              <UserAvatar
                src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.display_name || user.username}&background=random`}
                alt="User avatar"
              />
              <UserName>
                {user.display_name || user.username}
                {user.is_guest && <GuestBadge>Guest</GuestBadge>}
              </UserName>
              <LogoutButton onClick={() => { logout(); navigate('/'); }}>Logout</LogoutButton>
            </UserInfo>
          )}
          <LeaveButton onClick={handleLeaveGame}>Leave Game</LeaveButton>
        </RightSection>
      </TopBar>

      <MainContent>
        <LeftPanel>
          <PlayersSection>
            <Panel>
              <Section>
                <SectionHeader>Players ({players.length})</SectionHeader>
                {players.map((player) => {
                  const isCurrentPlayer = player.id === currentPlayerId;
                  const isLeading =
                    player.victory_points === maxVictoryPoints &&
                    maxVictoryPoints > 0;
                  const displayName = getPlayerName(player.id);
                  const totalResources = Object.values(
                    player.resources || {}
                  ).reduce(
                    (a: number, b: unknown) =>
                      a + (typeof b === "number" ? b : 0),
                    0
                  );

                  return (
                    <PlayerCard
                      key={player.id}
                      isActive={isCurrentPlayer}
                      color={player.color}
                    >
                      <PlayerInfo>
                        <PlayerDotLarge color={player.color} />
                        <PlayerName>{displayName}</PlayerName>
                      </PlayerInfo>
                      <PlayerStats>
                        <span>{totalResources}</span>
                        <VictoryPoints isLeading={isLeading}>
                          {player.victory_points}
                        </VictoryPoints>
                      </PlayerStats>
                    </PlayerCard>
                  );
                })}
              </Section>
            </Panel>
          </PlayersSection>

          <HistorySection>
            <SectionHeader>Game History</SectionHeader>
            <HistoryContainer>
              {gameHistory.length > 0 ? (
                gameHistory.map((entry) => (
                  <HistoryEntry key={entry.id}>
                    <PlayerDot color={entry.playerColor} />
                    <HistoryIcon>{entry.icon}</HistoryIcon>
                    <HistoryText>{entry.message}</HistoryText>
                    <HistoryTime>
                      {entry.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </HistoryTime>
                  </HistoryEntry>
                ))
              ) : (
                <HistoryEntry>
                  <HistoryIcon>📝</HistoryIcon>
                  <HistoryText>Game starting...</HistoryText>
                </HistoryEntry>
              )}
            </HistoryContainer>
          </HistorySection>
        </LeftPanel>

       <GameBoard>
          <OnlineCatanSVGBoard
            gameState={gameState}
            onVertexClick={handleVertexClick}
            onEdgeClick={handleEdgeClick}
            buildMode={buildMode}
            myPlayerId={myPlayerId}
            myColor={myColor}
            gamePhase={gamePhase}
            isMyTurn={isMyTurn()}
          />
        </GameBoard>

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
                    <ResourceLabel>None</ResourceLabel>
                  </ResourceItem>
                )}
              </ResourceGrid>
            </Section>

          <Section>
              <SectionHeader>DEBUG INFO</SectionHeader>
              <div style={{fontSize: '10px', background: '#f0f0f0', padding: '8px', borderRadius: '4px'}}>
                <div>Turn: {isMyTurn() ? "YES" : "NO"}</div>
                <div>Phase: {gamePhase}</div>
                <div>Round: {gameState?.setup_round || "?"}</div>
                <div>SetupProgress: {JSON.stringify(gameState?.setup_progress?.[myPlayerId] || {})}</div>
                <div>HasRolledBackend: {gameState?.has_rolled_dice?.[myPlayerId] ? "YES" : "NO"}</div>
                <div>HasRolledLocal: {hasCurrentPlayerRolledDice ? "YES" : "NO"}</div>
                <div>CanRoll: {canRollDiceInGame() ? "YES" : "NO"}</div>
                <div>CanBuild: {gamePhase === "setup" ? (canTakeActionsInSetup() ? "YES" : "NO") : (canTakeActionsInGame() ? "YES" : "NO")}</div>
                <div>CanEndTurn: {gamePhase === "setup" ? (canEndTurnInSetup() ? "YES" : "NO") : (canEndTurnInGame() ? "YES" : "NO")}</div>
              </div>
            </Section>

            <Section>
              <SectionHeader>Actions</SectionHeader>
              <ActionsGrid>
                {gamePhase === "setup" ? (
                  <>
                    <ActionButton
                      onClick={handleSeedResources}
                      variant="secondary" 
                      compact
                      style={{ backgroundColor: '#f59e0b', color: 'white' }}
                    >
                      <ButtonIcon>🎯</ButtonIcon>
                      Seed
                    </ActionButton>
                    
                    <ActionButton variant="secondary" disabled={true} compact>
                      <ButtonIcon>🎲</ButtonIcon>
                      Roll
                    </ActionButton>

                    <ActionButton
                      variant="danger"
                      onClick={handleEndTurn}
                      disabled={!canEndTurnInSetup()}
                      compact
                    >
                      <ButtonIcon>⏭️</ButtonIcon>
                      End
                    </ActionButton>
                  </>
                ) : (
                  <>
                    <ActionButton
                      variant={canRollDiceInGame() ? "primary" : "secondary"}
                      onClick={handleRollDice}
                      disabled={!canRollDiceInGame()}
                      compact
                      style={canRollDiceInGame() ? { 
                        backgroundColor: '#10b981', 
                        borderColor: '#10b981',
                        boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.3)'
                      } : {}}
                    >
                      <ButtonIcon>🎲</ButtonIcon>
                      Roll Dice
                    </ActionButton>

                    <ActionButton
                      variant="danger"
                      onClick={handleEndTurn}
                      disabled={!canEndTurnInGame()}
                      compact
                    >
                      <ButtonIcon>⏭️</ButtonIcon>
                      End Turn
                    </ActionButton>
                  </>
                )}
              </ActionsGrid>
            </Section>

            <Section>
              <SectionHeader>Build</SectionHeader>
              <BuildGrid>
                <ActionButton
                  active={buildMode === "settlement"}
                  onClick={() => handleBuild("settlement")}
                  disabled={
                    gamePhase === "setup" 
                      ? !canBuildInSetup('settlement')
                      : (!canTakeActionsInGame() || !canBuildSettlement())
                  }
                  compact
                >
                  <ButtonIcon>🏠</ButtonIcon>
                  Settlement
                </ActionButton>

                <ActionButton
                  active={buildMode === "road"}
                  onClick={() => handleBuild("road")}
                  disabled={
                    gamePhase === "setup" 
                      ? !canBuildInSetup('road')
                      : (!canTakeActionsInGame() || !canBuildRoad())
                  }
                  compact
                >
                  <ButtonIcon>🛣️</ButtonIcon>
                  Road
                </ActionButton>

                <ActionButton
                  active={buildMode === "city"}
                  onClick={() => handleBuild("city")}
                  disabled={
                    !canTakeActionsInGame() || !canBuildCity() || gamePhase === "setup"
                  }
                  compact
                >
                  <ButtonIcon>🏰</ButtonIcon>
                  City
                </ActionButton>

                <ActionButton variant="disabled" disabled={true} compact>
                  <ButtonIcon>🃏</ButtonIcon>
                  Dev Card
                </ActionButton>
              </BuildGrid>
            </Section>

            <Section>
              <SectionHeader>Trade</SectionHeader>
              <ActionsGrid>
                <ActionButton
                  onClick={() => setShowTradeModal(true)}
                  disabled={!canTakeActionsInGame() || gamePhase === "setup"}
                  compact
                >
                  <ButtonIcon>🤝</ButtonIcon>
                  Trade
                </ActionButton>

                <ActionButton variant="disabled" disabled={true} compact>
                  <ButtonIcon>🏪</ButtonIcon>
                  Maritime
                </ActionButton>
              </ActionsGrid>
            </Section>

            {buildMode && (
              <Section>
                <BuildModeIndicator>
                  🔨 Building: {buildMode}
                  <div
                    style={{ fontSize: "10px", marginTop: "4px", opacity: 0.8 }}
                  >
                    Click on the board to place
                  </div>
                </BuildModeIndicator>
              </Section>
            )}
          </Panel>
        </RightPanel>
      </MainContent>

      <GameEndModal
        isVisible={isGameEnded}
        winner={winner}
        players={finalStandings}
        gameStats={calculateGameStats()}
        onClose={handleGameEndClose}
        onPlayAgain={handlePlayAgain}
        onMainMenu={handleMainMenu}
      />

      <TradeModal
        isOpen={showTradeModal}
        onClose={() => setShowTradeModal(false)}
        myResources={getMyResources()}
        players={players}
        myPlayerId={myPlayerId}
        onCreateOffer={handleCreateTradeOffer}
      />

      {activeTradeOffers.map((offer, index) => (
        <div key={offer.id} style={{ top: `${100 + index * 200}px` }}>
          <TradeOfferNotification
            tradeOffer={offer}
            onAccept={handleAcceptTrade}
            onReject={handleRejectTrade}
            getPlayerName={getPlayerName}
            getPlayerColor={getPlayerColor}
            myResources={getMyResources()}
          />
        </div>
      ))}

      <SuccessIndicator show={showSuccess}>{successMessage}</SuccessIndicator>

      {diceResult && <DiceResult>🎲 {diceResult}</DiceResult>}
    </AppContainer>
  );
}