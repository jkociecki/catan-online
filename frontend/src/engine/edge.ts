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
  private vertices: string[] = []; // Dodane pole przechowujące współrzędne wierzchołków

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

  // Dodana metoda do zarządzania wierzchołkami
  addVertex(vertex: string): void {
    if (!this.vertices.includes(vertex)) {
      this.vertices.push(vertex);
    }
  }

    // In edge.ts
    getVertices(): string[] {
      // For edges, we need exactly 2 vertices
      if (this.vertices.length > 0) {
        const uniqueVertices = Array.from(new Set(this.vertices));
        
        // Just return the first 2 if we have too many
        if (uniqueVertices.length > 2) {
          return uniqueVertices.slice(0, 2);
        }
        
        return uniqueVertices;
      }
      
      return [];
    }
}