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
import { Tile, TileType, BaseTile } from './tile';
import { Corner } from './corner';
import { Edge } from './edge';

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
    
    // Inicjalizacja wierzchołków dla narożników i krawędzi
    this.initCornerVertices();
    this.initEdgeVertices();
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
    console.log("Server vertices data received:", data.vertices);
    Object.entries(data.vertices).forEach(([key, vertexData]) => {
      if (vertexData?.building) {
        console.log("Processing vertex with building:", vertexData);
        const buildingCoords = vertexData.coordinates.map((c: number[]) => c.join(',')); // Get coordinates as strings

        // Try to find the corresponding corner on the client-side board
        let foundCorner: Corner | undefined;
        let foundTile: BaseTile | undefined;

        // Iterate through all tiles and their corners to find a match
        for (const tileId in this.tiles) {
          const tile = this.tiles[tileId];
          const corners = tile.getCorners();

          foundCorner = corners.find(corner => {
            // Compare the set of vertices. Sort them to make comparison order-independent.
            const cornerVerticesSorted = corner.getVertices().map(v => v.split(',').map(Number).sort().join(',')).sort().join('|');
            const buildingVerticesSorted = buildingCoords.map((v: string) => v.split(',').map(Number).sort().join(',')).sort().join('|');

            return cornerVerticesSorted === buildingVerticesSorted;
          });

          if (foundCorner) {
            foundTile = tile;
            break; // Found the corner, exit the tile loop
          }
        }

        if (foundCorner && foundTile) {
           console.log("Found matching corner and tile for building:", foundCorner, foundTile);
          const player = new Player(vertexData.building.player_id, vertexData.building.player_color || '');

          // Determine the correct TileCornerDir based on the found corner's index within the tile
          const cornerIndex = foundTile.getCorners().indexOf(foundCorner);
          let cornerDir: TileCornerDir | undefined;

          // Assuming the order of corners in tile.getCorners() is consistent (e.g., N, S)
          if (cornerIndex === 0) { // Assuming index 0 is North
              cornerDir = TileCornerDir.N;
          } else if (cornerIndex === 1) { // Assuming index 1 is South
              cornerDir = TileCornerDir.S;
          }
          // Add more cases if there are more than 2 corners per tile type

          if (cornerDir !== undefined) {
              if (vertexData.building.type === 'SETTLEMENT') {
                 console.log("Placing settlement at found corner using dir:", foundCorner, cornerDir);
                // In setup phase, road check is bypassed, so this should be fine.
                this.placeSettlement(foundTile.tileId, cornerDir, player, true);

              } else if (vertexData.building.type === 'CITY') {
                 console.log("Placing city at found corner using dir:", foundCorner, cornerDir);
                 this.placeCity(foundTile.tileId, cornerDir, player);
              }
          } else {
               console.error("Could not determine TileCornerDir for found corner.", foundCorner, foundTile);
          }

        } else {
          console.error("Could not find a matching corner for server vertex data:", vertexData);
        }
      }
    });

    // Update edges (roads)
    console.log("Server edge data received:", data.edges);
    Object.entries(data.edges).forEach(([key, edgeData]) => {
      if (edgeData?.road) {
        console.log("Processing edge with road:", edgeData);
        const edgeCoords = edgeData.coordinates.map((c: number[]) => c.join(',')); // Get coordinates as strings

        // Try to find the corresponding edge on the client-side board
        let foundEdge: Edge | undefined;
        let foundEdgeTile: BaseTile | undefined;

        for (const tileId in this.tiles) {
          const tile = this.tiles[tileId];
          const edges = tile.getEdges();

          foundEdge = edges.find(edge => {
             // Compare the set of vertices. Sort them to make comparison order-independent.
             const edgeVerticesSorted = edge.getVertices().map(v => v.split(',').map(Number).sort().join(',')).sort().join('|');
             const buildingVerticesSorted = edgeCoords.map((v: string) => v.split(',').map(Number).sort().join(',')).sort().join('|');

             return edgeVerticesSorted === buildingVerticesSorted;
          });

          if(foundEdge) {
             foundEdgeTile = tile;
             break; // Found the edge, exit the loop
          }
        }

        if (foundEdge && foundEdgeTile) {
            console.log("Found matching edge and tile for road:", foundEdge, foundEdgeTile);
            const player = new Player(edgeData.road.player_id, edgeData.road.player_color || '');

            // Determine the correct TileEdgeDir based on the found edge's index within the tile
            const edgeIndex = foundEdgeTile.getEdges().indexOf(foundEdge);
            let edgeDir: TileEdgeDir | undefined;

            // Assuming the order of edges in tile.getEdges() is consistent (e.g., NE, NW, W)
            if (edgeIndex === 0) { // Assuming index 0 is NE
                 edgeDir = TileEdgeDir.NE;
            } else if (edgeIndex === 1) { // Assuming index 1 is NW
                 edgeDir = TileEdgeDir.NW;
            } else if (edgeIndex === 2) { // Assuming index 2 is W
                 edgeDir = TileEdgeDir.W;
            }
            // Add more cases if there are more edge directions

            if(edgeDir !== undefined) {
               console.log("Placing road at found edge using dir:", foundEdge, edgeDir);
               this.placeRoad(foundEdgeTile.tileId, edgeDir, player);
            } else {
               console.error("Could not determine TileEdgeDir for found edge.", foundEdge, foundEdgeTile);
            }

        } else {
           console.error("Could not find a matching edge for server edge data:", edgeData);
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

// Enhanced vertex initialization for corners
initCornerVertices() {
  // First collect all tile vertices
  const cornerVerticesMap = new Map();
  
  // For each tile, assign vertices to its corners
  Object.entries(this.tiles).forEach(([tileId, tile]) => {
    const corners = tile.getCorners();
    const tileCoords = tileId.split(',').map(Number);
    
    if (tileCoords.length === 3) {
      const [q, r, s] = tileCoords;
      
      // North corner (index 0)
      const northCorner = corners[0];
      const northVertices = new Set();
      northVertices.add(tileId);
      northVertices.add(`${q+1},${r-1},${s}`);
      northVertices.add(`${q+1},${r},${s-1}`);
      
      if (!cornerVerticesMap.has(northCorner)) {
        cornerVerticesMap.set(northCorner, northVertices);
      } else {
        const existingVertices = cornerVerticesMap.get(northCorner);
        northVertices.forEach(v => existingVertices.add(v));
      }
      
      // South corner (index 1)
      const southCorner = corners[1];
      const southVertices = new Set();
      southVertices.add(tileId);
      southVertices.add(`${q},${r+1},${s-1}`);
      southVertices.add(`${q-1},${r+1},${s}`);
      
      if (!cornerVerticesMap.has(southCorner)) {
        cornerVerticesMap.set(southCorner, southVertices);
      } else {
        const existingVertices = cornerVerticesMap.get(southCorner);
        southVertices.forEach(v => existingVertices.add(v));
      }
    }
  });
  
  // Now assign all vertices to corners
  cornerVerticesMap.forEach((vertices, corner) => {
    vertices.forEach((vertex: string) => {
      corner.addVertex(vertex);
    });
  });
  
  // Verify that we have 3 vertices for each corner
  cornerVerticesMap.forEach((vertices, corner) => {
    const verticesArray = Array.from(vertices);
    console.debug(`Corner has ${verticesArray.length} vertices: ${verticesArray}`);
  });
}

private initEdgeVertices(): void {
  // Map to store edges and their calculated vertices
  const edgeVerticesMap = new Map();
  
  // First pass - add the tile ID vertex to each edge
  Object.entries(this.tiles).forEach(([tileId, tile]) => {
    const edges = tile.getEdges();
    edges.forEach((edge, index) => {
      // Add the tile ID as a vertex
      edge.addVertex(tileId);
      
      // Store the edge in map for second pass
      const key = `${tileId}-${index}`;
      edgeVerticesMap.set(key, edge);
    });
  });
  
  // Second pass - add the second vertex for each edge
  edgeVerticesMap.forEach((edge, key) => {
    const [tileId, indexStr] = key.split('-');
    const index = parseInt(indexStr);
    const coords = tileId.split(',').map(Number);
    
    if (coords.length === 3) {
      const [q, r, s] = coords;
      
      // Add second vertex based on edge direction
      switch(index) {
        case 0: // NE edge
          edge.addVertex(`${q+1},${r-1},${s}`);
          break;
        case 1: // NW edge
          edge.addVertex(`${q},${r-1},${s+1}`);
          break;
        case 2: // W edge
          edge.addVertex(`${q-1},${r},${s+1}`);
          break;
      }
    }
  });
  
  // Log verification
  // edgeVerticesMap.forEach((edge, key) => {
  //   const vertices = edge.getVertices();
  //   console.log(`Edge ${key} has ${vertices.length} vertices:`, vertices);
  // });
}

// Zaktualizowany konstruktor klasy Board

}
