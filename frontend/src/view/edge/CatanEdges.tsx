import React, { useState } from 'react';
import { Board } from '../../engine/board';
import { Hex } from '../../engine/types';
import { TileEdge } from '../../engine/tileHelpers';
import { HexUtils } from 'react-hexgrid';
import { BaseTile, TileType } from '../../engine/tile';
import { Edge as EdgeData } from '../../engine/edge';
import { Edge } from './CatanEdge';
import { useLayout } from '../context/LayoutContext';

function shouldRenderEdge(board: Board, hex: Hex, edge: TileEdge): boolean {
  const tile = board.getTile(hex);
  return (
    tile.getTileType() === TileType.TILE ||
    (hex.q < 0 && hex.s <= board.size && edge === TileEdge.NE) ||
    (hex.s < 0 && hex.q <= board.size && edge === TileEdge.NW) ||
    (hex.s > 0 && hex.r >= board.size * -1 && edge === TileEdge.W)
  );
}

interface Props {
  hexagons: Hex[];
  board: Board;
  onClick: (edge: EdgeData, tile: BaseTile) => void;
  buildMode?: string | null | undefined;
  myPlayerId?: string;
  myColor?: string;
}

export function Edges({ 
  board, 
  hexagons, 
  onClick,
  buildMode,
  myPlayerId,
  myColor = "red" 
}: Props) {
  const layout = useLayout();
  const [hoveredEdge, setHoveredEdge] = useState<{edge: EdgeData, tile: BaseTile} | null>(null);

  // Funkcja wspomagająca do obsługi kliknięcia krawędzi
  const handleEdgeClick = (edge: EdgeData, tile: BaseTile) => {
    // Dodajemy logikę przewidywania budowy - symulujemy natychmiastową odpowiedź
    if (buildMode === 'road' && !edge.getOwner()) {
      // Tutaj możemy dodać tymczasową drogę, ale zamiast tego wykorzystamy system podglądu
    }
    onClick(edge, tile);
  };

  // Obsługa najechania myszą na krawędź
  const handleMouseEnter = (edge: EdgeData, tile: BaseTile) => {
    setHoveredEdge({ edge, tile });
  };

  // Obsługa opuszczenia krawędzi myszą
  const handleMouseLeave = () => {
    setHoveredEdge(null);
  };

  return (
    <>
      {hexagons
        // Get every hex coords and tile data
        .map((hex) => ({
          hexCoords: HexUtils.hexToPixel(hex, layout),
          tile: board.getTile(hex),
          renderNE: shouldRenderEdge(board, hex, TileEdge.NE),
          renderNW: shouldRenderEdge(board, hex, TileEdge.NW),
          renderW: shouldRenderEdge(board, hex, TileEdge.W)
        }))
        // Render
        .map(({ hexCoords, tile, renderNE, renderNW, renderW }, i: number) => (
          <React.Fragment key={`hex-${i}`}>
            {renderW && (
              <g 
                key={`edge-${i}-W`}
                onMouseEnter={() => handleMouseEnter(tile.getEdges()[TileEdge.W], tile)}
                onMouseLeave={handleMouseLeave}
              >
                <Edge
                  edge={tile.getEdges()[TileEdge.W]}
                  tile={tile}
                  coords={{
                    x: hexCoords.x + layout.size.x / 1.15 - 0.35,
                    y: hexCoords.y - layout.size.y / 2
                  }}
                  height={layout.size.y}
                  position={TileEdge.W}
                  onClick={handleEdgeClick}
                  buildMode={buildMode}
                  isPreviewMode={hoveredEdge?.edge === tile.getEdges()[TileEdge.W]}
                  myPlayerId={myPlayerId}
                  myColor={myColor}
                />
              </g>
            )}
            {renderNW && (
              <g 
                key={`edge-${i}-NW`}
                onMouseEnter={() => handleMouseEnter(tile.getEdges()[TileEdge.NW], tile)}
                onMouseLeave={handleMouseLeave}
              >
                <Edge
                  edge={tile.getEdges()[TileEdge.NW]}
                  tile={tile}
                  coords={{
                    x: hexCoords.x,
                    y: hexCoords.y - layout.size.y - 0.5
                  }}
                  height={layout.size.y}
                  position={TileEdge.NW}
                  onClick={handleEdgeClick}
                  buildMode={buildMode}
                  isPreviewMode={hoveredEdge?.edge === tile.getEdges()[TileEdge.NW]}
                  myPlayerId={myPlayerId}
                  myColor={myColor}
                />
              </g>
            )}
            {renderNE && (
              <g 
                key={`edge-${i}-NE`}
                onMouseEnter={() => handleMouseEnter(tile.getEdges()[TileEdge.NE], tile)}
                onMouseLeave={handleMouseLeave}
              >
                <Edge
                  edge={tile.getEdges()[TileEdge.NE]}
                  tile={tile}
                  coords={{
                    x: hexCoords.x,
                    y: hexCoords.y - layout.size.y + 0.5
                  }}
                  height={layout.size.y}
                  position={TileEdge.NE}
                  onClick={handleEdgeClick}
                  buildMode={buildMode}
                  isPreviewMode={hoveredEdge?.edge === tile.getEdges()[TileEdge.NE]}
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