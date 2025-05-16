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
import { Hex, Resource } from './types';
import { BasicGameConfig } from '../game/config';
import { BoardData } from './board/BoardService';
import { Tile, TileType } from './tile';

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

const resourceMap: { [key: string]: Resource } = {
  'wood': Resource.Wood,
  'brick': Resource.Clay,
  'ore': Resource.Stone,
  'sheep': Resource.Sheep,
  'wheat': Resource.Wheat,
  'desert': Resource.Desert
};

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

  loadFromData(data: BoardData) {
    // Update tiles
    data.tiles.forEach(tileData => {
      const hexId = `${tileData.coordinates.q},${tileData.coordinates.r},${tileData.coordinates.s}`;
      const tile = this.tiles[hexId];
      if (tile && tile.getTileType() === TileType.TILE) {
        const gameTile = tile as Tile;
        const resource = resourceMap[tileData.resource.toLowerCase()];
        if (resource !== undefined) {
          gameTile.setResource(resource);
        }
        if (tileData.number !== null) {
          gameTile.setDiceNumber(tileData.number);
        }
      }
    });

    // Update vertices (buildings)
    Object.entries(data.vertices).forEach(([_, vertexData]) => {
      if (vertexData.building) {
        const coords = vertexData.coordinates[0];
        const hexId = `${coords[0]},${coords[1]},${coords[2]}`;
        const tile = this.tiles[hexId];
        if (tile) {
          const player = new Player(vertexData.building.player_id, vertexData.building.player_color || '');
          if (vertexData.building.type === 'SETTLEMENT') {
            this.placeSettlement(hexId, TileCornerDir.N, player, true);
          } else if (vertexData.building.type === 'CITY') {
            this.placeCity(hexId, TileCornerDir.N, player);
          }
        }
      }
    });

    // Update edges (roads)
    Object.entries(data.edges).forEach(([_, edgeData]) => {
      if (edgeData.road) {
        const coords = edgeData.coordinates[0];
        const hexId = `${coords[0]},${coords[1]},${coords[2]}`;
        const tile = this.tiles[hexId];
        if (tile) {
          const player = new Player(edgeData.road.player_id, edgeData.road.player_color || '');
          this.placeRoad(hexId, TileEdgeDir.NE, player);
        }
      }
    });
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
