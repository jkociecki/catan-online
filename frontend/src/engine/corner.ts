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

  // Dodana metoda do pobierania wierzchołków
  getVertices(): string[] {
    // Jeśli mamy tylko jeden wierzchołek, spróbujmy skonstruować brakujące
    if (this.vertices.length === 1) {
      // Pobierz współrzędne jedynego wierzchołka
      const coords = this.vertices[0].split(",").map(Number);
      if (coords.length === 3) {
        const [q, r, s] = coords;

        // Wygeneruj brakujące wierzchołki dla narożnika
        // North corner (góra) - musimy wiedzieć, czy to North czy South
        // Ta heurystyka zakłada, że jeśli r jest dodatnie, to to najprawdopodobniej South corner
        if (r > 0) {
          // South corner logic - dodajemy sąsiednie wierzchołki na południe
          this.addVertex(`${q},${r + 1},${s - 1}`);
          this.addVertex(`${q - 1},${r + 1},${s}`);
        } else {
          // North corner logic - dodajemy sąsiednie wierzchołki na północ
          this.addVertex(`${q + 1},${r - 1},${s}`);
          this.addVertex(`${q + 1},${r},${s - 1}`);
        }
      }
    }

    return this.vertices;
  }
}
