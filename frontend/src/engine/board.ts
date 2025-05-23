import { GridGenerator, HexUtils } from "react-hexgrid";
import { initTiles, Tiles } from "./boardHelpers";
import { Player } from "./player";
import {
  getCorner,
  getEdge,
  TileCornerDir,
  TileEdgeDir,
  assertPlaceRoad,
  assertPlaceSettlement,
  assertPlaceCity,
} from "./tileHelpers";
import { Hex, Resource } from "./types";
import { BasicGameConfig } from "../game/config";
import { BoardData } from "./board/BoardService";
import { Tile, TileType, BaseTile } from "./tile";
import { Corner } from "./corner";
import { Edge } from "./edge";

const resourceMap: { [key: string]: Resource } = {
  wood: Resource.Wood,
  brick: Resource.Clay,
  ore: Resource.Stone,
  sheep: Resource.Sheep,
  wheat: Resource.Wheat,
  desert: Resource.Desert,
};

export class Board {
  private hexagons: Hex[];
  private tiles: Tiles;

  // NOWE: Mapowanie ID -> Corner/Edge
  private vertexIdToCorner: Map<
    number,
    { corner: Corner; tile: BaseTile; cornerIndex: number }
  > = new Map();
  private edgeIdToEdge: Map<
    number,
    { edge: Edge; tile: BaseTile; edgeIndex: number }
  > = new Map();

  constructor(public size: number, config?: BasicGameConfig) {
    this.hexagons = GridGenerator.hexagon(size);
    this.tiles = initTiles(this.hexagons, size, config);

    // Inicjalizacja wierzchołków dla narożników i krawędzi
    this.initCornerVertices();
    this.initEdgeVertices();

    // NOWE: Inicjalizacja mapowania ID
    this.initVertexMapping();
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

  // NOWE METODY DLA VERTEX_ID/EDGE_ID
  private initVertexMapping() {
    console.log("=== INITIALIZING VERTEX MAPPING ===");

    // Mapa do śledzenia unikalnych wierzchołków
    const uniqueCorners = new Map<Corner, number>();
    const uniqueEdges = new Map<Edge, number>();

    let vertexId = 0;
    let edgeId = 0;

    // Pierwsza faza: znajdź wszystkie unikalne corners
    Object.entries(this.tiles).forEach(([tileId, tile]) => {
      if (tile.getTileType() === TileType.TILE) {
        const corners = tile.getCorners();

        corners.forEach((corner, cornerIndex) => {
          // Sprawdź czy ten corner już ma przypisane ID
          if (!uniqueCorners.has(corner)) {
            uniqueCorners.set(corner, vertexId);
            this.vertexIdToCorner.set(vertexId, {
              corner,
              tile,
              cornerIndex,
            });
            console.log(
              `✅ Mapped unique vertex_id ${vertexId} to tile ${tileId}, corner ${cornerIndex}`
            );

            vertexId++;
          } else {
            const existingId = uniqueCorners.get(corner);
            console.log(
              `♻️  Corner ${cornerIndex} in tile ${tileId} already mapped as vertex_id ${existingId}`
            );
          }
        });
      }
    });
    console.log(`=== VERTEX MAPPING COMPLETE ===`);
    console.log(`Total unique vertices: ${uniqueCorners.size}`);
    console.log(`Total vertex_id mappings: ${this.vertexIdToCorner.size}`);
    console.log(`Should match backend count: 37`);

    // Druga faza: znajdź wszystkie unikalne edges
    Object.entries(this.tiles).forEach(([tileId, tile]) => {
      if (tile.getTileType() === TileType.TILE) {
        const edges = tile.getEdges();

        edges.forEach((edge, edgeIndex) => {
          // Sprawdź czy ten edge już ma przypisane ID
          if (!uniqueEdges.has(edge)) {
            uniqueEdges.set(edge, edgeId);
            this.edgeIdToEdge.set(edgeId, {
              edge,
              tile,
              edgeIndex,
            });
            console.log(
              `Mapped unique edge_id ${edgeId} to tile ${tileId}, edge ${edgeIndex}`
            );
            edgeId++;
          }
        });
      }
    });

    console.log(
      `Total unique mapped: ${uniqueCorners.size} vertices, ${uniqueEdges.size} edges`
    );
    console.log(
      `Should match backend: vertices=${uniqueCorners.size}, edges=${uniqueEdges.size}`
    );
  }

  // Metody do pobierania Corner/Edge po ID
  getCornerByVertexId(vertex_id: number): Corner | null {
    const mapping = this.vertexIdToCorner.get(vertex_id);
    return mapping ? mapping.corner : null;
  }

  getEdgeByEdgeId(edge_id: number): Edge | null {
    const mapping = this.edgeIdToEdge.get(edge_id);
    return mapping ? mapping.edge : null;
  }

  // Metody do pobierania ID po Corner/Edge - POPRAWIONE
  getVertexIdForTileCorner(tileId: string, cornerIndex: number): number | null {
    const tile = this.tiles[tileId];
    if (!tile) {
      console.log(`❌ Tile ${tileId} not found`);
      return null;
    }

    const corner = tile.getCorners()[cornerIndex];
    if (!corner) {
      console.log(`❌ Corner ${cornerIndex} not found in tile ${tileId}`);
      return null;
    }

    // Debug: sprawdź mapowanie
    console.log(
      `🔍 Looking for vertex_id for tile ${tileId}, corner ${cornerIndex}`
    );
    console.log(`🔍 Corner object:`, corner);
    console.log(`🔍 Total mapped vertices: ${this.vertexIdToCorner.size}`);

    // Znajdź vertex_id dla tego konkretnego corner obiektu
    const entries = Array.from(this.vertexIdToCorner.entries());
    for (const [vertex_id, mapping] of entries) {
      if (mapping.corner === corner) {
        console.log(
          `✅ Found vertex_id ${vertex_id} for tile ${tileId}, corner ${cornerIndex}`
        );
        return vertex_id;
      }
    }

    console.log(
      `❌ No vertex_id found for tile ${tileId}, corner ${cornerIndex}`
    );
    console.log(
      `Available mappings:`,
      Array.from(this.vertexIdToCorner.entries()).slice(0, 5)
    );
    return null;
  }

  getEdgeIdForTileEdge(tileId: string, edgeIndex: number): number | null {
    const tile = this.tiles[tileId];
    if (!tile) return null;

    const edge = tile.getEdges()[edgeIndex];
    if (!edge) return null;

    // Znajdź edge_id dla tego konkretnego edge obiektu
    const entries = Array.from(this.edgeIdToEdge.entries());
    for (const [edge_id, mapping] of entries) {
      if (mapping.edge === edge) {
        return edge_id;
      }
    }
    return null;
  }

  loadFromData(data: BoardData) {
    // Update tiles
    this.updateTilesFromData(data);

    // Update vertices (buildings) - NOWY SPOSÓB
    this.updateVerticesFromData(data);

    // Update edges (roads) - NOWY SPOSÓB
    this.updateEdgesFromData(data);
  }

  private updateTilesFromData(data: BoardData): void {
    data.tiles.forEach((tileData) => {
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
  }

  private updateVerticesFromData(data: BoardData): void {
    console.log("=== NOWY SYSTEM: Updating vertices from data ===");

    Object.entries(data.vertices).forEach(([key, vertexData]) => {
      if (vertexData?.building && vertexData.vertex_id !== undefined) {
        console.log(
          `Processing vertex with vertex_id: ${vertexData.vertex_id}`
        );

        // Użyj vertex_id bezpośrednio
        const corner = this.getCornerByVertexId(vertexData.vertex_id);

        if (corner) {
          console.log(`✅ Found corner for vertex_id ${vertexData.vertex_id}`);

          const player = new Player(
            vertexData.building.player_id,
            vertexData.building.player_color || ""
          );

          if (vertexData.building.type === "SETTLEMENT") {
            console.log("Placing settlement using vertex_id");
            corner.placeSettlement(player);
          } else if (vertexData.building.type === "CITY") {
            console.log("Placing city using vertex_id");
            corner.placeCity(player);
          }
        } else {
          console.error(
            `❌ Could not find corner for vertex_id ${vertexData.vertex_id}`
          );
        }
      }
    });

    console.log("=== END vertex update ===");
  }

  private updateEdgesFromData(data: BoardData): void {
    console.log("=== NOWY SYSTEM: Updating edges from data ===");

    Object.entries(data.edges).forEach(([key, edgeData]) => {
      if (edgeData?.road && edgeData.edge_id !== undefined) {
        console.log(`Processing edge with edge_id: ${edgeData.edge_id}`);

        // Użyj edge_id bezpośrednio
        const edge = this.getEdgeByEdgeId(edgeData.edge_id);

        if (edge) {
          console.log(`✅ Found edge for edge_id ${edgeData.edge_id}`);

          const player = new Player(
            edgeData.road.player_id,
            edgeData.road.player_color || ""
          );

          console.log("Placing road using edge_id");
          edge.placeRoad(player);
        } else {
          console.error(
            `❌ Could not find edge for edge_id ${edgeData.edge_id}`
          );
        }
      }
    });

    console.log("=== END edge update ===");
  }

  /**
   *
   * @param tileId
   * @param dir
   * @param player
   * @param skipValidation -> Bypass the need of a road reaching the corner during initial game startup
   */
  placeSettlement(
    tileId: string,
    dir: TileCornerDir,
    player: Player,
    skipValidation = false
  ) {
    if (!skipValidation) {
      assertPlaceSettlement(this.tiles[tileId], dir, this.tiles, player, false);
    }
    const corner = getCorner(this.tiles[tileId], dir, this.tiles);
    if (corner) {
      corner.placeSettlement(player);
    }
  }

  placeCity(
    tileId: string,
    dir: TileCornerDir,
    player: Player,
    skipValidation = false
  ) {
    const corner = getCorner(this.tiles[tileId], dir, this.tiles);
    if (corner) {
      if (!skipValidation) {
        assertPlaceCity(corner, player);
      }
      corner.placeCity(player);
    }
  }

  placeRoad(
    tileId: string,
    dir: TileEdgeDir,
    player: Player,
    skipValidation = false
  ) {
    if (!skipValidation) {
      assertPlaceRoad(this.tiles[tileId], dir, this.tiles, player);
    }
    const edge = getEdge(this.tiles[tileId], dir, this.tiles);
    edge.placeRoad(player);
  }

  // Enhanced vertex initialization for corners
  private initCornerVertices() {
    // First collect all tile vertices
    const cornerVerticesMap = new Map<Corner, Set<string>>();

    // For each tile, assign vertices to its corners
    Object.entries(this.tiles).forEach(([tileId, tile]) => {
      const corners = tile.getCorners();
      const tileCoords = tileId.split(",").map(Number);

      if (tileCoords.length === 3) {
        const [q, r, s] = tileCoords;

        // North corner (index 0)
        const northCorner = corners[0];
        const northVertices = new Set<string>();
        northVertices.add(tileId);
        northVertices.add(`${q + 1},${r - 1},${s}`);
        northVertices.add(`${q + 1},${r},${s - 1}`);

        if (!cornerVerticesMap.has(northCorner)) {
          cornerVerticesMap.set(northCorner, northVertices);
        } else {
          const existingVertices = cornerVerticesMap.get(northCorner);
          if (existingVertices) {
            northVertices.forEach((v) => existingVertices.add(v));
          }
        }

        // South corner (index 1)
        const southCorner = corners[1];
        const southVertices = new Set<string>();
        southVertices.add(tileId);
        southVertices.add(`${q},${r + 1},${s - 1}`);
        southVertices.add(`${q - 1},${r + 1},${s}`);

        if (!cornerVerticesMap.has(southCorner)) {
          cornerVerticesMap.set(southCorner, southVertices);
        } else {
          const existingVertices = cornerVerticesMap.get(southCorner);
          if (existingVertices) {
            southVertices.forEach((v) => existingVertices.add(v));
          }
        }
      }
    });

    // Now assign all vertices to corners
    cornerVerticesMap.forEach((vertices, corner) => {
      // Bezpieczne wywołanie metody addVertex
      if (typeof (corner as any).addVertex === "function") {
        const cornerWithAddVertex = corner as unknown as {
          addVertex: (vertex: string) => void;
        };
        vertices.forEach((vertex: string) => {
          cornerWithAddVertex.addVertex(vertex);
        });
      }
    });

    // Verify that we have 3 vertices for each corner
    cornerVerticesMap.forEach((vertices, corner) => {
      const verticesArray = Array.from(vertices);
      console.debug(
        `Corner has ${verticesArray.length} vertices: ${verticesArray}`
      );
    });
  }

  private initEdgeVertices(): void {
    console.log("Inicjalizacja wierzchołków krawędzi...");

    // First pass - initialize all edges with their two vertices
    Object.entries(this.tiles).forEach(([tileId, tile]) => {
      const edges = tile.getEdges();
      const tileCoords = tileId.split(",").map(Number);

      if (tileCoords.length === 3) {
        const [q, r, s] = tileCoords;

        // For each edge in the tile
        edges.forEach((edge, index) => {
          // Bezpieczne wywołanie metody addVertex
          if (typeof (edge as any).addVertex === "function") {
            const edgeWithAddVertex = edge as unknown as {
              addVertex: (vertex: string) => void;
            };

            // First vertex is always the current tile
            edgeWithAddVertex.addVertex(tileId);

            // Second vertex depends on the edge direction
            switch (index) {
              case 0: // NE edge
                edgeWithAddVertex.addVertex(`${q + 1},${r - 1},${s}`);
                break;
              case 1: // NW edge
                edgeWithAddVertex.addVertex(`${q},${r - 1},${s + 1}`);
                break;
              case 2: // W edge
                edgeWithAddVertex.addVertex(`${q - 1},${r},${s + 1}`);
                break;
            }
          }
        });
      }
    });

    // Log verification for sample edges
    let sampleCount = 0;
    Object.entries(this.tiles).forEach(([tileId, tile]) => {
      if (sampleCount >= 10) return;

      const edges = tile.getEdges();
      for (const edge of edges) {
        // Bezpieczne pobranie wierzchołków
        let vertices: string[] = [];
        if (typeof (edge as any).getVertices === "function") {
          const edgeWithVertices = edge as unknown as {
            getVertices: () => string[];
          };
          vertices = edgeWithVertices.getVertices();
        }

        console.log(
          `Sample edge from tile ${tileId} has ${vertices.length} vertices:`,
          vertices
        );
        sampleCount++;
        if (sampleCount >= 10) break;
      }
    });
  }
}
