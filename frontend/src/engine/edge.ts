import { Player } from './player';

enum EdgeType {
  Road
  // Bridge // Currently unused. For potential expansion
}

interface EdgeOccupation {
  owner: Player;
  type: EdgeType;
}

export class Edge {
  private occupation: EdgeOccupation | undefined;

  constructor(owner?: Player, type: EdgeType = EdgeType.Road) {
    if (owner) {
      this.occupation = {
        owner,
        type
      };
    }
  }

  // TODO: Getters/setters/checkers
  placeRoad(owner: Player) {
    if (this.occupation && this.occupation.owner !== owner) {
      throw new Error(
        'There is already a road in this edge, owned by ' +
          this.occupation?.owner.getName()
      );
    }

    this.occupation = {
      owner,
      type: EdgeType.Road
    };
  }

  getOwner(): Player | null {
    return this.occupation?.owner || null;
  }
}
