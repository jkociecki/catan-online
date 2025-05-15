import { Board } from './board';
import { Tiles } from './boardHelpers';
import { Player } from './player';
import { TileType } from './tile';
import { getCorner, TileCornerDir, TileEdgeDir } from './tileHelpers';

describe('board', () => {
  it('should initialize hexagons with offset', () => {
    let board = new Board(0);
    expect(board.getHexes()).toHaveLength(7);
    board = new Board(1);
    expect(board.getHexes()).toHaveLength(19);
  });

  it('should init all catan tiles and offset tiles', () => {
    const board = new Board(0);
    const tiles = board.getTiles();
    expect(tiles['0,0,0'].getTileType()).toEqual(TileType.TILE);
    expect(tiles['-1,0,1'].getTileType()).toEqual(TileType.OFFSET);
    expect(tiles['0,-1,1'].getTileType()).toEqual(TileType.OFFSET);
    expect(tiles['-1,0,1'].getTileType()).toEqual(TileType.OFFSET);
    expect(tiles['0,1,-1'].getTileType()).toEqual(TileType.OFFSET);
    expect(tiles['1,-1,0'].getTileType()).toEqual(TileType.OFFSET);
    expect(tiles['1,0,-1'].getTileType()).toEqual(TileType.OFFSET);
  });
});

describe('placeSettlement', () => {
  let board: Board;
  let tiles: Tiles;
  let player: Player;

  beforeEach(() => {
    board = new Board(0);
    tiles = board.getTiles();
    player = new Player('tester', 'red');
    // prepare a settlement and 2 roads -> valid structure
    board.placeSettlement('0,0,0', TileCornerDir.N, player, true);
    board.placeRoad('0,0,0', TileEdgeDir.NE, player);
  });

  it('should work if all conditions are met', () => {
    board.placeRoad('0,0,0', TileEdgeDir.E, player);

    // Now, place a settlement, which should work
    board.placeSettlement('0,0,0', TileCornerDir.SE, player);

    const corner = getCorner(tiles['0,0,0'], TileCornerDir.SE, tiles);
    expect(corner?.hasSettlement()).toBeTruthy();
    expect(corner?.getOwner()).toBe(player);
  });

  it('should throw if no road reaches the corner', () => {
    expect(() =>
      board.placeSettlement('0,0,0', TileCornerDir.SE, player)
    ).toThrowError(
      '[Assert settlement] Unable to build. No player roads reach this corner.'
    );

    const corner = getCorner(tiles['0,0,0'], TileCornerDir.SE, tiles);
    expect(corner?.hasSettlement()).toBeFalsy();
    expect(corner?.getOwner()).toBeNull();
  });

  it('should throw if there is a settlement in a neighbor corner', () => {
    expect(() =>
      board.placeSettlement('0,0,0', TileCornerDir.NE, player)
    ).toThrowError(
      '[Assert settlement] Unable to build. A neighbor corner has a building.'
    );

    const corner = getCorner(tiles['0,0,0'], TileCornerDir.NE, tiles);
    expect(corner?.hasSettlement()).toBeFalsy();
    expect(corner?.getOwner()).toBeNull();
  });

  it('should throw if there is a settlement in a neighbor corner even on game startup', () => {
    expect(() =>
      board.placeSettlement('0,0,0', TileCornerDir.NE, player, true)
    ).toThrowError(
      '[Assert settlement] Unable to build. A neighbor corner has a building.'
    );

    const corner = getCorner(tiles['0,0,0'], TileCornerDir.NE, tiles);
    expect(corner?.hasSettlement()).toBeFalsy();
    expect(corner?.getOwner()).toBeNull();
  });
});
