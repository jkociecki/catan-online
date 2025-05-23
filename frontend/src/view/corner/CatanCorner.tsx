// frontend/src/view/corner/CatanCorner.tsx
// Dodaj tę funkcję NA POCZĄTKU pliku, PRZED komponentem Corner

import { Corner as CornerData } from "../../engine/corner";
import styled from "styled-components";
import { BaseTile } from "../../engine/tile";
import { useState, useEffect, useRef } from "react";

// ========== FUNKCJA DEBUGOWANIA - DODAJ TUTAJ ==========
function debugCornerGeometry(tile: BaseTile, cornerIndex: number) {
  const tileCoords = tile.tileId.split(",").map(Number);
  const [q, r, s] = tileCoords;

  console.log(`\n=== CORNER GEOMETRY DEBUG ===`);
  console.log(`Tile: ${tile.tileId} (${q}, ${r}, ${s})`);
  console.log(`Corner Index: ${cornerIndex}`);

  // Definicja narożników według frontendu
  const cornerNames = ["N", "NE", "SE", "S", "SW", "NW"];
  console.log(`Corner Name: ${cornerNames[cornerIndex]}`);

  // Oblicz teoretyczną pozycję wierzchołka
  const cornerOffsets = [
    [0, -1, 1], // 0: North - GÓRA
    [1, -1, 0], // 1: North-East
    [1, 0, -1], // 2: South-East
    [0, 1, -1], // 3: South - DÓŁ
    [-1, 1, 0], // 4: South-West
    [-1, 0, 1], // 5: North-West
  ];

  if (cornerIndex < cornerOffsets.length) {
    const [dq, dr, ds] = cornerOffsets[cornerIndex];
    const vertexPos = [q + dq, r + dr, s + ds];

    console.log(`Theoretical vertex position: [${vertexPos.join(", ")}]`);

    // Sprawdź które kafelki powinny dzielić ten wierzchołek
    console.log(`\nTiles that should share this vertex:`);

    // Dla każdego możliwego sąsiedniego kafelka
    const neighborOffsets = [
      [0, 0, 0], // Sam kafelek
      [1, -1, 0], // NE
      [1, 0, -1], // E
      [0, 1, -1], // SE
      [-1, 1, 0], // SW
      [-1, 0, 1], // W
      [0, -1, 1], // NW
    ];

    let sharedTiles = [];

    for (const [nq, nr, ns] of neighborOffsets) {
      const neighborCoords = [q + nq, r + nr, s + ns];
      const neighborId = neighborCoords.join(",");

      // Sprawdź każdy narożnik sąsiada
      for (let checkCorner = 0; checkCorner < 6; checkCorner++) {
        const [cdq, cdr, cds] = cornerOffsets[checkCorner];
        const checkVertexPos = [
          neighborCoords[0] + cdq,
          neighborCoords[1] + cdr,
          neighborCoords[2] + cds,
        ];

        // Jeśli pozycja wierzchołka się zgadza
        if (
          checkVertexPos[0] === vertexPos[0] &&
          checkVertexPos[1] === vertexPos[1] &&
          checkVertexPos[2] === vertexPos[2]
        ) {
          sharedTiles.push({
            tileId: neighborId,
            cornerIndex: checkCorner,
            cornerName: cornerNames[checkCorner],
          });
        }
      }
    }

    console.log(`Found ${sharedTiles.length} tiles sharing this vertex:`);
    sharedTiles.forEach((st) => {
      console.log(
        `  - Tile ${st.tileId}, corner ${st.cornerIndex} (${st.cornerName})`
      );
    });

    // Specjalna analiza dla narożników brzegowych
    if (sharedTiles.length === 1) {
      console.log(`\n⚠️ This is an EDGE vertex - only belongs to one tile!`);
      console.log(`This should be a "peak" or isolated corner.`);
    } else if (sharedTiles.length === 2) {
      console.log(`\n✓ This is a BORDER vertex - shared by 2 tiles`);
    } else if (sharedTiles.length === 3) {
      console.log(`\n✓ This is an INTERNAL vertex - shared by 3 tiles`);
    }
  }

  console.log(`=========================\n`);
}

// Reszta kodu pozostaje bez zmian...
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

    // NAJPIERW oblicz cornerIndex
    const cornerIndex = tile.getCorners().indexOf(corner);

    console.log(
      `Clicked corner at coords x:${coords.x.toFixed(2)}, y:${coords.y.toFixed(
        2
      )}`
    );
    console.log(
      `On tile: ${tile.tileId}, corner index in tile: ${cornerIndex}`
    );
    console.log("Clicked corner object:", corner);

    // TERAZ możesz wywołać debugowanie
    debugCornerGeometry(tile, cornerIndex);

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
