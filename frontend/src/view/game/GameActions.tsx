import React, { useState, useEffect } from "react";
import styled from "styled-components";
import GameService from "../../engine/board/GameService";

interface GameActionsProps {
  isMyTurn: boolean;
  myResources: any;
  canBuildSettlement: boolean;
  canBuildCity: boolean;
  canBuildRoad: boolean;
  gamePhase: string; // Obecnie używana faza gry
  players: any[]; // Wszyscy gracze
  myPlayerId: string; // ID mojego gracza
  setBuildMode?: (mode: "settlement" | "road" | null) => void; // DODANE
  buildMode?: "settlement" | "road" | null; // DODANE
}

const ActionsContainer = styled.div`
  margin-top: 20px;
  padding: 15px;
  background-color: #f8f8f8;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
`;

const ActionButton = styled.button<{ disabled: boolean; active?: boolean }>`
  background-color: ${(props) =>
    props.active ? "#2196F3" : props.disabled ? "#cccccc" : "#4caf50"};
  color: white;
  border: none;
  padding: 10px 15px;
  margin: 5px;
  border-radius: 4px;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  opacity: ${(props) => (props.disabled ? 0.7 : 1)};

  &:hover {
    background-color: ${(props) =>
      props.active ? "#1976D2" : props.disabled ? "#cccccc" : "#45a049"};
  }
`;

const ActionGroup = styled.div`
  margin-bottom: 15px;
`;

const ResourceCounter = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 15px;
  gap: 10px;
`;

const Resource = styled.div`
  display: flex;
  align-items: center;
  padding: 5px 10px;
  background-color: #eee;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const ResourceIcon = styled.span`
  margin-right: 5px;
`;

const ResourceText = styled.span`
  display: inline-block;
`;

const BuildInstructions = styled.div`
  background-color: #e3f2fd;
  padding: 10px;
  margin-top: 10px;
  border-radius: 4px;
  font-style: italic;
`;

const PhaseIndicator = styled.div<{ isSetup?: boolean }>`
  background-color: ${(props) => (props.isSetup ? "#ff9800" : "#4caf50")};
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 15px;
  font-weight: bold;
  text-align: center;
`;

const SetupProgress = styled.div`
  margin-top: 10px;
  padding: 15px;
  background-color: #fff3e0;
  border-radius: 4px;
  font-weight: bold;
`;

const ProgressBar = styled.div<{ fillPercent: number; color: string }>`
  height: 12px;
  background-color: #e0e0e0;
  border-radius: 6px;
  margin-top: 5px;
  overflow: hidden;

  &:after {
    content: "";
    display: block;
    height: 100%;
    width: ${(props) => props.fillPercent}%;
    background-color: ${(props) => props.color};
    transition: width 0.3s ease-in-out;
  }
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
}: GameActionsProps) {
  const [buildMode, setBuildMode] = useState<string | null>(null);
  const [hasRolled, setHasRolled] = useState<boolean>(false);
  const [setupProgress, setSetupProgress] = useState<{
    settlements: number;
    roads: number;
  }>({ settlements: 0, roads: 0 });

  // Sprawdź czy jesteśmy w fazie setup
  const isSetupPhase = gamePhase === "setup";

  // Oblicz postęp w fazie setup dla aktualnego gracza
  useEffect(() => {
    if (isSetupPhase) {
      // Znajdź dane o moim graczu
      const myPlayer = players.find((p) => p.id === myPlayerId);
      if (myPlayer) {
        // W prawdziwej implementacji trzeba by śledzić faktyczną liczbę postawionych osad/dróg
        // To jest uproszczona wersja - założenie, że max liczba osad to 5, dróg to 15
        const settlementCount = 5 - (myPlayer.settlements_left || 5);
        const roadCount = 15 - (myPlayer.roads_left || 15);

        console.log(
          `Updating setup progress: settlements=${settlementCount}, roads=${roadCount}`
        );

        setSetupProgress({
          settlements: Math.min(settlementCount, 2), // Max 2 osady w fazie setup
          roads: Math.min(roadCount, 2), // Max 2 drogi w fazie setup
        });
      }
    }
  }, [isSetupPhase, players, myPlayerId]);

  // Reset build mode and hasRolled when turn changes
  useEffect(() => {
    if (!isMyTurn) {
      setBuildMode(null);
      setHasRolled(false);
    }
  }, [isMyTurn]);

  // Reset hasRolled when game phase changes (np. z MAIN na ROLL_DICE)
  useEffect(() => {
    if (gamePhase === "ROLL_DICE" || gamePhase === "roll_dice") {
      setHasRolled(false);
    }
  }, [gamePhase]);

  const handleBuild = (type: string) => {
    if (!isMyTurn) return;

    // Toggle build mode
    if (buildMode === type) {
      setBuildMode?.(null);
    } else {
      setBuildMode?.(type as "settlement" | "road");
    }
  };

  const handleRollDice = () => {
    console.log(
      "Próba rzutu kośćmi: isMyTurn=",
      isMyTurn,
      "hasRolled=",
      hasRolled,
      "gamePhase=",
      gamePhase
    );

    // Sprawdź czy jesteśmy w fazie, w której można rzucać kośćmi
    const canRoll = gamePhase === "ROLL_DICE" || gamePhase === "roll_dice";

    // Nie pozwól na rzut kośćmi w fazie setup lub jeśli nie jest nasza tura
    if (!isMyTurn || hasRolled || isSetupPhase || !canRoll) {
      console.log("Nie można rzucić kośćmi w tej fazie gry");
      return;
    }

    console.log("Wysyłanie akcji roll_dice");
    GameService.rollDice();
    setHasRolled(true);
  };

  const handleEndTurn = () => {
    console.log("Próba zakończenia tury: isMyTurn=", isMyTurn);
    if (!isMyTurn) return;

    console.log("Wysyłanie akcji end_turn");
    GameService.endTurn();
    setBuildMode(null);
    setHasRolled(false);
  };

  // Resource icons mapping
  const resourceIcons: { [key: string]: string } = {
    WOOD: "🌲",
    BRICK: "🧱",
    SHEEP: "🐑",
    WHEAT: "🌾",
    ORE: "⛰️",
  };

  // Sort resources for consistent display
  const sortedResources = Object.entries(myResources || {}).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  // Instrukcja dla fazy setup
  const getSetupInstructionText = () => {
    if (setupProgress.settlements < 1) {
      return "Umieść swoją pierwszą osadę na planszy";
    } else if (setupProgress.roads < 1) {
      return "Umieść swoją pierwszą drogę, połączoną z osadą";
    } else if (setupProgress.settlements < 2) {
      return "Umieść swoją drugą osadę na planszy";
    } else if (setupProgress.roads < 2) {
      return "Umieść swoją drugą drogę, połączoną z osadą";
    } else {
      return "Oczekiwanie na zakończenie fazy przygotowania przez pozostałych graczy";
    }
  };

  // Funkcja określająca, co można budować w fazie setup
  const getSetupActions = () => {
    if (!isMyTurn) return null;

    return (
      <ActionGroup>
        <ActionButton
          disabled={
            setupProgress.settlements >= 2 ||
            (setupProgress.settlements === 1 && setupProgress.roads < 1)
          }
          active={buildMode === "settlement"}
          onClick={() => handleBuild("settlement")}
        >
          {`Umieść osadę (${setupProgress.settlements}/2)`}
        </ActionButton>

        <ActionButton
          disabled={
            setupProgress.roads >= 2 ||
            setupProgress.settlements <= setupProgress.roads
          }
          active={buildMode === "road"}
          onClick={() => handleBuild("road")}
        >
          {`Umieść drogę (${setupProgress.roads}/2)`}
        </ActionButton>

        <ActionButton
          disabled={
            setupProgress.roads <= setupProgress.settlements ||
            (setupProgress.settlements === 1 && setupProgress.roads === 0) ||
            (setupProgress.settlements === 2 && setupProgress.roads === 1)
          }
          onClick={handleEndTurn}
        >
          Zakończ turę
        </ActionButton>

        {/* Dodany pasek postępu fazy setup */}
        <SetupProgress>
          Postęp fazy przygotowania:
          <ProgressBar
            fillPercent={
              setupProgress.settlements * 25 + setupProgress.roads * 25
            }
            color="#ff9800"
          />
        </SetupProgress>
      </ActionGroup>
    );
  };

  // Funkcja określająca, co można robić w normalnej fazie gry
  const getNormalGameActions = () => {
    // Sprawdź czy jesteśmy w fazie rzucania kośćmi
    const isRollDicePhase =
      gamePhase === "ROLL_DICE" || gamePhase === "roll_dice";

    // Sprawdź czy jesteśmy w fazie głównej (po rzucie kośćmi)
    const isMainPhase = gamePhase === "MAIN" || gamePhase === "main";

    return (
      <>
        <ActionGroup>
          <ActionButton
            disabled={!isMyTurn || hasRolled || !isRollDicePhase}
            onClick={handleRollDice}
          >
            Rzuć kośćmi
          </ActionButton>
        </ActionGroup>

        {isMainPhase && (
          <ActionGroup>
            <ActionButton
              disabled={!isMyTurn || !canBuildSettlement}
              active={buildMode === "settlement"}
              onClick={() => handleBuild("settlement")}
            >
              Buduj osadę
            </ActionButton>

            <ActionButton
              disabled={!isMyTurn || !canBuildCity}
              active={buildMode === "city"}
              onClick={() => handleBuild("city")}
            >
              Buduj miasto
            </ActionButton>

            <ActionButton
              disabled={!isMyTurn || !canBuildRoad}
              active={buildMode === "road"}
              onClick={() => handleBuild("road")}
            >
              Buduj drogę
            </ActionButton>
          </ActionGroup>
        )}

        {isMyTurn &&
          (isMainPhase ||
            gamePhase === "END_TURN" ||
            gamePhase === "end_turn") && (
            <ActionGroup>
              <ActionButton
                disabled={!isMyTurn || (!hasRolled && isRollDicePhase)}
                onClick={handleEndTurn}
              >
                Zakończ turę
              </ActionButton>
            </ActionGroup>
          )}
      </>
    );
  };

  return (
    <ActionsContainer>
      <h3>Akcje Gry</h3>

      <PhaseIndicator isSetup={isSetupPhase}>
        {isSetupPhase
          ? "Faza przygotowania"
          : gamePhase === "ROLL_DICE" || gamePhase === "roll_dice"
          ? "Rzut kośćmi"
          : gamePhase === "MAIN" || gamePhase === "main"
          ? "Faza główna gry"
          : gamePhase === "END_TURN" || gamePhase === "end_turn"
          ? "Zakończenie tury"
          : "Faza gry: " + gamePhase}
      </PhaseIndicator>

      <ResourceCounter>
        {sortedResources.length > 0 ? (
          sortedResources.map(([resource, count]) => (
            <Resource key={resource}>
              <ResourceIcon>{resourceIcons[resource] || "📦"}</ResourceIcon>
              {/* <ResourceText>{resource}: {count}</ResourceText> */}
            </Resource>
          ))
        ) : (
          <Resource>
            <ResourceText>Brak zasobów</ResourceText>
          </Resource>
        )}
      </ResourceCounter>

      {isSetupPhase ? getSetupActions() : getNormalGameActions()}

      {buildMode && (
        <BuildInstructions>
          <p>Kliknij na planszy, aby zbudować: {buildMode}</p>
          <ActionButton disabled={false} onClick={() => setBuildMode(null)}>
            Anuluj budowanie
          </ActionButton>
        </BuildInstructions>
      )}

      {!isMyTurn && (
        <BuildInstructions>
          Oczekiwanie na zakończenie tury przez innego gracza...
        </BuildInstructions>
      )}

      {isMyTurn && isSetupPhase && (
        <BuildInstructions>{getSetupInstructionText()}</BuildInstructions>
      )}

      {isMyTurn && !isSetupPhase && gamePhase === "ROLL_DICE" && !hasRolled && (
        <BuildInstructions>
          Rzuć kośćmi, aby rozpocząć swoją turę!
        </BuildInstructions>
      )}
    </ActionsContainer>
  );
}
