import React, { useState } from "react";
import CatanSVGBoard from "./board/CatanSVGBoard";

const TestPage: React.FC = () => {
  const [mode, setMode] = useState<"settlement" | "road" | null>("settlement");

  return (
    <div style={{ padding: "20px" }}>
      <h1>Test SVG Board</h1>
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={() => setMode("settlement")}
          style={{ marginRight: "10px", padding: "10px 20px" }}
        >
          🏠 Domki
        </button>
        <button
          onClick={() => setMode("road")}
          style={{ padding: "10px 20px" }}
        >
          🛣️ Drogi
        </button>
      </div>
      <CatanSVGBoard
        buildMode={mode}
        onVertexClick={(id) => console.log("Vertex clicked:", id)}
        onEdgeClick={(id) => console.log("Edge clicked:", id)}
      />
    </div>
  );
};

export default TestPage;
