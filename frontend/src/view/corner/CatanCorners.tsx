import React from 'react';
import { Board } from '../../engine/board';
import { Hex } from '../../engine/types';
import { Corner } from './CatanCorner';
import { TileCorner } from '../../engine/tileHelpers';
import { HexUtils } from 'react-hexgrid';
import { BaseTile, TileType } from '../../engine/tile';
import { Corner as CornerData } from '../../engine/corner';
import { useLayout } from '../context/LayoutContext';

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

export function Corners({ board, hexagons, onClick, buildMode, myPlayerId, myColor = "red" }: Props) {
  const layout = useLayout();
  const [hoveredCorner, setHoveredCorner] = React.useState<{corner: CornerData, tile: BaseTile} | null>(null);

  // Funkcja wspomagająca do obsługi kliknięcia rogu
  const handleCornerClick = (corner: CornerData, tile: BaseTile) => {
    // Dodajemy logikę przewidywania budowy - symulujemy natychmiastową odpowiedź
    if (buildMode === 'settlement' && !corner.getOwner()) {
      // Tutaj moglibyśmy dodać tymczasową budowlę, ale zamiast tego wykorzystamy system podglądu
    } else if (buildMode === 'city' && corner.getOwner() && !corner.hasCity()) {
      // Podobnie dla miasta
    }
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
        // Get every hex coords and tile data
        .map((hex) => ({
          hexCoords: HexUtils.hexToPixel(hex, layout),
          tile: board.getTile(hex),
          renderN: shouldRenderCorner(board.getTile(hex), hex, TileCorner.N),
          renderS: shouldRenderCorner(board.getTile(hex), hex, TileCorner.S)
        }))
        // Render
        .map(({ hexCoords, tile, renderN, renderS }, i: number) => (
          <React.Fragment key={`hex-${i}`}>
            {renderN && (
              <g 
                key={`corner-${i}-N`} 
                onMouseEnter={() => handleMouseEnter(tile.getCorners()[TileCorner.N], tile)}
                onMouseLeave={handleMouseLeave}
              >
                <Corner
                  corner={tile.getCorners()[TileCorner.N]}
                  tile={tile}
                  coords={{
                    x: hexCoords.x,
                    y: hexCoords.y - layout.size.y
                  }}
                  onClick={handleCornerClick}
                  buildMode={buildMode}
                  isPreviewMode={hoveredCorner?.corner === tile.getCorners()[TileCorner.N]}
                  myPlayerId={myPlayerId}
                  myColor={myColor}
                />
              </g>
            )}
            {renderS && (
              <g 
                key={`corner-${i}-S`} 
                onMouseEnter={() => handleMouseEnter(tile.getCorners()[TileCorner.S], tile)}
                onMouseLeave={handleMouseLeave}
              >
                <Corner
                  corner={tile.getCorners()[TileCorner.S]}
                  tile={tile}
                  coords={{
                    x: hexCoords.x,
                    y: hexCoords.y + layout.size.y
                  }}
                  onClick={handleCornerClick}
                  buildMode={buildMode}
                  isPreviewMode={hoveredCorner?.corner === tile.getCorners()[TileCorner.S]}
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