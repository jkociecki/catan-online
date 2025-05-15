import { GridGenerator, Hex } from 'react-hexgrid';
import { initTiles } from './boardHelpers';
import { TileType } from './tile';

describe('initTiles', () => {
  it('should init tiles and offset tiles based on given hexes', () => {
    const hexes = GridGenerator.hexagon(1);
    const tiles = initTiles(hexes, 0);
    expect(tiles['0,0,0'].getTileType()).toEqual(TileType.TILE);
    expect(tiles['-1,0,1'].getTileType()).toEqual(TileType.OFFSET);
  });

  it('should throw exception if hexes are found outside offset ring', () => {
    const hexes = GridGenerator.hexagon(1);
    hexes.push(new Hex(-2, 0, 1));
    expect(() => initTiles(hexes, 0)).toThrowError();
  });
});
