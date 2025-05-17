import { Corner as CornerData } from '../../engine/corner';
import styled, { css } from 'styled-components';
import { BaseTile } from '../../engine/tile';
import { useState, useEffect } from 'react';

interface Props {
  onClick?: (corner: CornerData, tile: BaseTile) => void;
  corner: CornerData;
  coords: { x: number; y: number };
  tile: BaseTile;
  buildMode?: string | null | undefined;
  isPreviewMode?: boolean;
  myPlayerId?: string;
  myColor?: string;
}

// Stylizowany komponent dla domku (osady)
const StyledSettlement = styled.polygon<{ 
  $color: string; 
  $isPreview?: boolean;
  $isCity?: boolean; 
}>`
  fill: ${({ $color }) => $color};
  stroke: black;
  stroke-width: 0.2;
  opacity: ${({ $isPreview }) => $isPreview ? 0.6 : 1};
  cursor: pointer;
  transition: all 200ms ease-in-out;
  
  &:hover {
    opacity: 0.8;
  }
`;

// Stylizowany komponent dla domku (miasta)
const StyledCity = styled.path<{ 
  $color: string; 
  $isPreview?: boolean;
}>`
  fill: ${({ $color }) => $color};
  stroke: black;
  stroke-width: 0.2;
  opacity: ${({ $isPreview }) => $isPreview ? 0.6 : 1};
  cursor: pointer;
  transition: all 200ms ease-in-out;
  
  &:hover {
    opacity: 0.8;
  }
`;

// Stylizowany punkt "pusty", reagujący na kliknięcia
const StyledCircle = styled.circle<{ $corner: CornerData; $buildMode: string | null | undefined; $isPreviewMode: boolean }>`
  fill: ${props => props.$buildMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0)'};
  stroke: ${props => props.$buildMode ? 'white' : 'rgba(0, 0, 0, 0)'};
  stroke-width: 0.2;
  stroke-dasharray: ${props => props.$buildMode ? '0.5 0.3' : '0'};
  cursor: pointer;
  transition: all 200ms ease-in-out;

  &:hover {
    fill: ${props => props.$buildMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.2)'};
    stroke: ${props => props.$buildMode ? 'white' : 'white'};
    opacity: 0.8;
  }
`;

export function Corner({ corner, tile, coords, onClick, buildMode, isPreviewMode, myPlayerId, myColor = 'red' }: Props) {
  const [showPreview, setShowPreview] = useState(false);
  const [isCity, setIsCity] = useState(false);

  // Sprawdź, czy na tym rogu jest już jakaś budowla
  const hasBuilding = corner.getOwner() !== null;
  // Określ, czy ta budowla jest miastem
  const isBuildingCity = corner.hasCity();
  // Pobierz kolor gracza, który posiada budowlę
  const ownerColor = corner.getOwner()?.getColor() || 'gray';
  
  // Pokaż podgląd budowli przy najechaniu, jeśli jest tryb budowania i nie ma już budowli
  useEffect(() => {
    if (buildMode && (buildMode === 'settlement' && !hasBuilding || buildMode === 'city' && hasBuilding && !isBuildingCity)) {
      setShowPreview(isPreviewMode === true);
      setIsCity(buildMode === 'city');
    } else {
      setShowPreview(false);
    }
  }, [buildMode, hasBuilding, isBuildingCity, isPreviewMode]);

  // Osada to prosty pięciokąt
  const settlementPoints = `
    ${coords.x},${coords.y - 0.4}
    ${coords.x + 0.35},${coords.y - 0.1}
    ${coords.x + 0.35},${coords.y + 0.3}
    ${coords.x - 0.35},${coords.y + 0.3}
    ${coords.x - 0.35},${coords.y - 0.1}
  `;

  // Miasto to bardziej skomplikowany kształt z dodatkową "wieżą"
  const cityPath = `
    M ${coords.x - 0.4} ${coords.y - 0.1}
    L ${coords.x - 0.4} ${coords.y + 0.3}
    L ${coords.x + 0.4} ${coords.y + 0.3}
    L ${coords.x + 0.4} ${coords.y - 0.1}
    L ${coords.x + 0.2} ${coords.y - 0.3}
    L ${coords.x - 0.2} ${coords.y - 0.3}
    Z
  `;

  // Renderowanie komponentu
  return (
    <>
      {/* Jeśli jest już budowla lub pokazujemy podgląd, wyświetl odpowiedni kształt */}
      {(hasBuilding || showPreview) && (
        isBuildingCity || isCity ? (
          <StyledCity 
            d={cityPath} 
            $color={hasBuilding ? ownerColor : myColor}
            $isPreview={showPreview}
            onClick={() => onClick?.(corner, tile)}
          />
        ) : (
          <StyledSettlement 
            points={settlementPoints} 
            $color={hasBuilding ? ownerColor : myColor}
            $isPreview={showPreview}
            onClick={() => onClick?.(corner, tile)}
          />
        )
      )}
      
      {/* Zawsze renderuj "niewidzialny" punkt, który obsługuje kliknięcia */}
      <StyledCircle
        r="0.7"
        cx={coords.x}
        cy={coords.y}
        onClick={() => onClick?.(corner, tile)}
        $corner={corner}
        $buildMode={buildMode}
        $isPreviewMode={!!isPreviewMode}
      />
    </>
  );
}