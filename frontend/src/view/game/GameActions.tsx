import React, { useState, useEffect } from "react";
import styled from "styled-components";
import GameService from "../../engine/board/GameService";

interface GameActionsProps {
  isMyTurn: boolean;
  myResources: any;
  canBuildSettlement: boolean;
  canBuildCity: boolean;
  canBuildRoad: boolean;
  gamePhase: string; // Dodaj ten prop
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

// Zmieniam definicję komponentu Resource, żeby przyjmował tylko jedno dziecko
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

export default function GameActions({
  isMyTurn,
  myResources,
  canBuildSettlement,
  canBuildCity,
  canBuildRoad,
  gamePhase,
}: GameActionsProps) {
  const [buildMode, setBuildMode] = useState<string | null>(null);
  const [hasRolled, setHasRolled] = useState<boolean>(false);

  // Reset build mode and hasRolled when turn changes
  useEffect(() => {
    if (!isMyTurn) {
      setBuildMode(null);
      setHasRolled(false);
    }
  }, [isMyTurn]);

  const handleBuild = (type: string) => {
    if (!isMyTurn) return;

    // Toggle build mode
    if (buildMode === type) {
      setBuildMode(null);
      // Notify game service about exiting build mode
      GameService.sendMessage({
        type: "enter_build_mode",
        build_type: null,
      });
    } else {
      setBuildMode(type);
      // Notify the game service about entering build mode
      GameService.sendMessage({
        type: "enter_build_mode",
        build_type: type,
      });
    }
  };

  // W GameActions
  const handleRollDice = () => {
    console.log(
      "Próba rzutu kośćmi: isMyTurn=",
      isMyTurn,
      "hasRolled=",
      hasRolled,
      "gamePhase=",
      gamePhase
    );

    // Nie pozwól na rzut kośćmi w fazie setup
    if (!isMyTurn || hasRolled || gamePhase === "setup") {
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

  return (
    <ActionsContainer>
      <h3>Game Actions</h3>

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
            <ResourceText>No resources yet</ResourceText>
          </Resource>
        )}
      </ResourceCounter>

      <ActionGroup>
        <ActionButton
          disabled={!isMyTurn || hasRolled || gamePhase === "setup"}
          onClick={handleRollDice}
        >
          Roll Dice
        </ActionButton>

        <ActionButton
          disabled={!isMyTurn || !hasRolled || !canBuildSettlement}
          active={buildMode === "settlement"}
          onClick={() => handleBuild("settlement")}
        >
          Build Settlement
        </ActionButton>

        <ActionButton
          disabled={!isMyTurn || !hasRolled || !canBuildCity}
          active={buildMode === "city"}
          onClick={() => handleBuild("city")}
        >
          Build City
        </ActionButton>

        <ActionButton
          disabled={!isMyTurn || !hasRolled || !canBuildRoad}
          active={buildMode === "road"}
          onClick={() => handleBuild("road")}
        >
          Build Road
        </ActionButton>
      </ActionGroup>

      <ActionGroup>
        <ActionButton
          disabled={!isMyTurn || !hasRolled}
          onClick={handleEndTurn}
        >
          End Turn
        </ActionButton>
      </ActionGroup>

      {buildMode && (
        <BuildInstructions>
          <p>Click on the board to build a {buildMode}</p>
          <ActionButton disabled={false} onClick={() => setBuildMode(null)}>
            Cancel Building
          </ActionButton>
        </BuildInstructions>
      )}

      {!isMyTurn && (
        <BuildInstructions>
          Waiting for other player's turn to complete...
        </BuildInstructions>
      )}

      {isMyTurn && !hasRolled && (
        <BuildInstructions>Roll the dice to start your turn!</BuildInstructions>
      )}
    </ActionsContainer>
  );
}
