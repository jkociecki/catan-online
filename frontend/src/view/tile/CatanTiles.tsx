import { Board } from '../../engine/board';
import { Hex } from '../../engine/types';
import { Tile, TileType } from '../../engine/tile';
import { CatanTile } from './CatanTile';

interface Props {
  hexagons: Hex[];
  board: Board;
}

export function Tiles({ hexagons, board }: Props) {
  return (
    <>
      {hexagons
        // Get tile for each hex
        .map((hex) => ({ hex, tile: board.getTile(hex) as Tile }))
        // Ignore offset ring
        .filter(({ tile }) => tile.getTileType() === TileType.TILE)
        // Render
        .map(({ hex, tile }, i: number) => (
          <CatanTile key={i} hex={hex} tile={tile} />
        ))}
    </>
  );
}
