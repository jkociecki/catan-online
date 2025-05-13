import { GridGenerator, HexUtils } from 'react-hexgrid';
import { initTiles, Tiles } from './boardHelpers';
import { Player } from './player';
import {
  getCorner,
  getEdge,
  TileCornerDir,
  TileEdgeDir,
  assertPlaceRoad,
  assertPlaceSettlement,
  assertPlaceCity
} from './tileHelpers';
import { Hex } from './types';
import { BasicGameConfig } from '../game/config';

/**
 * This will be the class for a Catan Board,
 * also the main entry point for most actions against the game board.
 *
 * It will:
 * - Store the basic board hexagons, generated using GridGenerator
 * - Store the tiles info, a dictionary of Tiles, keyed by each hex ID
 * - Will API all the logic to interact with the board, such as
 * -- initialize the game from a given configuration
 * -- board.addSettlement(tile (coords?), corner, player)
 * -- board.addRoad(tile (coords?), edge, player)
 * -- (all the associated checking methods)
 */

export class Board {
  private hexagons: Hex[];
  private tiles: Tiles;
  // Check https://www.redblobgames.com/grids/parts/#hexagon-relationships

  constructor(public size: number, config?: BasicGameConfig) {
    this.hexagons = GridGenerator.hexagon(size + 1); // +1 for the overflow ring
    this.tiles = initTiles(this.hexagons, size, config);
  }

  getHexes() {
    return this.hexagons;
  }

  getTiles() {
    return this.tiles;
  }

  getTile(hex: Hex) {
    return this.tiles[HexUtils.getID(hex)];
  }

  /**
   *
   * @param tileId
   * @param dir
   * @param player
   * @param onGameStartup -> Bypass the need of a road reaching the corner during initial game startup
   */
  placeSettlement(
    tileId: string,
    dir: TileCornerDir,
    player: Player,
    onGameStartup = false
  ) {
    assertPlaceSettlement(
      this.tiles[tileId],
      dir,
      this.tiles,
      player,
      onGameStartup
    );
    const corner = getCorner(this.tiles[tileId], dir, this.tiles);
    if (corner) {
      corner.placeSettlement(player);
    }
  }

  placeCity(tileId: string, dir: TileCornerDir, player: Player) {
    const corner = getCorner(this.tiles[tileId], dir, this.tiles);
    if (corner) {
      assertPlaceCity(corner, player);
      corner.placeCity(player);
    }
  }

  placeRoad(tileId: string, dir: TileEdgeDir, player: Player) {
    assertPlaceRoad(this.tiles[tileId], dir, this.tiles, player);
    const edge = getEdge(this.tiles[tileId], dir, this.tiles);
    edge.placeRoad(player);
  }
}
