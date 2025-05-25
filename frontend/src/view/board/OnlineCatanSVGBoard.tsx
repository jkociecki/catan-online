// frontend/src/view/board/OnlineCatanSVGBoard.tsx
import React, { useState, useCallback, useEffect } from "react";
import styled from "styled-components";

interface OnlineCatanSVGBoardProps {
  onVertexClick?: (vertexId: number) => void;
  onEdgeClick?: (edgeId: number) => void;
  buildMode?: "settlement" | "road" | "city" | null;
  gameState?: any;
  myPlayerId?: string;
  myColor?: string;
  isMyTurn?: boolean; // ZMIENIONE Z FUNKCJI NA BOOLEAN
  gamePhase?: string;
}

const BoardContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
`;

const BoardSVG = styled.svg`
  /* Czyste SVG bez tła i obramowania */
`;

const Hexagon = styled.polygon<{ resource?: string }>`
  fill: ${(props) => getResourceColor(props.resource || "")};
  stroke: #654321;
  stroke-width: 2;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    opacity: 0.8;
    stroke-width: 3;
  }
`;

const Vertex = styled.circle<{
  active?: boolean;
  hasSettlement?: boolean;
  playerColor?: string;
}>`
  pointer-events: all;
  fill: ${(props) => {
    if (props.hasSettlement) return props.playerColor || "#4CAF50";
    if (props.active) return "rgba(76, 175, 80, 0.3)";
    return "rgba(255, 255, 255, 0.8)";
  }};
  stroke: #333;
  stroke-width: ${(props) => (props.hasSettlement ? 3 : 2)};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    fill: ${(props) => {
      if (props.hasSettlement) return props.playerColor || "#45a049";
      if (props.active) return "rgba(76, 175, 80, 0.6)";
      return "#DDD";
    }};
    r: ${(props) => (props.hasSettlement ? 12 : 10)};
  }
`;

const Edge = styled.line<{
  active?: boolean;
  hasRoad?: boolean;
  playerColor?: string;
}>`
  stroke: ${(props) => {
    if (props.hasRoad) return props.playerColor || "#2196F3";
    if (props.active) return "rgba(33, 150, 243, 0.3)";
    return "rgba(102, 102, 102, 0.6)";
  }};
  stroke-width: ${(props) => {
    if (props.hasRoad) return 8;
    if (props.active) return 6;
    return 4;
  }};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    stroke: ${(props) => {
      if (props.hasRoad) return props.playerColor || "#1976D2";
      if (props.active) return "rgba(33, 150, 243, 0.8)";
      return "#888";
    }};
    stroke-width: ${(props) => (props.hasRoad ? 10 : 8)};
  }
`;

const NumberToken = styled.circle<{ isRed?: boolean }>`
  fill: ${(props) => (props.isRed ? "#DC143C" : "#F5DEB3")};
  stroke: #8b4513;
  stroke-width: 2;
  filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.3));
`;

const NumberText = styled.text<{ isRed?: boolean }>`
  fill: ${(props) => (props.isRed ? "white" : "#8B4513")};
  font-size: 16px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: central;
  pointer-events: none;
`;

const ResourceText = styled.text`
  fill: white;
  font-size: 10px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: central;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
  pointer-events: none;
`;

const VertexLabel = styled.text<{ hasSettlement?: boolean }>`
  fill: ${(props) => (props.hasSettlement ? "white" : "#333")};
  font-size: 8px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: central;
  pointer-events: none;
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5);
`;

// Debug info
const DebugInfo = styled.div`
  margin-top: 10px;
  padding: 10px;
  background: #f0f0f0;
  border-radius: 5px;
  font-family: monospace;
  font-size: 12px;
`;

// Funkcja do kolorów zasobów
const getResourceColor = (resource: string): string => {
  const colors: Record<string, string> = {
    wood: "#228B22",
    brick: "#CD853F",
    sheep: "#98FB98",
    wheat: "#FFD700",
    ore: "#708090",
    desert: "#F4A460",
  };
  return colors[resource.toLowerCase()] || "#DDD";
};

const getVertexIdForHexAndIndex = (
  hexIndex: number,
  vertexIndex: number
): number => {
  // KLUCZOWE: Musi być zgodne z backendem!
  // Backend używa: vertex_id = hexIndex * 6 + vertexIndex
  // ALE hexIndex musi być w tej samej kolejności co hex_order_frontend w backend!

  // hexData jest w tej samej kolejności co hex_order_frontend w backend
  return hexIndex * 6 + vertexIndex;
};

const getEdgeIdForHexAndIndex = (
  hexIndex: number,
  edgeIndex: number
): number => {
  // Analogicznie dla krawędzi
  return hexIndex * 6 + edgeIndex;
};

// Definicja planszy - dokładnie taka sama jak w backend
const hexData = [
  { q: 0, r: 0, s: 0, resource: "desert", number: 0 },
  { q: 0, r: -2, s: 2, resource: "wood", number: 6 },
  { q: 1, r: -2, s: 1, resource: "sheep", number: 3 },
  { q: 2, r: -2, s: 0, resource: "sheep", number: 8 },
  { q: -1, r: -1, s: 2, resource: "wheat", number: 2 },
  { q: 0, r: -1, s: 1, resource: "ore", number: 4 },
  { q: 1, r: -1, s: 0, resource: "wheat", number: 5 },
  { q: 2, r: -1, s: -1, resource: "wood", number: 10 },
  { q: -2, r: 0, s: 2, resource: "wood", number: 5 },
  { q: -1, r: 0, s: 1, resource: "brick", number: 9 },
  { q: 1, r: 0, s: -1, resource: "ore", number: 6 },
  { q: 2, r: 0, s: -2, resource: "wheat", number: 9 },
  { q: -2, r: 1, s: 1, resource: "wheat", number: 10 },
  { q: -1, r: 1, s: 0, resource: "ore", number: 11 },
  { q: 0, r: 1, s: -1, resource: "wood", number: 3 },
  { q: 1, r: 1, s: -2, resource: "sheep", number: 12 },
  { q: -2, r: 2, s: 0, resource: "brick", number: 8 },
  { q: -1, r: 2, s: -1, resource: "sheep", number: 4 },
  { q: 0, r: 2, s: -2, resource: "brick", number: 11 },
];

const OnlineCatanSVGBoard: React.FC<OnlineCatanSVGBoardProps> = ({
  onVertexClick,
  onEdgeClick,
  buildMode = null,
  gameState,
  myPlayerId,
  myColor = "red",
  isMyTurn = false, // ZMIENIONE Z FUNKCJI NA BOOLEAN
}) => {
  const [builtSettlements, setBuiltSettlements] = useState<
    Map<number, { playerId: string; color: string }>
  >(new Map());
  const [builtRoads, setBuiltRoads] = useState<
    Map<number, { playerId: string; color: string }>
  >(new Map());

  // DODANE: Debug state
  const [debugInfo, setDebugInfo] = useState<string>("");

  // Funkcja do konwersji współrzędnych hex na pozycję ekranu
  const hexToPixel = useCallback((q: number, r: number, size: number = 50) => {
    const x = size * ((3 / 2) * q);
    const y = size * ((Math.sqrt(3) / 2) * q + Math.sqrt(3) * r);
    return { x: x + 400, y: y + 300 };
  }, []);

  // Funkcje do tworzenia wierzchołków i krawędzi heksagonu
  const getHexagonVertices = useCallback(
    (centerX: number, centerY: number, size: number = 50) => {
      const vertices = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const x = centerX + size * Math.cos(angle);
        const y = centerY + size * Math.sin(angle);
        vertices.push({ x, y });
      }
      return vertices;
    },
    []
  );

  const getHexagonEdges = useCallback(
    (centerX: number, centerY: number, size: number = 50) => {
      const vertices = getHexagonVertices(centerX, centerY, size);
      const edges = [];
      for (let i = 0; i < 6; i++) {
        const start = vertices[i];
        const end = vertices[(i + 1) % 6];
        edges.push({
          x1: start.x,
          y1: start.y,
          x2: end.x,
          y2: end.y,
        });
      }
      return edges;
    },
    [getHexagonVertices]
  );

  // Ładowanie stanu gry z gameState prop
  useEffect(() => {
    if (gameState) {
      console.log("Loading game state:", gameState);

      // Wierzchołki (osady/miasta)
      const newSettlements = new Map();
      if (gameState.vertices) {
        Object.entries(gameState.vertices).forEach(
          ([vertexId, vertexData]: [string, any]) => {
            newSettlements.set(parseInt(vertexId), {
              playerId: vertexData.player_id,
              color: getPlayerColor(vertexData.player_id),
            });
          }
        );
      }
      setBuiltSettlements(newSettlements);

      // Krawędzie (drogi)
      const newRoads = new Map();
      if (gameState.edges) {
        Object.entries(gameState.edges).forEach(
          ([edgeId, edgeData]: [string, any]) => {
            newRoads.set(parseInt(edgeId), {
              playerId: edgeData.player_id,
              color: getPlayerColor(edgeData.player_id),
            });
          }
        );
      }
      setBuiltRoads(newRoads);
    }
  }, [gameState]);

  // Pomocnicza funkcja do pobierania koloru gracza
  const getPlayerColor = (playerId: string): string => {
    if (!gameState?.players) return "#333";

    const playerData = Object.values(gameState.players).find(
      (p: any) => p.player_id === playerId
    );
    return (playerData as any)?.color || "#333";
  };

  const handleVertexClick = useCallback(
    (vertexId: number) => {
      console.log("Vertex click attempt:", {
        vertexId,
        isMyTurn,
        buildMode,
        myPlayerId,
      });

      setDebugInfo(
        `Vertex ${vertexId} clicked - MyTurn: ${isMyTurn}, Mode: ${buildMode}`
      );

      if (!isMyTurn || buildMode !== "settlement") {
        console.log("Click rejected - not my turn or wrong build mode");
        return;
      }

      console.log("Vertex clicked:", vertexId);
      if (onVertexClick) {
        onVertexClick(vertexId);
      }
    },
    [isMyTurn, buildMode, onVertexClick, myPlayerId]
  );

  const handleEdgeClick = useCallback(
    (edgeId: number) => {
      console.log("Edge click attempt:", {
        edgeId,
        isMyTurn,
        buildMode,
        myPlayerId,
      });

      setDebugInfo(
        `Edge ${edgeId} clicked - MyTurn: ${isMyTurn}, Mode: ${buildMode}`
      );

      if (!isMyTurn || buildMode !== "road") {
        console.log("Click rejected - not my turn or wrong build mode");
        return;
      }

      console.log("Edge clicked:", edgeId);
      if (onEdgeClick) {
        onEdgeClick(edgeId);
      }
    },
    [isMyTurn, buildMode, onEdgeClick, myPlayerId]
  );

  return (
    <BoardContainer>
      <BoardSVG width={800} height={600} viewBox="0 0 800 600">
        {hexData.map((hex, hexIndex) => {
          const { x, y } = hexToPixel(hex.q, hex.r);
          const vertices = getHexagonVertices(x, y);
          const edges = getHexagonEdges(x, y);
          const isRedNumber = hex.number === 6 || hex.number === 8;

          return (
            <g key={hexIndex}>
              {/* Heksagon */}
              <Hexagon
                points={vertices.map((v) => `${v.x},${v.y}`).join(" ")}
                resource={hex.resource}
              />

              {/* Tekst zasobu */}
              <ResourceText x={x} y={y - 12}>
                {hex.resource.toUpperCase()}
              </ResourceText>

              {/* Token z numerem */}
              {hex.number > 0 && (
                <>
                  <NumberToken cx={x} cy={y + 8} r="20" isRed={isRedNumber} />
                  <NumberText x={x} y={y + 8} isRed={isRedNumber}>
                    {hex.number}
                  </NumberText>
                </>
              )}

              {/* Wierzchołki (dla domków) */}
              {vertices.map((vertex, vertexIndex) => {
                // const globalVertexId = hexIndex * 6 + vertexIndex;
                const globalVertexId = getVertexIdForHexAndIndex(
                  hexIndex,
                  vertexIndex
                );

                const settlement = builtSettlements.get(globalVertexId);
                const hasSettlement = !!settlement;

                return (
                  <g key={`vertex-${globalVertexId}`}>
                    <Vertex
                      cx={vertex.x}
                      cy={vertex.y}
                      r={hasSettlement ? 10 : 8}
                      active={buildMode === "settlement" && isMyTurn}
                      hasSettlement={hasSettlement}
                      playerColor={settlement?.color}
                      onClick={() => handleVertexClick(globalVertexId)}
                    />
                    <VertexLabel
                      x={vertex.x}
                      y={vertex.y}
                      hasSettlement={hasSettlement}
                    >
                      {globalVertexId}
                    </VertexLabel>
                  </g>
                );
              })}

              {/* Krawędzie (dla dróg) */}
              {edges.map((edge, edgeIndex) => {
                // const globalEdgeId = hexIndex * 6 + edgeIndex;
                const globalEdgeId = getEdgeIdForHexAndIndex(
                  hexIndex,
                  edgeIndex
                );

                const road = builtRoads.get(globalEdgeId);
                const hasRoad = !!road;
                // W OnlineCatanSVGBoard, dodaj to PRZED return:
                console.log("Frontend hexData order:");
                hexData.forEach((hex, i) => {
                  console.log(
                    `${i}: (${hex.q}, ${hex.r}, ${hex.s}) - ${hex.resource}`
                  );
                });

                return (
                  <g key={`edge-${globalEdgeId}`}>
                    <Edge
                      x1={edge.x1}
                      y1={edge.y1}
                      x2={edge.x2}
                      y2={edge.y2}
                      active={buildMode === "road" && isMyTurn}
                      hasRoad={hasRoad}
                      playerColor={road?.color}
                      onClick={() => handleEdgeClick(globalEdgeId)}
                    />
                  </g>
                );
              })}
            </g>
          );
        })}
      </BoardSVG>

      {/* Debug info */}
      <DebugInfo>
        <div>
          <strong>Debug Info:</strong>
        </div>
        <div>My Turn: {isMyTurn ? "YES" : "NO"}</div>
        <div>Build Mode: {buildMode || "None"}</div>
        <div>My Player ID: {myPlayerId || "None"}</div>
        <div>Last Action: {debugInfo || "None"}</div>
        <div>Settlements: {builtSettlements.size}</div>
        <div>Roads: {builtRoads.size}</div>
      </DebugInfo>
    </BoardContainer>
  );
};

export default OnlineCatanSVGBoard;
