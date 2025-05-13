import { Player } from '../engine/player';

/**
 * Instance holding the entire state of the game in a given moment.
 * It's basically a typed object (like pretty much any state...)
 * It serves multiple purposes:
 * - It's the main source of truth of a game in every moment
 * - It pairs up with GameDirector to drive the game
 * - It serves as the context for rendering the UI thru Game.tsx
 */
export interface GameState {
  players: Player[];
  currentPlayer?: Player;

  // Future data
  // - diceNumber
  // - currentPhase ('dice'|'trade'|'construction'|'initialSetup')
}

export function getEmptyGameState(): GameState {
  return {
    players: []
  };
}
