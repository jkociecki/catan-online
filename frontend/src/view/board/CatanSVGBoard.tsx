import React, { useState, useCallback, useEffect } from "react";
import styled from "styled-components";

// TypeScript interfaces dla props
interface ButtonProps {
  active?: boolean;
}

interface HexagonProps {
  resource?: string;
}

interface VertexProps {
  active?: boolean;
  hasSettlement?: boolean;
}

interface EdgeProps {
  active?: boolean;
  hasRoad?: boolean;
}

interface NumberTokenProps {
  isRed?: boolean;
}

interface NumberTextProps {
  isRed?: boolean;
}

interface VertexLabelProps {
  hasSettlement?: boolean;
}

interface MessageProps {
  success?: boolean;
}

interface CatanSVGBoardProps {
  onVertexClick?: (vertexId: number) => void;
  onEdgeClick?: (edgeId: number) => void;
  buildMode?: "settlement" | "road" | null;
}

const BoardContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
`;

const Controls = styled.div`
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
  align-items: center;
`;

const Button = styled.button<ButtonProps>`
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;

  ${(props) =>
    props.active
      ? `
    background-color: #4CAF50;
    color: white;
  `
      : `
    background-color: #f0f0f0;
    color: black;
  `}

  &:hover {
    opacity: 0.8;
    transform: translateY(-1px);
  }
`;

const BoardSVG = styled.svg`
  /* Czyste SVG bez tła i obramowania */
`;

const Hexagon = styled.polygon<HexagonProps>`
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

const Vertex = styled.circle<VertexProps>`
  fill: ${(props) => {
    if (props.hasSettlement) return "#4CAF50";
    if (props.active) return "rgba(76, 175, 80, 0.3)";
    return "rgba(255, 255, 255, 0.8)";
  }};
  stroke: #333;
  stroke-width: ${(props) => (props.hasSettlement ? 3 : 2)};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    fill: ${(props) => {
      if (props.hasSettlement) return "#45a049";
      if (props.active) return "rgba(76, 175, 80, 0.6)";
      return "#DDD";
    }};
    r: ${(props) => (props.hasSettlement ? 12 : 10)};
  }
`;

const Edge = styled.line<EdgeProps>`
  stroke: ${(props) => {
    if (props.hasRoad) return "#2196F3";
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
      if (props.hasRoad) return "#1976D2";
      if (props.active) return "rgba(33, 150, 243, 0.8)";
      return "#888";
    }};
    stroke-width: ${(props) => (props.hasRoad ? 10 : 8)};
  }
`;

const NumberToken = styled.circle<NumberTokenProps>`
  fill: ${(props) => (props.isRed ? "#DC143C" : "#F5DEB3")};
  stroke: #8b4513;
  stroke-width: 2;
  filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.3));
`;

const NumberText = styled.text<NumberTextProps>`
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

const VertexLabel = styled.text<VertexLabelProps>`
  fill: ${(props) => (props.hasSettlement ? "white" : "#333")};
  font-size: 8px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: central;
  pointer-events: none;
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5);
`;

const Stats = styled.div`
  margin-top: 20px;
  padding: 20px;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-radius: 10px;
  font-family: "Arial", sans-serif;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-width: 600px;
`;

const Message = styled.div<MessageProps>`
  margin-top: 15px;
  padding: 12px 16px;
  background-color: ${(props) => (props.success ? "#d4edda" : "#f8d7da")};
  color: ${(props) => (props.success ? "#155724" : "#721c24")};
  border: 1px solid ${(props) => (props.success ? "#c3e6cb" : "#f5c6cb")};
  border-radius: 6px;
  font-weight: bold;
`;

// Funkcja do kolorów zasobów
const getResourceColor = (resource: string): string => {
  const colors: Record<string, string> = {
    wood: "#228B22", // Zielony las
    brick: "#CD853F", // Brązowa glina
    sheep: "#98FB98", // Jasno zielona łąka
    wheat: "#FFD700", // Złote zboże
    ore: "#708090", // Szara ruda
    desert: "#F4A460", // Piaskowa pustynia
  };
  return colors[resource] || "#DDD";
};

// API Configuration
const API_BASE = "http://localhost:8000/api";

// Definicja planszy Catana - 19 heksagonów
const hexData = [
  // Centrum
  { q: 0, r: 0, s: 0, resource: "desert", number: null },

  // Pierwszy pierścień
  { q: 0, r: -1, s: 1, resource: "wood", number: 11 },
  { q: 1, r: -1, s: 0, resource: "sheep", number: 12 },
  { q: 1, r: 0, s: -1, resource: "wheat", number: 9 },
  { q: 0, r: 1, s: -1, resource: "brick", number: 4 },
  { q: -1, r: 1, s: 0, resource: "ore", number: 6 },
  { q: -1, r: 0, s: 1, resource: "sheep", number: 5 },

  // Drugi pierścień
  { q: 0, r: -2, s: 2, resource: "wood", number: 6 },
  { q: 1, r: -2, s: 1, resource: "sheep", number: 3 },
  { q: 2, r: -2, s: 0, resource: "wheat", number: 8 },
  { q: 2, r: -1, s: -1, resource: "wheat", number: 8 },
  { q: 2, r: 0, s: -2, resource: "ore", number: 10 },
  { q: 1, r: 1, s: -2, resource: "brick", number: 5 },
  { q: 0, r: 2, s: -2, resource: "wood", number: 4 },
  { q: -1, r: 2, s: -1, resource: "wood", number: 11 },
  { q: -2, r: 2, s: 0, resource: "brick", number: 8 },
  { q: -2, r: 1, s: 1, resource: "wheat", number: 9 },
  { q: -2, r: 0, s: 2, resource: "sheep", number: 3 },
  { q: -1, r: -1, s: 2, resource: "ore", number: 5 },
];

const CatanSVGBoard: React.FC<CatanSVGBoardProps> = ({
  onVertexClick,
  onEdgeClick,
  buildMode = null,
}) => {
  const [builtSettlements, setBuiltSettlements] = useState<Set<number>>(
    new Set()
  );
  const [builtRoads, setBuiltRoads] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState<string>("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );
  const [loading, setLoading] = useState<boolean>(false);

  // Funkcja do konwersji współrzędnych hex na pozycję ekranu
  const hexToPixel = useCallback((q: number, r: number, size: number = 50) => {
    const x = size * ((3 / 2) * q);
    const y = size * ((Math.sqrt(3) / 2) * q + Math.sqrt(3) * r);
    return { x: x + 400, y: y + 300 }; // Offset do środka SVG
  }, []);

  // Funkcja do tworzenia wierzchołków heksagonu
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

  // Funkcja do tworzenia krawędzi heksagonu
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
          centerX: (start.x + end.x) / 2,
          centerY: (start.y + end.y) / 2,
        });
      }
      return edges;
    },
    [getHexagonVertices]
  );

  // Funkcja do pobierania stanu planszy z API
  const fetchBoardState = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/board/state/`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.status === "success") {
        // Aktualizuj stan na podstawie danych z serwera
        const settlementIds = Object.keys(data.settlements).map((id) =>
          parseInt(id)
        );
        const roadIds = Object.keys(data.roads).map((id) => parseInt(id));

        setBuiltSettlements(new Set(settlementIds));
        setBuiltRoads(new Set(roadIds));

        console.log("Board state loaded:", data.stats);
      }
    } catch (error) {
      console.error("Error fetching board state:", error);
      setMessage(
        `❌ Błąd wczytywania planszy: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setMessageType("error");
    }
  }, []);

  // Wczytaj stan planszy przy pierwszym renderze
  useEffect(() => {
    fetchBoardState();
  }, [fetchBoardState]);

  const handleVertexClick = useCallback(
    async (vertexId: number) => {
      if (buildMode !== "settlement" || loading) return;

      if (builtSettlements.has(vertexId)) {
        setMessage(`❌ Domek już istnieje na wierzchołku ${vertexId}`);
        setMessageType("error");
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/vertex/${vertexId}/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (data.status === "success") {
          // Aktualizuj lokalny stan
          setBuiltSettlements(
            (prev) => new Set([...Array.from(prev), vertexId])
          );
          setMessage(`🏠 ${data.message}`);
          setMessageType("success");

          // Wywołaj callback
          if (onVertexClick) {
            onVertexClick(vertexId);
          }
        } else {
          setMessage(`❌ ${data.message}`);
          setMessageType("error");
        }
      } catch (error) {
        console.error("Error placing settlement:", error);
        setMessage(`❌ Błąd połączenia z serwerem`);
        setMessageType("error");
      } finally {
        setLoading(false);
      }
    },
    [buildMode, builtSettlements, loading, onVertexClick]
  );

  const handleEdgeClick = useCallback(
    async (edgeId: number) => {
      if (buildMode !== "road" || loading) return;

      if (builtRoads.has(edgeId)) {
        setMessage(`❌ Droga już istnieje na krawędzi ${edgeId}`);
        setMessageType("error");
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/edge/${edgeId}/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (data.status === "success") {
          // Aktualizuj lokalny stan
          setBuiltRoads((prev) => new Set([...Array.from(prev), edgeId]));
          setMessage(`🛣️ ${data.message}`);
          setMessageType("success");

          // Wywołaj callback
          if (onEdgeClick) {
            onEdgeClick(edgeId);
          }
        } else {
          setMessage(`❌ ${data.message}`);
          setMessageType("error");
        }
      } catch (error) {
        console.error("Error placing road:", error);
        setMessage(`❌ Błąd połączenia z serwerem`);
        setMessageType("error");
      } finally {
        setLoading(false);
      }
    },
    [buildMode, builtRoads, loading, onEdgeClick]
  );

  return (
    <BoardContainer>
      <h2>🏝️ Catan Board SVG</h2>

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

              {/* Tekst zasobu - mniejszy */}
              <ResourceText x={x} y={y - 12}>
                {hex.resource.toUpperCase()}
              </ResourceText>

              {/* Token z numerem */}
              {hex.number && (
                <>
                  <NumberToken cx={x} cy={y + 8} r="20" isRed={isRedNumber} />
                  <NumberText x={x} y={y + 8} isRed={isRedNumber}>
                    {hex.number}
                  </NumberText>
                </>
              )}

              {/* Wierzchołki (dla domków) */}
              {vertices.map((vertex, vertexIndex) => {
                const globalVertexId = hexIndex * 6 + vertexIndex;
                const hasSettlement = builtSettlements.has(globalVertexId);

                return (
                  <g key={`vertex-${globalVertexId}`}>
                    <Vertex
                      cx={vertex.x}
                      cy={vertex.y}
                      r={hasSettlement ? 10 : 8}
                      active={buildMode === "settlement"}
                      hasSettlement={hasSettlement}
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
                const globalEdgeId = hexIndex * 6 + edgeIndex;
                const hasRoad = builtRoads.has(globalEdgeId);

                return (
                  <g key={`edge-${globalEdgeId}`}>
                    <Edge
                      x1={edge.x1}
                      y1={edge.y1}
                      x2={edge.x2}
                      y2={edge.y2}
                      active={buildMode === "road"}
                      hasRoad={hasRoad}
                      onClick={() => handleEdgeClick(globalEdgeId)}
                    />
                  </g>
                );
              })}
            </g>
          );
        })}
      </BoardSVG>

      <Stats>
        <div>
          <strong>🎯 Tryb:</strong>{" "}
          {loading
            ? "⏳ Zapisywanie..."
            : buildMode === "settlement"
            ? "🏠 Kliknij białe kółka (wierzchołki)"
            : buildMode === "road"
            ? "🛣️ Kliknij linie (krawędzie)"
            : "Wybierz tryb budowania"}
        </div>
        <div>
          <strong>📊 Budynki:</strong> {builtSettlements.size} domków,{" "}
          {builtRoads.size} dróg
        </div>
        <div>
          <strong>🎲 Plansza:</strong> Klasyczny Catan z 19 heksagonami
        </div>

        {message && (
          <Message success={messageType === "success"}>{message}</Message>
        )}
      </Stats>
    </BoardContainer>
  );
};

export default CatanSVGBoard;
