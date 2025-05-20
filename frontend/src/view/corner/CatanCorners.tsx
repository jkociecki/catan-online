// Poprawiony komponent CatanCorners.tsx

import React from "react";
import { Board } from "../../engine/board";
import { Hex } from "../../engine/types";
import { Corner } from "./CatanCorner";
import { TileCorner } from "../../engine/tileHelpers";
import { HexUtils } from "react-hexgrid";
import { BaseTile, TileType } from "../../engine/tile";
import { Corner as CornerData } from "../../engine/corner";
import { useLayout } from "../context/LayoutContext";

function shouldRenderCorner(
  tile: BaseTile,
  hex: Hex,
  corner: TileCorner
): boolean {
  return (
    tile.getTileType() === TileType.TILE ||
    (hex.r > 0 && corner === TileCorner.N) ||
    (hex.r < 0 && corner === TileCorner.S)
  );
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

  // Funkcja wspomagająca do obsługi kliknięcia rogu
  const handleCornerClick = (corner: CornerData, tile: BaseTile) => {
    // Dodaj więcej logów diagnostycznych
    console.log(`Corner clicked on tile: ${tile.tileId}`, {
      corner,
      cornerVertices: corner.getVertices?.() || "No vertices",
      cornerHasOwner: corner.getOwner() !== null,
    });

    onClick(corner, tile);
  };

  // Obsługa najechania myszą na róg
  const handleMouseEnter = (corner: CornerData, tile: BaseTile) => {
    console.log(`Mouse entered corner on tile: ${tile.tileId}`);

    // Log useful diagnostic info
    if (typeof corner.getVertices === "function") {
      console.log("Corner vertices:", corner.getVertices());
    }

    if (typeof corner.getOwner === "function") {
      const owner = corner.getOwner();
      console.log("Corner owner:", owner ? owner.getName() : "none");
    }

    setHoveredCorner({ corner, tile });
  };

  // Obsługa opuszczenia rogiem myszą
  const handleMouseLeave = () => {
    setHoveredCorner(null);
  };

  return (
    <>
      {hexagons
        // Get every hex coords and tile data
        .map((hex) => {
          const hexCoords = HexUtils.hexToPixel(hex, layout);
          const tile = board.getTile(hex);
          const renderN = shouldRenderCorner(tile, hex, TileCorner.N);
          const renderS = shouldRenderCorner(tile, hex, TileCorner.S);

          // Debugowanie jeśli aktywny jest tryb budowania
          if (buildMode) {
            console.log(
              `Hex ${hex.q},${hex.r},${
                hex.s
              } pixel coords: x:${hexCoords.x.toFixed(
                2
              )}, y:${hexCoords.y.toFixed(2)}`
            );
          }

          return { hexCoords, tile, renderN, renderS, hex };
        })
        // Render
        .map(({ hexCoords, tile, renderN, renderS }, i: number) => (
          <React.Fragment key={`hex-${i}`}>
            {renderN && (
              <g
                key={`corner-${i}-N`}
                onMouseEnter={() =>
                  handleMouseEnter(tile.getCorners()[TileCorner.N], tile)
                }
                onMouseLeave={handleMouseLeave}
              >
                <Corner
                  corner={tile.getCorners()[TileCorner.N]}
                  tile={tile}
                  coords={{
                    // Używamy dokładnie tych samych koordynatów, które są używane przez hexagon
                    x: hexCoords.x,
                    y: hexCoords.y - layout.size.y,
                  }}
                  onClick={handleCornerClick}
                  buildMode={buildMode}
                  isPreviewMode={
                    hoveredCorner?.corner === tile.getCorners()[TileCorner.N]
                  }
                  myPlayerId={myPlayerId}
                  myColor={myColor}
                />
              </g>
            )}
            {renderS && (
              <g
                key={`corner-${i}-S`}
                onMouseEnter={() =>
                  handleMouseEnter(tile.getCorners()[TileCorner.S], tile)
                }
                onMouseLeave={handleMouseLeave}
              >
                <Corner
                  corner={tile.getCorners()[TileCorner.S]}
                  tile={tile}
                  coords={{
                    // Używamy dokładnie tych samych koordynatów, które są używane przez hexagon
                    x: hexCoords.x,
                    y: hexCoords.y + layout.size.y,
                  }}
                  onClick={handleCornerClick}
                  buildMode={buildMode}
                  isPreviewMode={
                    hoveredCorner?.corner === tile.getCorners()[TileCorner.S]
                  }
                  myPlayerId={myPlayerId}
                  myColor={myColor}
                />
              </g>
            )}
          </React.Fragment>
        ))}
    </>
  );
}
