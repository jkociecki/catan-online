// Poprawiony komponent CatanCorner.tsx

import { Corner as CornerData } from "../../engine/corner";
import styled from "styled-components";
import { BaseTile } from "../../engine/tile";
import { useState, useEffect, useRef } from "react";

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
  /* Bez żadnej transformacji skalowania */

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
  /* Bez żadnej transformacji skalowania */

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

// Stylizowany punkt "pusty", reagujący na kliknięcia - NIE ZMIENIAĆ!
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
  const clickedRef = useRef(false); // Referencja do śledzenia czy właśnie kliknięto

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
      console.log(`Preview coordinates: x=${coords.x}, y=${coords.y}`);
    }

    if (hasBuilding) {
      console.log(`Building coordinates: x=${coords.x}, y=${coords.y}`);
    }
  }, [isPreviewMode, hasBuilding, coords.x, coords.y]);

  // Efekt dla podglądu budowli przy najechaniu
  useEffect(() => {
    if (isPreviewMode) {
      setIsActive(true);

      // Pokaż podgląd budowli zgodnie z trybem
      if (buildMode === "settlement" && !hasBuilding) {
        setShowPreview(true);
        setIsCity(false);
      } else if (
        buildMode === "city" &&
        hasBuilding &&
        !isBuildingCity &&
        corner.getOwner()?.getName() === myPlayerId
      ) {
        setShowPreview(true);
        setIsCity(true);
      } else {
        setShowPreview(false);
      }
    } else {
      setIsActive(false);
      setShowPreview(false);
    }
  }, [
    buildMode,
    hasBuilding,
    isBuildingCity,
    isPreviewMode,
    corner,
    myPlayerId,
  ]);

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

  // DOMEK - Bardzo małe punkty, umieszczone dokładnie w pozycji punktu klikalnego
  // const settlementPoints = `
  //   ${coords.x},${coords.y - 0.35}
  //   ${coords.x + 0.3},${coords.y}
  //   ${coords.x + 0.15},${coords.y + 0.35}
  //   ${coords.x - 0.15},${coords.y + 0.35}
  //   ${coords.x - 0.3},${coords.y}
  // `;
  const settlementPoints = `
  ${coords.x},${coords.y - 0.52}
  ${coords.x + 0.45},${coords.y}
  ${coords.x + 0.225},${coords.y + 0.52}
  ${coords.x - 0.225},${coords.y + 0.52}
  ${coords.x - 0.45},${coords.y}
`;

  // MIASTO - Bardzo mały kształt, umieszczony dokładnie w pozycji punktu klikalnego
  const cityPath = `
    M ${coords.x - 0.32} ${coords.y - 0.05}
    L ${coords.x - 0.32} ${coords.y + 0.35}
    L ${coords.x + 0.32} ${coords.y + 0.35}
    L ${coords.x + 0.32} ${coords.y - 0.05}
    L ${coords.x} ${coords.y - 0.35}
    Z
  `;

  // Obsługuje kliknięcie i zapobiega podwójnemu wywołaniu
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Zapobiegaj propagacji zdarzeń

    // Zapobiegaj podwójnemu kliknięciu
    if (clickedRef.current) return;

    clickedRef.current = true;

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
    console.log("Clicked corner object:", corner);

    if (onClick) {
      onClick(corner, tile);
    }

    // Resetowanie flagi po krótkim opóźnieniu
    setTimeout(() => {
      clickedRef.current = false;
    }, 500);
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

      {/* DEBUG: Numerek wierzchołka */}
      <text
        x={coords.x}
        y={coords.y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="0.7"
        fill="blue"
        fontWeight="bold"
        pointerEvents="none"
        style={{ userSelect: "none" }}
      >
        {tile.getCorners().indexOf(corner)}
      </text>

      {/* DEBUG: Info o kafelku */}
      <text
        x={coords.x}
        y={coords.y + 0.4}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="0.7"
        fill="green"
        fontWeight="bold"
        pointerEvents="none"
        style={{ userSelect: "none" }}
      >
        {tile.tileId}
      </text>
    </>
  );
}
