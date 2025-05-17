import React, { useState, useEffect } from "react";
import { Layout } from 'react-hexgrid';
import { Board } from '../engine/board';
import styled from 'styled-components';
import { Corners } from './corner/CatanCorners';
import { Tiles } from './tile/CatanTiles';
import { Corner as CornerData } from '../engine/corner';
import { Edge as EdgeData } from '../engine/edge';
import { BaseTile } from '../engine/tile';
import { Edges } from './edge/CatanEdges';
import { LayoutContext } from './context/LayoutContext';

interface Props {
  board: Board;
  onCornerClick?: (corner: CornerData, tile: BaseTile) => void;
  onEdgeClick?: (edge: EdgeData, tile: BaseTile) => void;
  useLocalBuildApi?: boolean;
  buildMode?: string | null;
  myPlayerId?: string;
  myColor?: string;
  gamePhase?: string;
}

const StyledWrapper = styled.div`
  display: inline-block;
  position: relative;
  width: 100%;
  padding-bottom: 100%;
  vertical-align: middle;
  overflow: hidden;
`;

const StyledSvg = styled.svg`
  display: inline-block;
  position: absolute;
  top: 0;
  left: 0;
`;

// Komponent do wyświetlania informacji o fazie gry na planszy
const PhaseOverlay = styled.div<{ phase?: string }>`
  position: absolute;
  top: 10px;
  left: 10px;
  background-color: ${props => props.phase === 'setup' ? '#ff9800' : '#4CAF50'};
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-weight: bold;
  z-index: 10;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
`;

// Komponent z instrukcją
const InstructionOverlay = styled.div<{ isVisible: boolean }>`
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  text-align: center;
  max-width: 80%;
  z-index: 10;
  opacity: ${props => props.isVisible ? 1 : 0};
  visibility: ${props => props.isVisible ? 'visible' : 'hidden'};
  transition: opacity 0.3s, visibility 0.3s;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
`;

export const CatanBoard: React.FC<Props> = ({
  board,
  onCornerClick,
  onEdgeClick,
  useLocalBuildApi = false,
  buildMode,
  myPlayerId,
  myColor,
  gamePhase = "main"
}) => {
  const hexagons = board.getHexes();
  const [instruction, setInstruction] = useState<string>("");
  
  // Dodawanie instrukcji w zależności od trybu budowania i fazy gry
  useEffect(() => {
    if (gamePhase === "setup") {
      if (buildMode === "settlement") {
        setInstruction("Kliknij na wolny róg planszy, aby umieścić osadę");
      } else if (buildMode === "road") {
        setInstruction("Kliknij na wolną krawędź planszy, aby umieścić drogę");
      } else {
        setInstruction("Wybierz akcję budowania z menu po prawej stronie");
      }
    } else {
      if (buildMode === "settlement") {
        setInstruction("Kliknij na wolny róg planszy, aby zbudować osadę");
      } else if (buildMode === "city") {
        setInstruction("Kliknij na swoją osadę, aby ulepszyć ją do miasta");
      } else if (buildMode === "road") {
        setInstruction("Kliknij na wolną krawędź planszy, aby zbudować drogę");
      } else {
        setInstruction("");
      }
    }
  }, [buildMode, gamePhase]);

  // Tworzenie poprawnego obiektu layoutu zgodnego z biblioteką react-hexgrid
  const layoutConfig = {
    size: { x: 3, y: 3 },
    spacing: 1.02,
    flat: false,
    origin: { x: 0, y: 0 }
  };
  
  // Stwórz właściwy obiekt layout używając HexUtils z biblioteki
  const hexLayout = {
    size: layoutConfig.size,
    flat: layoutConfig.flat,
    spacing: layoutConfig.spacing,
    origin: layoutConfig.origin,
    // Te obliczenia są zwykle wykonywane wewnątrz komponentu Layout,
    // ale musimy je dodać tutaj, aby przekazać do naszych komponentów
    // Orientacja (flat: false oznacza pointy-top)
    orientation: layoutConfig.flat ?
      {
        f0: 3 / 2, f1: 0, f2: Math.sqrt(3) / 2, f3: Math.sqrt(3),
        b0: 2 / 3, b1: 0, b2: -1 / 3, b3: Math.sqrt(3) / 3,
        startAngle: 0
      } :
      {
        f0: Math.sqrt(3), f1: Math.sqrt(3) / 2, f2: 0, f3: 3 / 2,
        b0: Math.sqrt(3) / 3, b1: -1 / 3, b2: 0, b3: 2 / 3,
        startAngle: 0.5
      }
  };

  // Funkcja obsługująca kliknięcie rogu - wywoływana przez komponent Corner
  const handleCornerClick = async (corner: CornerData, tile: BaseTile) => {
    console.log('clicked corner!', corner, tile);

    if (!buildMode || (buildMode !== 'settlement' && buildMode !== 'city')) {
      // Jeśli nie jesteśmy w trybie budowania, po prostu wywołaj callback
      if (onCornerClick) {
        onCornerClick(corner, tile);
      }
      return;
    }

    // W przypadku korzystania z lokalnego API do budowania
    if (useLocalBuildApi) {
      try {
        // Get the corner index in the tile's corners array
        const cornerIndex = tile.getCorners().indexOf(corner);

        const response = await fetch('http://localhost:8000/api/build/settlement/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tileCoords: tile.tileId,
            cornerIndex: cornerIndex
          })
        });
        const data = await response.json();
        console.log('Settlement build response:', data);

        if (data.status === 'success') {
          console.log('Dispatching resourcesUpdated event after settlement build');
          console.log('Player data from response:', data.player);
          window.dispatchEvent(new Event('resourcesUpdated'));
        }
      } catch (error) {
        console.error('Error building settlement:', error);
      }
    }

    // Wywołaj callback jeśli został przekazany
    if (onCornerClick) {
      onCornerClick(corner, tile);
    }
  };

  // Funkcja obsługująca kliknięcie krawędzi - wywoływana przez komponent Edge
  const handleEdgeClick = async (edge: EdgeData, tile: BaseTile) => {
    console.log('clicked edge!', edge, tile);

    if (!buildMode || buildMode !== 'road') {
      // Jeśli nie jesteśmy w trybie budowania dróg, po prostu wywołaj callback
      if (onEdgeClick) {
        onEdgeClick(edge, tile);
      }
      return;
    }

    // W przypadku korzystania z lokalnego API do budowania
    if (useLocalBuildApi) {
      try {
        // Get the edge index in the tile's edges array
        const edgeIndex = tile.getEdges().indexOf(edge);

        const response = await fetch('http://localhost:8000/api/build/road/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tileCoords: tile.tileId,
            edgeIndex: edgeIndex
          })
        });
        const data = await response.json();
        console.log('Road build response:', data);

        if (data.status === 'success') {
          console.log('Dispatching resourcesUpdated event after road build');
          console.log('Player data from response:', data.player);
          window.dispatchEvent(new Event('resourcesUpdated'));
        }
      } catch (error) {
        console.error('Error building road:', error);
      }
    }

    // Wywołaj callback jeśli został przekazany
    if (onEdgeClick) {
      onEdgeClick(edge, tile);
    }
  };

  return (
    <StyledWrapper>
      {/* Indykator fazy gry */}
      <PhaseOverlay phase={gamePhase}>
        {gamePhase === 'setup' ? 'Faza przygotowania' : 'Faza główna gry'}
      </PhaseOverlay>
      
      {/* Instrukcja dla gracza */}
      <InstructionOverlay isVisible={!!instruction}>
        {instruction}
      </InstructionOverlay>
      
      <StyledSvg
        viewBox="-35 -30 70 60"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
      >
        <LayoutContext.Provider value={hexLayout}>
          <Layout size={layoutConfig.size} spacing={layoutConfig.spacing} flat={layoutConfig.flat} origin={layoutConfig.origin}>
            <Tiles hexagons={hexagons} board={board} />
            <Edges
              hexagons={hexagons}
              board={board}
              onClick={handleEdgeClick}
              buildMode={buildMode}
              myPlayerId={myPlayerId}
              myColor={myColor}
            />
            <Corners
              hexagons={hexagons}
              board={board}
              onClick={handleCornerClick}
              buildMode={buildMode}
              myPlayerId={myPlayerId}
              myColor={myColor}
            />
          </Layout>
        </LayoutContext.Provider>
      </StyledSvg>
    </StyledWrapper>
  );
};