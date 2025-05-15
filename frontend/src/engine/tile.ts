import { Corner } from './corner';
import { Edge } from './edge';
import { Resource } from './types';

export enum TileType {
  TILE = 1,
  OFFSET
}

export abstract class BaseTile {
  /* 
    Note to self: Each tile will store
    - 2 corners (N, S)
    - 3 edges (NE, NW, W)
    The corners and edges that fall outside of boundaries
    will be stored in the "offset tiles" in Board.
  */
  protected corners: Corner[];
  protected edges: Edge[];

  constructor(public tileId: string, protected type: TileType) {
    this.corners = this.initCorners();
    this.edges = this.initEdges();
  }

  getTileType() {
    return this.type;
  }

  getCorners() {
    return this.corners;
  }

  getEdges() {
    return this.edges;
  }

  private initCorners(): Corner[] {
    return [new Corner(), new Corner()];
  }

  private initEdges(): Edge[] {
    return [new Edge(), new Edge(), new Edge()];
  }
}

/**
 * Defines the special type of tile to wrap around the board, to store
 * offset corners and edges.
 */
export class OffsetTile extends BaseTile {
  constructor(public tileId: string) {
    super(tileId, TileType.OFFSET);
  }
}

/**
 * Da tile.
 */
export class Tile extends BaseTile {
  private resource: Resource | undefined;
  private diceNumber: number | undefined;
  private hasRobber: boolean;
  // Following structure from
  // https://www.redblobgames.com/grids/parts/#hexagons

  constructor(public tileId: string) {
    super(tileId, TileType.TILE);
    this.hasRobber = false;
  }

  setResource(r: Resource) {
    this.resource = r;
  }

  getResource() {
    return this.resource;
  }

  setDiceNumber(n: number) {
    this.diceNumber = n;
  }

  getDiceNumber() {
    return this.diceNumber;
  }

  didMatchDice(diceNumber: number): boolean {
    return diceNumber === this.diceNumber;
  }
}
