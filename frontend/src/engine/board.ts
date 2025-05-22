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

  constructor(public size: number, config?: BasicGameConfig) {
    this.hexagons = GridGenerator.hexagon(size); // +1 for the overflow ring
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
    this.updateTilesFromData(data);

    // Update vertices (buildings)
    this.updateVerticesFromData(data);

    // Update edges (roads)
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

  // frontend/src/engine/board.ts - Zamień całą metodę updateVerticesFromData

  private updateVerticesFromData(data: BoardData): void {
    console.log("Server vertices data received:", data.vertices);

    Object.entries(data.vertices).forEach(([key, vertexData]) => {
      if (vertexData?.building) {
        console.log("=== PROCESSING VERTEX WITH BUILDING ===");
        console.log("Vertex coordinates from server:", vertexData.coordinates);
        console.log("Building type:", vertexData.building.type);

        // Przekształć współrzędne z tablicy liczb na tablicę stringów
        const buildingCoords = vertexData.coordinates.map((c: number[]) =>
          c.join(",")
        );
        console.log("Server says vertex belongs to tiles:", buildingCoords);

        // ===== NOWA LOGIKA: PREFERUJ KLIKNIĘTY TILE =====

        let foundMatch = false;
        let chosenTile: BaseTile | null = null;
        let chosenTileId = "";
        let chosenCornerIndex = -1;

        // 1. NAJPIERW SPRAWDŹ CZY MOŻEMY UŻYĆ DOKŁADNIE KLIKNIĘTEGO TILE
        const lastClickedTile = this.getLastClickedTile(); // Pobierz z localStorage/sessionStorage
        if (lastClickedTile && buildingCoords.includes(lastClickedTile)) {
          console.log(
            `🎯 PRIORITY: Trying to use clicked tile ${lastClickedTile}`
          );

          const tile = this.tiles[lastClickedTile];
          if (tile) {
            const corners = tile.getCorners();

            // Sprawdź wszystkie corners tego tile
            for (
              let cornerIndex = 0;
              cornerIndex < corners.length;
              cornerIndex++
            ) {
              const corner = corners[cornerIndex];

              if (this.cornerMatchesServerVertex(corner, buildingCoords)) {
                console.log(
                  `✅ EXACT MATCH: Using clicked tile ${lastClickedTile}, corner ${cornerIndex}`
                );
                chosenTile = tile;
                chosenTileId = lastClickedTile;
                chosenCornerIndex = cornerIndex;
                foundMatch = true;
                break;
              }
            }
          }
        }

        // 2. JEŚLI NIE ZNALEŹLIŚMY DOKŁADNEGO MATCHA, UŻYJ FALLBACK
        if (!foundMatch) {
          console.log("🔄 FALLBACK: Searching for best alternative match");

          let bestSharedPoints = 0;

          // Przeszukaj wszystkie tiles
          Object.entries(this.tiles).forEach(([tileId, tile]) => {
            const corners = tile.getCorners();

            corners.forEach((corner, cornerIndex) => {
              const sharedPoints = this.countSharedPoints(
                corner,
                buildingCoords
              );

              if (sharedPoints > 0) {
                console.log(
                  `Tile ${tileId}, corner ${cornerIndex}: ${sharedPoints} shared points`
                );

                // Wybierz najlepszy match
                if (
                  sharedPoints > bestSharedPoints ||
                  (sharedPoints === bestSharedPoints &&
                    this.isBetterTile(tileId, chosenTileId))
                ) {
                  chosenTile = tile;
                  chosenTileId = tileId;
                  chosenCornerIndex = cornerIndex;
                  bestSharedPoints = sharedPoints;
                  foundMatch = true;

                  console.log(
                    `🎯 NEW BEST: tile ${tileId}, corner ${cornerIndex}, shared: ${sharedPoints}`
                  );
                }
              }
            });
          });
        }

        // 3. ZASTOSUJ WYBRANE ROZWIĄZANIE
        if (foundMatch && chosenTile && chosenCornerIndex >= 0) {
          console.log(`🏆 FINAL CHOICE:`);
          console.log(`  Tile: ${chosenTileId}`);
          console.log(`  Corner: ${chosenCornerIndex}`);
          console.log(`  Building type: ${vertexData.building.type}`);

          const player = new Player(
            vertexData.building.player_id,
            vertexData.building.player_color || ""
          );

          // Określ kierunek narożnika
          const cornerDir =
            chosenCornerIndex === 0 ? TileCornerDir.N : TileCornerDir.S;

          // Umieść budynek na planszy
          if (vertexData.building.type === "SETTLEMENT") {
            this.placeSettlement(chosenTileId, cornerDir, player, true);
          } else if (vertexData.building.type === "CITY") {
            this.placeCity(chosenTileId, cornerDir, player, true);
          }
        } else {
          console.error(
            "❌ Could not find matching corner for server vertex data:",
            vertexData
          );
        }

        console.log("===========================================");
      }
    });
  }

  // ===== POMOCNICZE METODY =====

  private getLastClickedTile(): string | null {
    try {
      return sessionStorage.getItem("lastClickedTile");
    } catch (e) {
      return localStorage.getItem("lastClickedTile") || null;
    }
  }

  private cornerMatchesServerVertex(
    corner: Corner,
    serverTileCoords: string[]
  ): boolean {
    if (typeof (corner as any).getVertices !== "function") {
      return false;
    }

    const cornerWithVertices = corner as unknown as {
      getVertices: () => string[];
    };
    const cornerVertices = cornerWithVertices.getVertices();

    if (!cornerVertices || cornerVertices.length === 0) {
      return false;
    }

    // Sprawdź czy wszystkie server tiles są reprezentowane w corner vertices
    let matchCount = 0;
    for (const serverTile of serverTileCoords) {
      if (cornerVertices.includes(serverTile)) {
        matchCount++;
      }
    }

    // Wymagaj pełnego match (wszystkie server tiles muszą być w corner)
    return matchCount === serverTileCoords.length;
  }

  private countSharedPoints(
    corner: Corner,
    serverTileCoords: string[]
  ): number {
    if (typeof (corner as any).getVertices !== "function") {
      return 0;
    }

    const cornerWithVertices = corner as unknown as {
      getVertices: () => string[];
    };
    const cornerVertices = cornerWithVertices.getVertices();

    if (!cornerVertices) {
      return 0;
    }

    let sharedCount = 0;
    for (const serverTile of serverTileCoords) {
      if (cornerVertices.includes(serverTile)) {
        sharedCount++;
      }
    }

    return sharedCount;
  }

  private isBetterTile(currentTileId: string, bestTileId: string): boolean {
    if (!bestTileId) return true;

    const currentCoords = currentTileId.split(",").map(Number);
    const bestCoords = bestTileId.split(",").map(Number);

    const [currentQ, currentR] = currentCoords;
    const [bestQ, bestR] = bestCoords;

    // Preferuj tile z większymi współrzędnymi (prawdopodobnie kliknięty)
    return currentQ > bestQ || (currentQ === bestQ && currentR > bestR);
  }
  // ========== FUNKCJA POMOCNICZA ==========

  private isCornerPartOfServerVertex(
    tile: BaseTile,
    cornerIndex: number,
    serverTileIds: string[]
  ): boolean {
    /**
     * Sprawdza czy dany narożnik kafelka należy do wierzchołka opisanego przez backend
     * poprzez sprawdzenie czy wszystkie kafelki z listy backendu rzeczywiście mają ten wierzchołek
     */

    // Pobierz współrzędne kafelka
    const tileCoords = tile.tileId.split(",").map(Number);
    if (tileCoords.length !== 3) return false;

    const [q, r, s] = tileCoords;

    // Oblicz pozycję tego narożnika w przestrzeni heksagonalnej
    const cornerOffsets = [
      [0, -1, 1], // 0: North
      [1, -1, 0], // 1: North-East
      [1, 0, -1], // 2: South-East
      [0, 1, -1], // 3: South
      [-1, 1, 0], // 4: South-West
      [-1, 0, 1], // 5: North-West
    ];

    if (cornerIndex < 0 || cornerIndex >= cornerOffsets.length) return false;

    const [dq, dr, ds] = cornerOffsets[cornerIndex];
    const vertexPosition = [q + dq, r + dr, s + ds];

    // Sprawdź czy wszystkie kafelki z backendu rzeczywiście mają wierzchołek na tej pozycji
    let matchingTiles = 0;

    for (const serverTileId of serverTileIds) {
      const serverCoords = serverTileId.split(",").map(Number);
      if (serverCoords.length !== 3) continue;

      const [sq, sr, ss] = serverCoords;

      // Sprawdź wszystkie 6 narożników tego kafelka z backendu
      let hasMatchingVertex = false;
      for (
        let checkCornerIdx = 0;
        checkCornerIdx < cornerOffsets.length;
        checkCornerIdx++
      ) {
        const [checkDq, checkDr, checkDs] = cornerOffsets[checkCornerIdx];
        const checkVertexPos = [sq + checkDq, sr + checkDr, ss + checkDs];

        if (JSON.stringify(checkVertexPos) === JSON.stringify(vertexPosition)) {
          hasMatchingVertex = true;
          break;
        }
      }

      if (hasMatchingVertex) {
        matchingTiles++;
      }
    }

    // Vertex jest prawidłowy tylko jeśli wszystkie kafelki z backendu go mają
    const isValid = matchingTiles === serverTileIds.length;

    if (isValid) {
      console.log(
        `✅ Vertex validation: corner ${cornerIndex} at position [${vertexPosition}] matches all ${serverTileIds.length} server tiles`
      );
    } else {
      console.log(
        `❌ Vertex validation failed: only ${matchingTiles}/${serverTileIds.length} server tiles match`
      );
    }

    return isValid;
  }

  private updateEdgesFromData(data: BoardData): void {
    console.log("Server edge data received:", data.edges);

    // Pomocnicza funkcja do sprawdzania współdzielonych punktów
    const countSharedPoints = (
      vertices1: string[],
      vertices2: string[]
    ): number => {
      let sharedCount = 0;
      for (const v1 of vertices1) {
        for (const v2 of vertices2) {
          const coords1 = v1.split(",").map(Number);
          const coords2 = v2.split(",").map(Number);
          if (
            coords1[0] === coords2[0] &&
            coords1[1] === coords2[1] &&
            coords1[2] === coords2[2]
          ) {
            sharedCount++;
            break;
          }
        }
      }
      return sharedCount;
    };

    Object.entries(data.edges).forEach(([key, edgeData]) => {
      if (edgeData?.road) {
        console.log("Processing edge with road:", edgeData);

        // Przekształć współrzędne z tablicy liczb na tablicę stringów
        const roadCoords = edgeData.coordinates.map((c: number[]) =>
          c.join(",")
        );
        console.log("Road coordinates as strings:", roadCoords);

        // Znajdź odpowiednią krawędź na planszy klienta
        let foundBestMatch = false;
        let bestEdge: Edge | null = null;
        let bestTile: BaseTile | null = null;
        let bestTileId = "";
        let bestEdgeIndex = -1;
        let bestSharedPoints = 0;

        // Przeszukaj wszystkie krawędzie, szukając najlepszego dopasowania
        Object.entries(this.tiles).forEach(([tileId, tile]) => {
          const edges = tile.getEdges();

          edges.forEach((edge, edgeIndex) => {
            // Bezpieczne sprawdzenie czy edge jest właściwego typu
            if (edge && typeof (edge as any).getVertices === "function") {
              // Jawne rzutowanie na typ z getVertices
              const edgeWithVertices = edge as unknown as {
                getVertices: () => string[];
              };
              const edgeVertices = edgeWithVertices.getVertices();

              // Jeśli krawędź ma wierzchołki
              if (edgeVertices && edgeVertices.length > 0) {
                // Sprawdź ile punktów jest współdzielonych
                const sharedPoints = countSharedPoints(
                  edgeVertices,
                  roadCoords
                );

                // Wyloguj dla celów debugowania
                if (sharedPoints > 0) {
                  console.log(
                    `Edge at tile ${tileId}, index ${edgeIndex} shares ${sharedPoints} points:`,
                    {
                      edgeVertices,
                      roadCoords,
                    }
                  );
                }

                // Jeśli mamy lepsze dopasowanie niż dotychczas
                if (
                  sharedPoints > 0 &&
                  (!foundBestMatch || sharedPoints > bestSharedPoints)
                ) {
                  foundBestMatch = true;
                  bestEdge = edge;
                  bestTile = tile;
                  bestTileId = tileId;
                  bestEdgeIndex = edgeIndex;
                  bestSharedPoints = sharedPoints;
                }
              }
            }
          });
        });

        // Jeśli znaleźliśmy dopasowanie
        if (foundBestMatch && bestEdge && bestTile) {
          // Bezpieczne wyświetlenie informacji o wierzchołkach
          let edgeVertices: string[] = [];
          if (typeof (bestEdge as any).getVertices === "function") {
            const edgeWithVertices = bestEdge as unknown as {
              getVertices: () => string[];
            };
            edgeVertices = edgeWithVertices.getVertices();
          }

          console.log("Found best matching edge:", {
            tileId: bestTileId,
            edgeIndex: bestEdgeIndex,
            sharedPoints: bestSharedPoints,
            edgeVertices: edgeVertices,
          });

          const player = new Player(
            edgeData.road.player_id,
            edgeData.road.player_color || ""
          );

          // Określ kierunek krawędzi (NE, NW lub W)
          let edgeDir: TileEdgeDir;
          if (bestEdgeIndex === 0) {
            edgeDir = TileEdgeDir.NE;
          } else if (bestEdgeIndex === 1) {
            edgeDir = TileEdgeDir.NW;
          } else {
            edgeDir = TileEdgeDir.W;
          }

          // Umieść drogę na planszy
          console.log("Placing road at found edge using dir:", edgeDir);
          this.placeRoad(bestTileId, edgeDir, player, true);
        } else {
          console.error(
            "Could not find a matching edge for server edge data:",
            edgeData
          );
        }
      }
    });
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
