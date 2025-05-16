import React, { Component } from 'react';
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
  onClick: (Edge: EdgeData, tile: BaseTile) => void;
}

export function Edges({ board, hexagons, onClick }: Props) {
  const layout = useLayout();

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
              <Edge
                key={`edge-${i}-W`}
                edge={tile.getEdges()[TileEdge.W]}
                tile={tile}
                coords={{
                  x: hexCoords.x + layout.size.x / 1.15 - 0.35,
                  y: hexCoords.y - layout.size.y / 2
                }}
                height={layout.size.y}
                position={TileEdge.W}
                onClick={onClick}
              />
            )}
            {renderNW && (
              <Edge
                key={`edge-${i}-NW`}
                edge={tile.getEdges()[TileEdge.NW]}
                tile={tile}
                coords={{
                  x: hexCoords.x,
                  y: hexCoords.y - layout.size.y - 0.5
                }}
                height={layout.size.y}
                position={TileEdge.NW}
                onClick={onClick}
              />
            )}
            {renderNE && (
              <Edge
                key={`edge-${i}-NE`}
                edge={tile.getEdges()[TileEdge.NE]}
                tile={tile}
                coords={{
                  x: hexCoords.x,
                  y: hexCoords.y - layout.size.y + 0.5
                }}
                height={layout.size.y}
                position={TileEdge.NE}
                onClick={onClick}
              />
            )}
          </React.Fragment>
        ))}
    </>
  );
}
