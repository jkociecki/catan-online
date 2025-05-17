import { Edge as EdgeData } from '../../engine/edge';
import styled, { css } from 'styled-components';
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
  $edge: EdgeData;
  $color: string;
  $isPreview?: boolean;
}>`
  fill: ${({ $color }) => $color};
  stroke: black;
  stroke-width: 0.2;
  opacity: ${({ $isPreview }) => $isPreview ? 0.6 : 1};
  transform-box: fill-box;
  cursor: pointer;
  transition: all 200ms ease-in-out;

  transform: rotate(
    ${({ $position }) => 
      $position === TileEdge.NE ? 300 : 
      $position === TileEdge.NW ? 60 : 0}deg
  );

  &:hover {
    opacity: 0.8;
  }
`;

// Stylizowany punkt "pusty", reagujący na kliknięcia
const StyledRect = styled.rect<{ 
  $position: TileEdge; 
  $edge: EdgeData; 
  $buildMode: string | null | undefined;
  $isPreviewMode: boolean;
}>`
  fill: ${props => props.$buildMode === 'road' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0)'};
  stroke: ${props => props.$buildMode === 'road' ? 'white' : 'rgba(0, 0, 0, 0)'};
  stroke-width: 0.2;
  stroke-dasharray: ${props => props.$buildMode === 'road' ? '0.5 0.3' : '0'};
  transform-box: fill-box;
  cursor: pointer;
  transition: all 200ms ease-in-out;

  transform: rotate(
    ${({ $position }) => 
      $position === TileEdge.NE ? 300 : 
      $position === TileEdge.NW ? 60 : 0}deg
  );

  &:hover {
    fill: ${props => props.$buildMode === 'road' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)'};
    stroke: ${props => props.$buildMode === 'road' ? 'white' : 'white'};
    opacity: 0.8;
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
  
  // Sprawdź, czy na tej krawędzi jest już droga
  const hasRoad = edge.getOwner() !== null;
  // Pobierz kolor gracza, który posiada drogę
  const ownerColor = edge.getOwner()?.getColor() || 'gray';
  
  // Pokaż podgląd drogi przy najechaniu, jeśli jest tryb budowania i nie ma już drogi
  useEffect(() => {
    if (buildMode === 'road' && !hasRoad) {
      setShowPreview(isPreviewMode === true);
    } else {
      setShowPreview(false);
    }
  }, [buildMode, hasRoad, isPreviewMode]);

  // Renderowanie komponentu
  return (
    <>
      {/* Jeśli jest już droga lub pokazujemy podgląd, wyświetl drogę */}
      {(hasRoad || showPreview) && (
        <StyledRoad
          width="0.5"
          height={height}
          x={coords.x - 0.25}  // Wyśrodkowanie drogi
          y={coords.y}
          $position={position}
          $edge={edge}
          $color={hasRoad ? ownerColor : myColor}
          $isPreview={showPreview}
          onClick={() => onClick?.(edge, tile)}
        />
      )}
      
      {/* Zawsze renderuj "niewidzialny" prostokąt, który obsługuje kliknięcia */}
      <StyledRect
        width="0.8"  // Szerszy niż droga dla łatwiejszego klikania
        height={height}
        x={coords.x - 0.4}  // Wyśrodkowanie obszaru klikalnego
        y={coords.y}
        onClick={() => onClick?.(edge, tile)}
        $position={position}
        $edge={edge}
        $buildMode={buildMode}
        $isPreviewMode={!!isPreviewMode}
      />
    </>
  );
}