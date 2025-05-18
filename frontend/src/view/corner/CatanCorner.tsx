import { Corner as CornerData } from "../../engine/corner";
import styled from "styled-components";
import { BaseTile } from "../../engine/tile";
import { useState, useEffect } from "react";

interface Props {
  onClick?: (corner: CornerData, tile: BaseTile) => void;
  corner: CornerData;
  coords: { x: number; y: number };
  tile: BaseTile;
  buildMode?: string | null | undefined;
  isPreviewMode?: boolean;
  myPlayerId?: string;
  myColor?: string;
}

// Stylizowany komponent dla domku (osady)
const StyledSettlement = styled.polygon<{
  $color: string;
  $isPreview?: boolean;
  $animate?: boolean;
}>`
  fill: ${({ $color }) => $color};
  stroke: #333;
  stroke-width: 0.2;
  opacity: ${({ $isPreview }) => ($isPreview ? 0.6 : 1)};
  cursor: pointer;
  animation: ${({ $animate }) => ($animate ? "pulse 2s infinite" : "none")};
  transform-origin: center;
  transform: scale(1.2);

  @keyframes pulse {
    0% {
      opacity: 0.7;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0.7;
    }
  }

  &:hover {
    opacity: 0.8;
    stroke-width: 0.3;
  }
`;

// Stylizowany komponent dla domku (miasta)
const StyledCity = styled.path<{
  $color: string;
  $isPreview?: boolean;
  $animate?: boolean;
}>`
  fill: ${({ $color }) => $color};
  stroke: #333;
  stroke-width: 0.2;
  opacity: ${({ $isPreview }) => ($isPreview ? 0.6 : 1)};
  cursor: pointer;
  animation: ${({ $animate }) => ($animate ? "pulse 2s infinite" : "none")};
  transform-origin: center;
  transform: scale(1.2);

  @keyframes pulse {
    0% {
      opacity: 0.7;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0.7;
    }
  }

  &:hover {
    opacity: 0.8;
    stroke-width: 0.3;
  }
`;

// Stylizowany punkt "pusty", reagujący na kliknięcia
const StyledCircle = styled.circle<{
  $buildMode: string | null | undefined;
  $isPreviewMode: boolean;
  $hasBuilding: boolean;
  $isActive: boolean;
}>`
  fill: ${(props) =>
    props.$hasBuilding
      ? "transparent"
      : props.$isActive
      ? "rgba(255, 255, 255, 0.3)"
      : props.$buildMode
      ? "rgba(255, 255, 255, 0.2)"
      : "rgba(0, 0, 0, 0)"};
  stroke: ${(props) =>
    props.$hasBuilding
      ? "transparent"
      : props.$isActive
      ? "white"
      : props.$buildMode
      ? "rgba(255, 255, 255, 0.5)"
      : "rgba(0, 0, 0, 0)"};
  stroke-width: 0.2;
  stroke-dasharray: ${(props) =>
    props.$buildMode && !props.$hasBuilding ? "0.3 0.3" : "0"};
  r: ${(props) => (props.$isActive || props.$buildMode ? 0.8 : 0.7)};
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &:hover {
    fill: ${(props) =>
      props.$hasBuilding
        ? "transparent"
        : props.$buildMode
        ? "rgba(255, 255, 255, 0.4)"
        : "rgba(255, 255, 255, 0.2)"};
    stroke: white;
    r: 0.8;
  }
`;

export function Corner({
  corner,
  tile,
  coords,
  onClick,
  buildMode,
  isPreviewMode,
  myPlayerId,
  myColor = "red",
}: Props) {
  const [showPreview, setShowPreview] = useState(false);
  const [isCity, setIsCity] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [animate, setAnimate] = useState(false);

  // Sprawdź, czy na tym rogu jest już jakaś budowla
  const hasBuilding = corner.getOwner() !== null;
  // Określ, czy ta budowla jest miastem
  const isBuildingCity = corner.hasCity();
  // Pobierz kolor gracza, który posiada budowlę
  const ownerColor = corner.getOwner()?.getColor() || "gray";

  // Log diagnostic info on hover
  useEffect(() => {
    if (isPreviewMode) {
      console.log(
        `Preview at corner on tile ${
          tile.tileId
        } at coords x:${coords.x.toFixed(2)}, y:${coords.y.toFixed(2)}`
      );
      if (typeof corner.getVertices === "function") {
        console.log("Corner vertices:", corner.getVertices());
      }
    }
  }, [isPreviewMode, coords, corner, tile]);

useEffect(() => {
  if (isPreviewMode) {
    setIsActive(true);
    setShowPreview(shouldShowPreview(coords, corner, buildMode, hasBuilding, isBuildingCity, myPlayerId));
    setIsCity(buildMode === "city");
  } else {
    setIsActive(false);
    setShowPreview(false);
  }
}, [buildMode, hasBuilding, isBuildingCity, isPreviewMode, corner, myPlayerId, coords]);

  // Efekt animacji po postawieniu budowli
  useEffect(() => {
    // Jeśli pojawiła się budowla, uruchom animację
    if (hasBuilding) {
      setAnimate(true);
      const timer = setTimeout(() => {
        setAnimate(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [hasBuilding]);

const settlementPoints = `
  ${coords.x},${coords.y - 0.3}
  ${coords.x + 0.25},${coords.y - 0.1}
  ${coords.x + 0.25},${coords.y + 0.15}
  ${coords.x - 0.25},${coords.y + 0.15}
  ${coords.x - 0.25},${coords.y - 0.1}
`;



function generateSettlementPoints(coords: { x: number; y: number }) {
  // Ensure we're using exact geometry for settlement point calculation
  const size = 0.25; // Size modifier for the settlement
  return `
    ${coords.x},${coords.y - 0.3 * size}
    ${coords.x + 0.25 * size},${coords.y - 0.1 * size}
    ${coords.x + 0.25 * size},${coords.y + 0.15 * size}
    ${coords.x - 0.25 * size},${coords.y + 0.15 * size}
    ${coords.x - 0.25 * size},${coords.y - 0.1 * size}
  `;
}

// Better detection for valid building spots on mouse hover
function shouldShowPreview(coords: { x: number; y: number }, corner: CornerData, buildMode: string | null | undefined, hasBuilding: boolean, isBuildingCity: boolean, myPlayerId: string | undefined): boolean {
  if (!buildMode) return false;
  
  // Improved path for settlement preview
  if (buildMode === "settlement") {
    console.log(`Settlement preview coords: x:${coords.x.toFixed(2)}, y:${coords.y.toFixed(2)}`);
    return !hasBuilding; // Only show preview if corner is empty
  }
  
  // Improved path for city preview
  else if (buildMode === "city") {
    // Only show preview if there's a settlement owned by the player
    return hasBuilding && 
           !isBuildingCity && 
           corner.getOwner()?.getName() === myPlayerId;
  }
  
  return false;
}



  // Miasto to bardziej skomplikowany kształt z dodatkową "wieżą"
  const cityPath = `
    M ${coords.x - 0.3} ${coords.y - 0.1}
    L ${coords.x - 0.3} ${coords.y + 0.2}
    L ${coords.x + 0.3} ${coords.y + 0.2}
    L ${coords.x + 0.3} ${coords.y - 0.1}
    L ${coords.x + 0.15} ${coords.y - 0.25}
    L ${coords.x - 0.15} ${coords.y - 0.25}
    Z
  `;

  const handleClick = () => {
    console.log(
      `Clicked corner at coords x:${coords.x.toFixed(2)}, y:${coords.y.toFixed(
        2
      )}`
    );
    console.log(
      `On tile: ${tile.tileId}, corner index in tile: ${tile
        .getCorners()
        .indexOf(corner)}`
    );
    // Add log for the corner object itself
    console.log("Clicked corner object:", corner);
    onClick?.(corner, tile);
  };

  return (
    <>
      {/* Zawsze renderuj "niewidzialny" punkt, który obsługuje kliknięcia */}
      <StyledCircle
        cx={coords.x}
        cy={coords.y}
        onClick={handleClick}
        $buildMode={buildMode}
        $isPreviewMode={!!isPreviewMode}
        $hasBuilding={hasBuilding}
        $isActive={isActive}
      />

      {/* Jeśli jest budowla, wyświetl odpowiedni kształt */}
      {hasBuilding &&
        (isBuildingCity ? (
          <StyledCity
            d={cityPath}
            $color={ownerColor}
            $animate={animate}
            onClick={handleClick}
          />
        ) : (
          <StyledSettlement
            points={settlementPoints}
            $color={ownerColor}
            $animate={animate}
            onClick={handleClick}
          />
        ))}

      {/* Jeśli pokazujemy podgląd budowli */}
      {showPreview &&
        (isCity ? (
          <StyledCity
            d={cityPath}
            $color={myColor}
            $isPreview={true}
            onClick={handleClick}
          />
        ) : (
          <StyledSettlement
            points={settlementPoints}
            $color={myColor}
            $isPreview={true}
            onClick={handleClick}
          />
        ))}
    </>
  );
}
