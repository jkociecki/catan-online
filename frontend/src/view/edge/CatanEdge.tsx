import { Edge as EdgeData } from '../../engine/edge';
import styled from 'styled-components';
import { BaseTile } from '../../engine/tile';
import { TileEdge } from '../../engine/tileHelpers';
import { useState, useEffect } from 'react';

interface Props {
  onClick?: (edge: EdgeData, tile: BaseTile) => void;
  edge: EdgeData;
  coords: { x: number; y: number };
  tile: BaseTile;
  height: number;
  position: TileEdge;
  buildMode?: string | null | undefined;
  isPreviewMode?: boolean;
  myPlayerId?: string;
  myColor?: string;
}

// Stylizowany komponent dla drogi
const StyledRoad = styled.rect<{ 
  $position: TileEdge; 
  $color: string;
  $isPreview?: boolean;
  $animate?: boolean;
}>`
  fill: ${({ $color }) => $color};
  stroke: #333;
  stroke-width: 0.2;
  opacity: ${({ $isPreview }) => $isPreview ? 0.6 : 1};
  transform-box: fill-box;
  cursor: pointer;
  animation: ${({ $animate }) => $animate ? 'pulse 2s infinite' : 'none'};

  transform: rotate(
    ${({ $position }) => 
      $position === TileEdge.NE ? 300 : 
      $position === TileEdge.NW ? 60 : 0}deg
  );
  
  @keyframes pulse {
    0% { opacity: 0.7; }
    50% { opacity: 1; }
    100% { opacity: 0.7; }
  }
  
  &:hover {
    opacity: 0.8;
    stroke-width: 0.3;
  }
`;

// Stylizowany punkt "pusty", reagujący na kliknięcia
const StyledRect = styled.rect<{ 
  $position: TileEdge;
  $buildMode: string | null | undefined;
  $isPreviewMode: boolean;
  $hasRoad: boolean;
  $isActive: boolean;
}>`
  fill: ${props => 
    props.$hasRoad ? 'transparent' :
    props.$isActive ? 'rgba(255, 255, 255, 0.3)' :
    props.$buildMode === 'road' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0)'
  };
  stroke: ${props => 
    props.$hasRoad ? 'transparent' :
    props.$isActive ? 'white' :
    props.$buildMode === 'road' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0)'
  };
  stroke-width: 0.2;
  stroke-dasharray: ${props => props.$buildMode === 'road' && !props.$hasRoad ? '0.3 0.3' : '0'};
  transform-box: fill-box;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  transform: rotate(
    ${({ $position }) => 
      $position === TileEdge.NE ? 300 : 
      $position === TileEdge.NW ? 60 : 0}deg
  );
  
  &:hover {
    fill: ${props => 
      props.$hasRoad ? 'transparent' :
      props.$buildMode === 'road' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)'
    };
    stroke: white;
  }
`;

export function Edge({ 
  edge, 
  tile, 
  coords, 
  height, 
  position, 
  onClick, 
  buildMode, 
  isPreviewMode,
  myPlayerId,
  myColor = 'red'
}: Props) {
  const [showPreview, setShowPreview] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [animate, setAnimate] = useState(false);
  
  // Sprawdź, czy na tej krawędzi jest już droga
  const hasRoad = edge.getOwner() !== null;
  // Pobierz kolor gracza, który posiada drogę
  const ownerColor = edge.getOwner()?.getColor() || 'gray';
  
  // Efekt dla podglądu drogi przy najechaniu
  useEffect(() => {
    if (isPreviewMode) {
      setIsActive(true);
      
      // Pokaż podgląd drogi jeśli nie ma już drogi
      if (buildMode === 'road' && !hasRoad) {
        setShowPreview(true);
      } else {
        setShowPreview(false);
      }
    } else {
      setIsActive(false);
      setShowPreview(false);
    }
  }, [buildMode, hasRoad, isPreviewMode]);
  
  // Efekt animacji po postawieniu drogi
  useEffect(() => {
    // Jeśli pojawiła się droga, uruchom animację
    if (hasRoad) {
      setAnimate(true);
      const timer = setTimeout(() => {
        setAnimate(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [hasRoad]);

  return (
    <>
      {/* Zawsze renderuj "niewidzialny" prostokąt, który obsługuje kliknięcia */}
      <StyledRect
        width="0.8"  // Szerszy niż droga dla łatwiejszego klikania
        height={height}
        x={coords.x - 0.4}  // Wyśrodkowanie obszaru klikalnego
        y={coords.y}
        onClick={() => onClick?.(edge, tile)}
        $position={position}
        $buildMode={buildMode}
        $isPreviewMode={!!isPreviewMode}
        $hasRoad={hasRoad}
        $isActive={isActive}
      />
      
      {/* Jeśli jest już droga, wyświetl ją */}
      {hasRoad && (
        <StyledRoad
          width="0.5"
          height={height}
          x={coords.x - 0.25}  // Wyśrodkowanie drogi
          y={coords.y}
          $position={position}
          $color={ownerColor}
          $animate={animate}
          onClick={() => onClick?.(edge, tile)}
        />
      )}
      
      {/* Jeśli pokazujemy podgląd drogi */}
      {showPreview && (
        <StyledRoad
          width="0.5"
          height={height}
          x={coords.x - 0.25}  // Wyśrodkowanie drogi
          y={coords.y}
          $position={position}
          $color={myColor}
          $isPreview={true}
          onClick={() => onClick?.(edge, tile)}
        />
      )}
    </>
  );
}