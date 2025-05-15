import { Edge as EdgeData } from '../../engine/edge';
import styled, { css } from 'styled-components';
import { BaseTile } from '../../engine/tile';
import { TileEdge } from '../../engine/tileHelpers';

interface Props {
  onClick?: (edge: EdgeData, tile: BaseTile) => void;
  edge: EdgeData;
  coords: { x: number; y: number };
  tile: BaseTile;
  height: number;
  position: TileEdge;
}

const StyledRect = styled.rect<{ position: TileEdge; edge: EdgeData }>`
  fill: gray;
  stroke: black;
  stroke-width: 0.2;
  transform-box: fill-box;
  cursor: pointer;
  transition: opacity 200ms ease-in-out;

  &:hover {
    opacity: 0.7;
  }

  ${({ position, edge }) =>
    css`
      transform: rotate(
        ${position === TileEdge.NE ? 300 : position === TileEdge.NW ? 60 : 0}deg
      );
      fill: ${edge.getOwner()?.getColor() || 'gray'};
      opacity: ${!!edge.getOwner() ? 0.7 : 0};
    `}
`;

export function Edge({ edge, tile, coords, height, onClick, position }: Props) {
  return (
    <StyledRect
      width="0.5"
      height={height}
      x={coords.x}
      y={coords.y}
      onClick={() => onClick?.(edge, tile)}
      position={position}
      edge={edge}
    />
  );
}
