import { OffsetTile, Tile, BaseTile, TileType } from './tile';
import { Hex } from './types';
import { HexUtils } from 'react-hexgrid';
import { BasicGameConfig, TileGameData } from '../game/config';

export type Tiles = { [id: string]: BaseTile };

function initEmptyTiles(hexes: Hex[], boardRadius: number): Tiles {
  const tiles: Tiles = {};

  hexes.forEach((hex) => {
    const id = HexUtils.getID(hex);
    // any tile outside of the board radius will be considered the offset,
    // only if it is part of the immediate border. Further tiles will throw.
    const largestCoord = Math.max(...[hex.q, hex.r, hex.s].map(Math.abs));

    if (largestCoord < boardRadius + 1) {
      tiles[id] = new Tile(id);
    } else if (largestCoord === boardRadius + 1) {
      tiles[id] = new OffsetTile(id);
    } else {
      throw new Error(
        'Unexpected hexagons outside the offset ring, got coord:' + id
      );
    }
  });

  return tiles;
}

function initLayout(tiles: Tiles, layout: { [tileId: string]: TileGameData }) {
  Object.keys(tiles).forEach((tileId) => {
    const tile = tiles[tileId];
    const conf = layout[tileId];
    if (conf && tile.getTileType() === TileType.TILE) {
      (tile as Tile).setResource(conf.resource);
      (tile as Tile).setDiceNumber(conf.diceNumber);
    }
  });
}

export function initTiles(
  hexes: Hex[],
  boardRadius: number,
  config?: BasicGameConfig
): Tiles {
  const tiles = initEmptyTiles(hexes, boardRadius);

  if (config) {
    // TODO: initialize game config (aka, tile types, ports, etc...)
    initLayout(tiles, config.resourcesLayout);
  }

  return tiles;
}
