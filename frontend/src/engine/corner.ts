import { Player } from "./player";
import { Resource, Generic } from "./types";

enum Reward {
  Settlement = 1,
  City = 2,
}

export interface Occupation {
  owner: Player;
  reward: Reward;
}

type Harbor = Resource | Generic;

export class Corner {
  private vertices: string[] = []; // Dodane pole przechowujące współrzędne wierzchołków

  constructor(private harbor?: Harbor, private occupation?: Occupation) {}

  // TODO: getters/setters/checkers?
  placeSettlement(owner: Player) {
    this.occupation = {
      owner,
      reward: Reward.Settlement,
    };
  }

  placeCity(owner: Player) {
    if (!this.occupation || this.occupation.owner !== owner) {
      throw new Error(
        "A city cannot be placed if a player did not own a settlement before"
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

  // Dodana metoda do zarządzania wierzchołkami
  addVertex(vertex: string): void {
    if (!this.vertices.includes(vertex)) {
      this.vertices.push(vertex);
    }
  }

  getVertices(): string[] {
    // We need exactly 3 coordinates for a corner
    if (this.vertices.length > 0) {
      // Make sure we return exactly 3 unique vertices
      const uniqueVertices = Array.from(new Set(this.vertices));
      
      // If we have too many, just take the first 3
      if (uniqueVertices.length > 3) {
        return uniqueVertices.slice(0, 3);
      }
      
      // If we don't have enough, try to generate the missing ones
      if (uniqueVertices.length === 1) {
        const coords = uniqueVertices[0].split(",").map(Number);
        if (coords.length === 3) {
          const [q, r, s] = coords;
          
          // Determine if this is a North or South corner based on the coordinates
          // For North corners, s is negative, for South corners, s is positive
          if (s < 0) {
            // North corner
            return [
              uniqueVertices[0],
              `${q+1},${r},${s-1}`,
              `${q+1},${r-1},${s}`
            ];
          } else {
            // South corner
            return [
              uniqueVertices[0],
              `${q},${r+1},${s-1}`,
              `${q-1},${r+1},${s}`
            ];
          }
        }
      }
      
      return uniqueVertices;
    }
    
    return [];
  }
}
