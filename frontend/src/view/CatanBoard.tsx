import React from 'react';
import { Layout, HexUtils } from 'react-hexgrid';
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

export const CatanBoard: React.FC<Props> = ({ board }) => {
  const hexagons = board.getHexes();

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
        b0: 2 / 3, b1: 0, b2: -1 / 3, b3: Math.sqrt(3) / 3
      } :
      {
        f0: Math.sqrt(3), f1: Math.sqrt(3) / 2, f2: 0, f3: 3 / 2,
        b0: Math.sqrt(3) / 3, b1: -1 / 3, b2: 0, b3: 2 / 3
      }
  };

  const handleCornerClick = (corner: CornerData, tile: BaseTile) => {
    console.log('clicked corner!', corner, tile);
  };

  const handleEdgeClick = (edge: EdgeData, tile: BaseTile) => {
    console.log('clicked edge!', edge, tile);
  };

  return (
    <StyledWrapper>
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
            />
            <Corners
              hexagons={hexagons}
              board={board}
              onClick={handleCornerClick}
            />
          </Layout>
        </LayoutContext.Provider>
      </StyledSvg>
    </StyledWrapper>
  );
};