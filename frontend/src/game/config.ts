import { Resource } from '../engine/types';

export interface TileGameData {
  resource: Resource;
  diceNumber: number;
}

/**
 * Randomize resources in layout, if we want it to change
 */
function randomizeLayoutResources(
  layout: { [tileId: string]: TileGameData },
  numResources: { [resource: number]: number }
) {
  // TODO
}

export class BasicGameConfig {
  public readonly maxPlayers: number; // not very useful. Might want to remove.
  public readonly numResources: { [resource: number]: number };
  public readonly boardRadius: number;
  public readonly resourcesLayout: { [tileId: string]: TileGameData };

  constructor(randomizeResources = false) {
    this.maxPlayers = 4;
    this.boardRadius = 2;
    this.numResources = {
      [Resource.Clay]: 3,
      [Resource.Sheep]: 4,
      [Resource.Stone]: 3,
      [Resource.Wheat]: 4,
      [Resource.Wood]: 4,
      [Resource.Desert]: 1
    };
    this.resourcesLayout = {
      '0,-2,2': { resource: Resource.Wood, diceNumber: 6 },
      '1,-2,1': { resource: Resource.Sheep, diceNumber: 3 },
      '2,-2,0': { resource: Resource.Sheep, diceNumber: 8 },
      '-1,-1,2': { resource: Resource.Wheat, diceNumber: 2 },
      '0,-1,1': { resource: Resource.Stone, diceNumber: 4 },
      '1,-1,0': { resource: Resource.Wheat, diceNumber: 5 },
      '2,-1,-1': { resource: Resource.Wood, diceNumber: 10 },
      '-2,0,2': { resource: Resource.Wood, diceNumber: 5 },
      '-1,0,1': { resource: Resource.Clay, diceNumber: 9 },
      '0,0,0': { resource: Resource.Desert, diceNumber: 0 },
      '1,0,-1': { resource: Resource.Stone, diceNumber: 6 },
      '2,0,-2': { resource: Resource.Wheat, diceNumber: 9 },
      '-2,1,1': { resource: Resource.Wheat, diceNumber: 10 },
      '-1,1,0': { resource: Resource.Stone, diceNumber: 11 },
      '0,1,-1': { resource: Resource.Wood, diceNumber: 3 },
      '1,1,-2': { resource: Resource.Sheep, diceNumber: 12 },
      '-2,2,0': { resource: Resource.Clay, diceNumber: 8 },
      '-1,2,-1': { resource: Resource.Sheep, diceNumber: 4 },
      '0,2,-2': { resource: Resource.Clay, diceNumber: 11 }
      // WIP
    };

    if (randomizeResources) {
      randomizeLayoutResources(this.resourcesLayout, this.numResources);
    }
  }
}
