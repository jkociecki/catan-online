import { Component } from 'react';
import PropTypes from 'prop-types';
import { Board } from '../../engine/board';
import { Hex } from '../../engine/types';
import { Corner } from './CatanCorner';
import { TileCorner } from '../../engine/tileHelpers';
import { HexUtils } from 'react-hexgrid';
import { BaseTile, TileType } from '../../engine/tile';
import { Corner as CornerData } from '../../engine/corner';

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
  layout: any;
  onClick: (corner: CornerData, tile: BaseTile) => void;
}

export class Corners extends Component<Props> {
  static contextTypes = {
    layout: PropTypes.object
  };
  

  render() {
    const { board, hexagons, onClick, layout } = this.props;

    return (
      hexagons
        // Get every hex coords and tile data
        .map((hex) => ({
          hexCoords: HexUtils.hexToPixel(hex, layout),
          tile: board.getTile(hex),
          renderN: shouldRenderCorner(board.getTile(hex), hex, TileCorner.N),
          renderS: shouldRenderCorner(board.getTile(hex), hex, TileCorner.S)
        }))
        // Render
        .map(({ hexCoords, tile, renderN, renderS }, i: number) => (
          <>
            {renderN && (
              <Corner
                key={`corner-${i}-N`}
                corner={tile.getCorners()[TileCorner.N]}
                tile={tile}
                coords={{
                  x: hexCoords.x,
                  y: hexCoords.y - layout.size.y
                }}
                onClick={onClick}
              />
            )}
            {renderS && (
              <Corner
                key={`corner-${i}-S`}
                corner={tile.getCorners()[TileCorner.S]}
                tile={tile}
                coords={{
                  x: hexCoords.x,
                  y: hexCoords.y + layout.size.y
                }}
                onClick={onClick}
              />
            )}
          </>
        ))
    );
  }
}
