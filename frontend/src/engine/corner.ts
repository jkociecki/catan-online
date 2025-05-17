import { Player } from './player';
import { Resource, Generic } from './types';

enum Reward {
  Settlement = 1,
  City = 2
}

export interface Occupation {
  owner: Player;
  reward: Reward;
}

type Harbor = Resource | Generic;

export class Corner {
  constructor(private harbor?: Harbor, private occupation?: Occupation) {}

  // TODO: getters/setters/checkers?
  placeSettlement(owner: Player) {
    this.occupation = {
      owner,
      reward: Reward.Settlement
    };
  }

  placeCity(owner: Player) {
    if (!this.occupation || this.occupation.owner !== owner) {
      throw new Error(
        'A city cannot be placed if a player did not own a settlement before'
      );
    }

    this.occupation.reward = Reward.City;
  }

  getOwner(): Player | null {
    return this.occupation?.owner || null;
  }

  hasSettlement(): boolean {
    return this.occupation?.reward === Reward.Settlement;
  }

  hasCity(): boolean {
    return this.occupation?.reward === Reward.City;
  }

  
}
