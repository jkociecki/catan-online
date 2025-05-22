// frontend/src/engine/tile.ts
import { Corner } from "./corner";
import { Edge } from "./edge";
import { Resource } from "./types";

export enum TileType {
  TILE = 1,
  OFFSET,
}

export abstract class BaseTile {
  /* 
    Note to self: Each tile will store
    - 6 corners (N, NE, SE, S, SW, NW) 
    - 6 edges (NE, E, SE, SW, W, NW)
    Updated to match hexagonal geometry properly
  */
  protected corners: Corner[];
  protected edges: Edge[];

  constructor(public tileId: string, protected type: TileType) {
    this.corners = this.initCorners();
    this.edges = this.initEdges();

    // DEBUG: Log ile narożników utworzono
    console.log(
      `Tile ${tileId} initialized with ${this.corners.length} corners and ${this.edges.length} edges`
    );
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
    // ✅ POPRAWKA: Każdy kafelek heksagonalny ma 6 narożników
    // Kolejność zgodna z backendem: 0=N, 1=NE, 2=SE, 3=S, 4=SW, 5=NW
    console.log("Creating 6 corners for hexagonal tile");
    return [
      new Corner(), // 0: North
      new Corner(), // 1: North-East
      new Corner(), // 2: South-East
      new Corner(), // 3: South
      new Corner(), // 4: South-West
      new Corner(), // 5: North-West
    ];
  }

  private initEdges(): Edge[] {
    // ✅ POPRAWKA: Każdy kafelek heksagonalny ma 6 krawędzi
    // Kolejność zgodna z backendem: 0=NE, 1=E, 2=SE, 3=SW, 4=W, 5=NW
    console.log("Creating 6 edges for hexagonal tile");
    return [
      new Edge(), // 0: NE edge (North -> North-East)
      new Edge(), // 1: E edge (North-East -> South-East)
      new Edge(), // 2: SE edge (South-East -> South)
      new Edge(), // 3: SW edge (South -> South-West)
      new Edge(), // 4: W edge (South-West -> North-West)
      new Edge(), // 5: NW edge (North-West -> North)
    ];
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
