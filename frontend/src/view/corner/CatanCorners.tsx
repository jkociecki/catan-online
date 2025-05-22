// frontend/src/view/corner/CatanCorners.tsx - KOMPLETNIE PRZEPISANY

import React from "react";
import { Board } from "../../engine/board";
import { Hex } from "../../engine/types";
import { Corner } from "./CatanCorner";
import { HexUtils } from "react-hexgrid";
import { BaseTile, TileType } from "../../engine/tile";
import { Corner as CornerData } from "../../engine/corner";
import { useLayout } from "../context/LayoutContext";

function shouldRenderCorner(tile: BaseTile): boolean {
  // Renderuj narożniki tylko dla prawdziwych kafelków, nie dla offset tiles
  return tile.getTileType() === TileType.TILE;
}

interface Props {
  hexagons: Hex[];
  board: Board;
  onClick: (corner: CornerData, tile: BaseTile) => void;
  buildMode?: string | null | undefined;
  myPlayerId?: string;
  myColor?: string;
}

export function Corners({
  board,
  hexagons,
  onClick,
  buildMode,
  myPlayerId,
  myColor = "red",
}: Props) {
  const layout = useLayout();
  const [hoveredCorner, setHoveredCorner] = React.useState<{
    corner: CornerData;
    tile: BaseTile;
  } | null>(null);

  // DEBUG: Sprawdź ile narożników ma każdy kafelek
  React.useEffect(() => {
    console.log("=== DEBUG TILE CORNERS ===");
    hexagons.slice(0, 3).forEach((hex) => {
      const tile = board.getTile(hex);
      const corners = tile.getCorners();
      console.log(`Tile ${tile.tileId}: ${corners.length} corners`);
    });
    console.log("==========================");
  }, [hexagons, board]);

  // Funkcja wspomagająca do obsługi kliknięcia rogu
  const handleCornerClick = (corner: CornerData, tile: BaseTile) => {
    console.log(`Corner clicked on tile: ${tile.tileId}`, {
      corner,
      cornerIndex: tile.getCorners().indexOf(corner),
      cornerHasOwner: corner.getOwner() !== null,
    });

    onClick(corner, tile);
  };

  // Obsługa najechania myszą na róg
  const handleMouseEnter = (corner: CornerData, tile: BaseTile) => {
    setHoveredCorner({ corner, tile });
  };

  // Obsługa opuszczenia rogiem myszą
  const handleMouseLeave = () => {
    setHoveredCorner(null);
  };

  return (
    <>
      {hexagons
        .map((hex) => {
          const hexCoords = HexUtils.hexToPixel(hex, layout);
          const tile = board.getTile(hex);
          const shouldRender = shouldRenderCorner(tile);

          return { hexCoords, tile, shouldRender, hex };
        })
        .filter(({ shouldRender }) => shouldRender)
        .map(({ hexCoords, tile }, i: number) => {
          // ========== NOWE: RENDERUJ WSZYSTKIE 6 NAROŻNIKÓW ==========

          const corners = tile.getCorners();

          // Pozycje wszystkich 6 narożników względem centrum kafelka
          // Zgodne z backendem: 0=N, 1=NE, 2=SE, 3=S, 4=SW, 5=NW
          const cornerPositions = [
            { x: hexCoords.x, y: hexCoords.y - layout.size.y }, // 0: North
            {
              x: hexCoords.x + layout.size.x * 0.866,
              y: hexCoords.y - layout.size.y * 0.5,
            }, // 1: North-East
            {
              x: hexCoords.x + layout.size.x * 0.866,
              y: hexCoords.y + layout.size.y * 0.5,
            }, // 2: South-East
            { x: hexCoords.x, y: hexCoords.y + layout.size.y }, // 3: South
            {
              x: hexCoords.x - layout.size.x * 0.866,
              y: hexCoords.y + layout.size.y * 0.5,
            }, // 4: South-West
            {
              x: hexCoords.x - layout.size.x * 0.866,
              y: hexCoords.y - layout.size.y * 0.5,
            }, // 5: North-West
          ];

          return (
            <React.Fragment key={`hex-${i}`}>
              {corners.map((corner, cornerIndex) => (
                <g
                  key={`corner-${i}-${cornerIndex}`}
                  onMouseEnter={() => handleMouseEnter(corner, tile)}
                  onMouseLeave={handleMouseLeave}
                >
                  <Corner
                    corner={corner}
                    tile={tile}
                    coords={cornerPositions[cornerIndex]}
                    onClick={handleCornerClick}
                    buildMode={buildMode}
                    isPreviewMode={hoveredCorner?.corner === corner}
                    myPlayerId={myPlayerId}
                    myColor={myColor}
                  />
                </g>
              ))}
            </React.Fragment>
          );
        })}
    </>
  );
}
