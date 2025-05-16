import { Corner as CornerData } from '../../engine/corner';
import styled, { css } from 'styled-components';
import { BaseTile } from '../../engine/tile';

interface Props {
  onClick?: (corner: CornerData, tile: BaseTile) => void;
  corner: CornerData;
  coords: { x: number; y: number };
  tile: BaseTile;
}

const StyledCircle = styled.circle<{ $corner: CornerData }>`
  fill: gray;
  stroke: black;
  stroke-width: 0.2;
  cursor: pointer;
  transition: opacity 200ms ease-in-out;

  &:hover {
    opacity: 1;
  }

  ${({ $corner }) => css`
    fill: ${$corner.getOwner()?.getColor() || 'gray'};
    opacity: ${!!$corner.getOwner() ? 1 : 0};
  `}
`;

export function Corner({ corner, tile, coords, onClick }: Props) {
  return (
    <StyledCircle
      r="0.5"
      cx={coords.x}
      cy={coords.y}
      onClick={() => onClick?.(corner, tile)}
      $corner={corner}
    />
  );
}
