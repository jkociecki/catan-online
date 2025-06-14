// frontend/src/view/board/OnlineCatanSVGBoard.tsx - POPRAWIONA WERSJA Z MIASTAMI
import React, { useState, useCallback, useEffect } from "react";
import styled from "styled-components";

interface OnlineCatanSVGBoardProps {
  onVertexClick?: (vertexId: number) => void;
  onEdgeClick?: (edgeId: number) => void;
  buildMode?: "settlement" | "road" | "city" | null;
  gameState?: any;
  myPlayerId?: string;
  myColor?: string;
  isMyTurn?: boolean;
  gamePhase?: string;
}

const BoardContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
`;

const BoardSVG = styled.svg`
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.08));
`;

const Hexagon = styled.polygon<{ resource?: string }>`
  fill: ${(props) => getResourceColor(props.resource || "")};
  stroke: #e2e8f0;
  stroke-width: 2;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    stroke: #cbd5e1;
    stroke-width: 3;
    filter: brightness(1.05);
  }
`;

// ✅ POPRAWIONY Vertex component z obsługą miast
const Vertex = styled.circle<{
  active?: boolean;
  hasSettlement?: boolean;
  playerColor?: string;
  buildingType?: string; 
}>`
  fill: ${(props) => {
    if (props.hasSettlement) return props.playerColor || "#ef4444";
    if (props.active) return "#3b82f6";
    return "#f8fafc";
  }};
  stroke: ${(props) => {
    if (props.hasSettlement) return props.playerColor || "#ef4444";
    if (props.active) return "#3b82f6";
    return "#cbd5e1";
  }};
  stroke-width: ${(props) => (props.hasSettlement ? 3 : 2)};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    stroke-width: 3;
    transform-origin: center;
    // ✅ POPRAWIONE - różne rozmiary przy hover
    r: ${(props) => {
      if (props.buildingType === "city") return 16; // Duże miasto przy hover
      if (props.hasSettlement) return 12; // Osada przy hover
      return 10; // Pusty przy hover
    }};
    filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.15));
  }
`;

const Edge = styled.line<{
  active?: boolean;
  hasRoad?: boolean;
  playerColor?: string;
}>`
  stroke: ${(props) => {
    if (props.hasRoad) return props.playerColor || "#3b82f6";
    if (props.active) return "#3b82f6";
    return "#e2e8f0";
  }};
  stroke-width: ${(props) => {
    if (props.hasRoad) return 6;
    if (props.active) return 4;
    return 2;
  }};
  stroke-linecap: round;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    stroke-width: ${(props) => (props.hasRoad ? 8 : 6)};
    filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.1));
  }
`;

const NumberToken = styled.circle<{ isRed?: boolean }>`
  fill: white;
  stroke: ${(props) => (props.isRed ? "#ef4444" : "#64748b")};
  stroke-width: 2;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
`;

const NumberText = styled.text<{ isRed?: boolean }>`
  fill: ${(props) => (props.isRed ? "#ef4444" : "#1e293b")};
  font-size: 14px;
  font-weight: 700;
  text-anchor: middle;
  dominant-baseline: central;
  pointer-events: none;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
    sans-serif;
`;

// Debug styles
const VertexLabel = styled.text<{ hasSettlement?: boolean }>`
  fill: ${(props) => (props.hasSettlement ? "white" : "#64748b")};
  font-size: 8px;
  font-weight: 600;
  text-anchor: middle;
  dominant-baseline: central;
  pointer-events: none;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
    sans-serif;
`;

const EdgeLabel = styled.text`
  fill: #64748b;
  font-size: 7px;
  font-weight: 500;
  text-anchor: middle;
  dominant-baseline: central;
  pointer-events: none;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
    sans-serif;
`;

const DebugInfo = styled.div`
  margin-top: 20px;
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
    sans-serif;
  font-size: 12px;
  color: #475569;
  min-width: 300px;

  div {
    margin-bottom: 4px;
  }

  strong {
    color: #1e293b;
  }
`;

// Minimalistyczne kolory zasobów
const getResourceColor = (resource: string): string => {
  const colors: Record<string, string> = {
    wood: "#16a34a", // Zielony
    brick: "#dc2626", // Czerwony
    sheep: "#84cc16", // Jasny zielony
    wheat: "#eab308", // Żółty
    ore: "#64748b", // Szary
    desert: "#f59e0b", // Pomarańczowy
  };
  return colors[resource.toLowerCase()] || "#f1f5f9";
};

const getVertexIdForHexAndIndex = (
  hexIndex: number,
  vertexIndex: number
): number => {
  return hexIndex * 6 + vertexIndex;
};

const getEdgeIdForHexAndIndex = (
  hexIndex: number,
  edgeIndex: number
): number => {
  return hexIndex * 6 + edgeIndex;
};

// Definicja planszy
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
  isMyTurn = false,
}) => {
  const [builtSettlements, setBuiltSettlements] = useState<
    Map<number, { playerId: string; color: string; buildingType?: string }>
  >(new Map());
  const [builtRoads, setBuiltRoads] = useState<
    Map<number, { playerId: string; color: string }>
  >(new Map());
  const [debugInfo, setDebugInfo] = useState<string>("");

  // Funkcja do konwersji współrzędnych hex na pozycję ekranu
  const hexToPixel = useCallback((q: number, r: number, size: number = 45) => {
    const x = size * ((3 / 2) * q);
    const y = size * ((Math.sqrt(3) / 2) * q + Math.sqrt(3) * r);
    return { x: x + 350, y: y + 250 };
  }, []);

  // Funkcje do tworzenia wierzchołków i krawędzi heksagonu
  const getHexagonVertices = useCallback(
    (centerX: number, centerY: number, size: number = 45) => {
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
    (centerX: number, centerY: number, size: number = 45) => {
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
          midX: (start.x + end.x) / 2,
          midY: (start.y + end.y) / 2,
        });
      }
      return edges;
    },
    [getHexagonVertices]
  );

  // ✅ POPRAWIONE - ładowanie stanu gry z buildingType
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
              buildingType: vertexData.building_type, // ✅ DODANE
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
    if (!gameState?.players) return "#64748b";

    const playerData = Object.values(gameState.players).find(
      (p: any) => p.player_id === playerId
    );
    return (playerData as any)?.color || "#64748b";
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

      if (!isMyTurn || (buildMode !== "settlement" && buildMode !== "city")) {
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
      <BoardSVG width={700} height={500} viewBox="0 0 700 500">
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

              {/* Token z numerem */}
              {hex.number > 0 && (
                <>
                  <NumberToken cx={x} cy={y} r="16" isRed={isRedNumber} />
                  <NumberText x={x} y={y} isRed={isRedNumber}>
                    {hex.number}
                  </NumberText>
                </>
              )}

              {/* ✅ POPRAWIONE - Wierzchołki z różnymi rozmiarami dla miast */}
              {vertices.map((vertex, vertexIndex) => {
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
                      // ✅ POPRAWIONE - różne rozmiary dla miast i osad
                      r={
                        settlement?.buildingType === "city" ? 12 : // Duże miasto
                        hasSettlement ? 8 : // Normalna osada
                        6 // Pusty wierzchołek
                      }
                      active={buildMode === "settlement" && isMyTurn}
                      hasSettlement={hasSettlement}
                      playerColor={settlement?.color}
                      buildingType={settlement?.buildingType} // ✅ DODANE
                      onClick={() => handleVertexClick(globalVertexId)}
                    />
                    <VertexLabel
                      x={vertex.x}
                      y={vertex.y + (hasSettlement ? 0 : 15)}
                      hasSettlement={hasSettlement}
                    >
                      {/* {globalVertexId} */}
                    </VertexLabel>
                  </g>
                );
              })}

              {/* Krawędzie (dla dróg) */}
              {edges.map((edge, edgeIndex) => {
                const globalEdgeId = getEdgeIdForHexAndIndex(
                  hexIndex,
                  edgeIndex
                );

                const road = builtRoads.get(globalEdgeId);
                const hasRoad = !!road;

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
                    <EdgeLabel x={edge.midX} y={edge.midY}>
                      {/* {globalEdgeId} */}
                    </EdgeLabel>
                  </g>
                );
              })}
            </g>
          );
        })}
      </BoardSVG>
    </BoardContainer>
  );
};

export default OnlineCatanSVGBoard;