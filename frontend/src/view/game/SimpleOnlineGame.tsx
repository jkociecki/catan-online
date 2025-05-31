// frontend/src/view/game/SimpleOnlineGame.tsx - Z HANDLEM
import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import SimpleGameService from "../../view/board/SimpleGameService";
import OnlineCatanSVGBoard from "../board/OnlineCatanSVGBoard";
import styled from "styled-components";
import PlayersList from "./PlayerList";
import GameActions from "./GameActions";
import TradeModal from "../trade/TradeModal";
import TradeOfferNotification from "../trade/TradeOfferNotification";
import BankTradeModal from "../trade/BankTradeModal";

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

interface HistoryItem {
  id: string;
  playerId: string;
  playerColor: string;
  message: string;
  timestamp: Date;
  icon: string;
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
  const [hasRolledDice, setHasRolledDice] = useState<boolean>(false);
  const [showBankTradeModal, setShowBankTradeModal] = useState<boolean>(false);

  const myColor = players.find((p) => p.id === myPlayerId)?.color || "red";

  const showSuccessIndicator = useCallback((message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 2000);
  }, []);

  // Helper function to add history entry
  const addHistoryEntry = useCallback(
    (playerId: string, message: string, icon: string) => {
      const playerColor =
        players.find((p) => p.id === playerId)?.color || "#64748b";
      const newEntry: HistoryItem = {
        id: `${Date.now()}-${Math.random()}`,
        playerId,
        playerColor,
        message,
        timestamp: new Date(),
        icon,
      };

      setGameHistory((prev) => [newEntry, ...prev].slice(0, 50)); // Keep last 50 entries
    },
    [players]
  );

  // Get player name helper
  const getPlayerName = useCallback((playerId: string) => {
    return playerId.substring(0, 8);
  }, []);

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
      console.log("Creating trade offer:", {
        offering,
        requesting,
        targetPlayer,
      });
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
      console.log("Accepting trade:", offerId);
      SimpleGameService.sendMessage({
        type: "accept_trade_offer",
        trade_offer_id: offerId,
      });

      // Usuń ofertę z listy
      setActiveTradeOffers((prev) =>
        prev.filter((offer) => offer.id !== offerId)
      );
      showSuccessIndicator("Trade accepted!");
    },
    [showSuccessIndicator]
  );

  const handleRejectTrade = useCallback((offerId: string) => {
    console.log("Rejecting trade:", offerId);
    // Po prostu usuń z listy lokalnie
    setActiveTradeOffers((prev) =>
      prev.filter((offer) => offer.id !== offerId)
    );
  }, []);

  const handleBankTrade = useCallback(
    (
      givingResource: string,
      givingAmount: number,
      requestingResource: string
    ) => {
      console.log("Bank trade:", {
        givingResource,
        givingAmount,
        requestingResource,
      });
      SimpleGameService.sendMessage({
        type: "bank_trade",
        giving_resource: givingResource,
        giving_amount: givingAmount,
        requesting_resource: requestingResource,
      });
      showSuccessIndicator("Trading with bank...");
    },
    [showSuccessIndicator]
  );

  // Trade event handlers
  const handleTradeOfferReceived = useCallback(
    (data: any) => {
      console.log("📨 Trade offer received:", data);
      if (data.trade_offer && data.trade_offer.from_player_id !== myPlayerId) {
        setActiveTradeOffers((prev) => [...prev, data.trade_offer]);

        // Dodaj do historii
        const playerName = getPlayerName(data.trade_offer.from_player_id);
        addHistoryEntry(
          data.trade_offer.from_player_id,
          `${playerName} sent a trade offer`,
          "🤝"
        );
      }
    },
    [myPlayerId, addHistoryEntry, getPlayerName]
  );

  const handleTradeCompleted = useCallback(
    (data: any) => {
      console.log("📨 Trade completed:", data);

      // Usuń ofertę z aktywnych
      if (data.trade_offer) {
        setActiveTradeOffers((prev) =>
          prev.filter((offer) => offer.id !== data.trade_offer.id)
        );
      }

      // Aktualizuj stan gry
      if (data.game_state) {
        handleGameUpdate(data);
      }

      // Dodaj do historii
      if (data.trade_offer && data.accepting_player_id) {
        const fromPlayerName = getPlayerName(data.trade_offer.from_player_id);
        const toPlayerName = getPlayerName(data.accepting_player_id);
        addHistoryEntry(
          data.accepting_player_id,
          `${toPlayerName} accepted trade from ${fromPlayerName}`,
          "✅"
        );
      }

      showSuccessIndicator("Trade completed!");
    },
    [addHistoryEntry, getPlayerName, showSuccessIndicator]
  );

  // ✅ Automatyczne ustawianie currentPlayerId
  useEffect(() => {
    if (
      gameState?.player_order &&
      gameState?.current_player_index !== undefined
    ) {
      const expectedCurrentPlayer =
        gameState.player_order[gameState.current_player_index];

      if (expectedCurrentPlayer && expectedCurrentPlayer !== currentPlayerId) {
        console.log("✅ Setting currentPlayerId to:", expectedCurrentPlayer);
        setCurrentPlayerId(expectedCurrentPlayer);
      }
    }
  }, [
    gameState?.player_order,
    gameState?.current_player_index,
    currentPlayerId,
  ]);

  // Check if roomId exists
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

        // ✅ NATYCHMIAST pobierz stan gry i client ID
        SimpleGameService.getGameState();

        try {
          const clientId = await SimpleGameService.getClientId();
          console.log(
            "✅ Got client ID immediately:",
            clientId.substring(0, 8)
          );
          setMyPlayerId(clientId);
        } catch (err) {
          console.warn("Could not get client ID immediately:", err);
          // Spróbuj ponownie po krótkim czasie
          setTimeout(() => {
            SimpleGameService.getClientId()
              .then((clientId) => {
                console.log(
                  "✅ Got client ID after retry:",
                  clientId.substring(0, 8)
                );
                setMyPlayerId(clientId);
              })
              .catch(console.warn);
          }, 500);
        }

        setLoading(false);
      } catch (err) {
        setError(
          `Connection error: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
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
      console.log("🎮 handleGameUpdate received:", data);

      if (data.game_state) {
        setGameState(data.game_state);

        if (data.game_state.phase) {
          setGamePhase(data.game_state.phase);
        }

        // Set current player
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

        // ✅ POPRAW konwersję graczy - zawsze sprawdź czy players istnieje
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
            resources: p.resources || {},
            victory_points: p.victory_points || 0,
            settlements_left: p.settlements_left || 5,
            cities_left: p.cities_left || 4,
            roads_left: p.roads_left || 15,
          }));

          setPlayers(playersList);
        } else {
          console.log("❌ No players in game_state");
        }
      }

      // Add history entries for actions
      if (data.action && data.player_id) {
        const playerName = getPlayerName(data.player_id);

        switch (data.action) {
          case "build_settlement":
            addHistoryEntry(
              data.player_id,
              `${playerName} built a settlement`,
              "🏠"
            );
            break;
          case "build_city":
            addHistoryEntry(data.player_id, `${playerName} built a city`, "🏰");
            break;
          case "build_road":
            addHistoryEntry(data.player_id, `${playerName} built a road`, "🛣️");
            break;
          case "end_turn":
            addHistoryEntry(
              data.player_id,
              `${playerName} ended their turn`,
              "⏭️"
            );
            break;
        }
      }

      // Action messages
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

      // Auto clear build mode
      if (data.action === "build_road" && gamePhase === "setup") {
        setBuildMode(null);
      }
    },
    [
      currentPlayerId,
      myPlayerId,
      gamePhase,
      showSuccessIndicator,
      addHistoryEntry,
      getPlayerName,
    ]
  );

  const handleBankTradeCompleted = useCallback(
    (data: any) => {
      console.log("📨 Bank trade completed:", data);

      // Aktualizuj stan gry
      if (data.game_state) {
        handleGameUpdate(data);
      }

      // Dodaj do historii
      if (data.player_id) {
        const playerName = getPlayerName(data.player_id);
        const giving = `${data.giving_amount} ${data.giving_resource}`;
        const getting = `1 ${data.requesting_resource}`;
        addHistoryEntry(
          data.player_id,
          `${playerName} traded ${giving} for ${getting} with bank`,
          "🏪"
        );
      }

      showSuccessIndicator("Bank trade completed!");
    },
    [handleGameUpdate, addHistoryEntry, getPlayerName, showSuccessIndicator]
  );

  // Event handlers
  useEffect(() => {
    const handleGameState = (data: any) => {
      console.log("📨 handleGameState received:", data);
      if (data.game_state) {
        handleGameUpdate(data);
      }
    };

    const handleClientId = (data: any) => {
      console.log("🆔 handleClientId received:", data);
      if (data.player_id) {
        setMyPlayerId(data.player_id);
      }
    };

    const handlePlayerJoined = (data: any) => {
      console.log("👥 handlePlayerJoined received:", data);
      // Dodaj do historii
      if (data.player_id) {
        const playerName = getPlayerName(data.player_id);
        addHistoryEntry(data.player_id, `${playerName} joined the game`, "👋");
      }
      // ✅ ZAWSZE pobierz najnowszy stan gry gdy ktoś dołączy
      SimpleGameService.getGameState();
    };

    const handleDiceRoll = (data: any) => {
      console.log("🎲 handleDiceRoll received:", data);
      if (data.total && data.player_id) {
        setDiceResult(data.total);

        // Add to history
        const playerName = getPlayerName(data.player_id);
        addHistoryEntry(
          data.player_id,
          `${playerName} rolled ${data.total}`,
          "🎲"
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

    if (isConnected) {
      SimpleGameService.addEventHandler("game_update", handleGameUpdate);
      SimpleGameService.addEventHandler("game_state", handleGameState);
      SimpleGameService.addEventHandler("client_id", handleClientId);
      SimpleGameService.addEventHandler("player_joined", handlePlayerJoined);
      SimpleGameService.addEventHandler("dice_roll", handleDiceRoll);
      SimpleGameService.addEventHandler("error", handleError);
      SimpleGameService.addEventHandler("disconnect", handleDisconnect);
      SimpleGameService.addEventHandler(
        "trade_offer_received",
        handleTradeOfferReceived
      );
      SimpleGameService.addEventHandler(
        "trade_completed",
        handleTradeCompleted
      );
      SimpleGameService.addEventHandler(
        "bank_trade_completed",
        handleBankTradeCompleted
      );
    }

    return () => {
      if (isConnected) {
        SimpleGameService.removeEventHandler("game_update", handleGameUpdate);
        SimpleGameService.removeEventHandler("game_state", handleGameState);
        SimpleGameService.removeEventHandler("client_id", handleClientId);
        SimpleGameService.removeEventHandler(
          "player_joined",
          handlePlayerJoined
        );
        SimpleGameService.removeEventHandler("dice_roll", handleDiceRoll);
        SimpleGameService.removeEventHandler("error", handleError);
        SimpleGameService.removeEventHandler("disconnect", handleDisconnect);
        SimpleGameService.removeEventHandler(
          "trade_offer_received",
          handleTradeOfferReceived
        );
        SimpleGameService.removeEventHandler(
          "trade_completed",
          handleTradeCompleted
        );
        SimpleGameService.removeEventHandler(
          "bank_trade_completed",
          handleBankTradeCompleted
        );
      }
    };
  }, [
    isConnected,
    handleGameUpdate,
    myPlayerId,
    showSuccessIndicator,
    addHistoryEntry,
    getPlayerName,
    handleTradeOfferReceived,
    handleTradeCompleted,
  ]);

  // Helper functions
  const getMyResources = useCallback(() => {
    const myPlayer = players.find((p) => p.id === myPlayerId);
    return myPlayer ? myPlayer.resources : {};
  }, [players, myPlayerId]);

  const isMyTurn = useCallback(() => {
    return myPlayerId === currentPlayerId;
  }, [myPlayerId, currentPlayerId]);

  const canBuildSettlement = useCallback(() => {
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
  }, [players, myPlayerId, gamePhase]);

  const canBuildCity = useCallback(() => {
    const myPlayer = players.find((p) => p.id === myPlayerId);
    if (!myPlayer) return false;

    if (gamePhase === "setup") {
      return false;
    }

    const resources = myPlayer.resources || {};
    return (
      myPlayer.cities_left > 0 && resources.ore >= 3 && resources.wheat >= 2
    );
  }, [players, myPlayerId, gamePhase]);

  const canBuildRoad = useCallback(() => {
    const myPlayer = players.find((p) => p.id === myPlayerId);
    if (!myPlayer) return false;

    if (gamePhase === "setup") {
      return true;
    }

    const resources = myPlayer.resources || {};
    return (
      myPlayer.roads_left > 0 && resources.wood >= 1 && resources.brick >= 1
    );
  }, [players, myPlayerId, gamePhase]);

  // Action handlers
  const handleEndTurn = useCallback(() => {
    if (!isMyTurn()) return;
    SimpleGameService.endTurn();
    setBuildMode(null);
    showSuccessIndicator("Ending turn...");
  }, [isMyTurn, showSuccessIndicator]);

  const handleRollDice = useCallback(() => {
    if (!isMyTurn() || gamePhase === "setup") return;
    SimpleGameService.rollDice();
    showSuccessIndicator("Rolling dice...");
  }, [isMyTurn, gamePhase, showSuccessIndicator]);

  // Click handlers
  const handleVertexClick = useCallback(
    (vertexId: number) => {
      if (!isMyTurn() || buildMode !== "settlement") return;
      SimpleGameService.buildSettlement(vertexId);
      showSuccessIndicator("Building settlement...");
    },
    [isMyTurn, buildMode, showSuccessIndicator]
  );

  const handleEdgeClick = useCallback(
    (edgeId: number) => {
      if (!isMyTurn() || buildMode !== "road") return;
      SimpleGameService.buildRoad(edgeId);
      showSuccessIndicator("Building road...");
    },
    [isMyTurn, buildMode, showSuccessIndicator]
  );

  const handleLeaveGame = () => {
    SimpleGameService.disconnectFromRoom();
    navigate("/");
  };

  // Build mode toggle
  const handleBuild = (type: "settlement" | "city" | "road") => {
    if (!isMyTurn()) return;
    if (buildMode === type) {
      setBuildMode(null);
    } else {
      setBuildMode(type);
    }
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
            {isMyTurn() ? "✨ Your Turn" : "⏳Waiting..."}
          </TurnIndicator>
        </LeftSection>
        <LeaveButton onClick={handleLeaveGame}>Leave Game</LeaveButton>
      </TopBar>

      <MainContent>
        <LeftPanel>
          <PlayersSection>
            <Panel>
              <Section>
                <SectionHeader>Players ({players.length})</SectionHeader>
                {players.map((player, index) => {
                  const isCurrentPlayer = player.id === currentPlayerId;
                  const isLeading =
                    player.victory_points === maxVictoryPoints &&
                    maxVictoryPoints > 0;
                  const displayName = player.id.substring(0, 8);
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
              <SectionHeader>Actions</SectionHeader>
              <ActionsGrid>
                {gamePhase === "setup" ? (
                  <>
                    <ActionButton variant="secondary" disabled={true} compact>
                      <ButtonIcon>🎲</ButtonIcon>
                      Roll
                    </ActionButton>

                    <ActionButton
                      variant="danger"
                      onClick={handleEndTurn}
                      disabled={!isMyTurn()}
                      compact
                    >
                      <ButtonIcon>⏭️</ButtonIcon>
                      End
                    </ActionButton>
                  </>
                ) : (
                  <>
                    <ActionButton
                      variant="secondary"
                      onClick={handleRollDice}
                      disabled={!isMyTurn()}
                      compact
                    >
                      <ButtonIcon>🎲</ButtonIcon>
                      Roll
                    </ActionButton>

                    <ActionButton
                      variant="danger"
                      onClick={handleEndTurn}
                      disabled={!isMyTurn()}
                      compact
                    >
                      <ButtonIcon>⏭️</ButtonIcon>
                      End
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
                    !isMyTurn() ||
                    (!canBuildSettlement() && gamePhase !== "setup")
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
                    !isMyTurn() || (!canBuildRoad() && gamePhase !== "setup")
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
                    !isMyTurn() || !canBuildCity() || gamePhase === "setup"
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
                  disabled={!isMyTurn() || gamePhase === "setup"}
                  compact
                >
                  <ButtonIcon>🤝</ButtonIcon>
                  Trade
                </ActionButton>

                <ActionButton
                  onClick={() => setShowBankTradeModal(true)}
                  disabled={!isMyTurn() || gamePhase === "setup"}
                  compact
                >
                  <ButtonIcon>🏪</ButtonIcon>
                  Bank
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

      {/* Trade Modal */}
      <TradeModal
        isOpen={showTradeModal}
        onClose={() => setShowTradeModal(false)}
        myResources={getMyResources()}
        players={players}
        myPlayerId={myPlayerId}
        onCreateOffer={handleCreateTradeOffer}
      />

      {/* Bank Trade Modal */}
      <BankTradeModal
        isOpen={showBankTradeModal}
        onClose={() => setShowBankTradeModal(false)}
        myResources={getMyResources()}
        onBankTrade={handleBankTrade}
      />

      {/* Trade Offer Notifications */}
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
