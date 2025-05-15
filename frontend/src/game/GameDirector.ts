import { GameState, getEmptyGameState } from './GameState';
import { BasicGameConfig } from './config';
import { Player } from '../engine/player';
/**
 * Game engine. State machine thru the different states of the game.
 *
 * This instance will take care of the following work:
 * - Initialize the game (from config)
 * - Orchestrate turns
 * - Drive each phase within each turn
 *
 * It's basically the brain of the game, enabling/disabling UI depending
 * the moment of the game we're in.
 * It'll init an update an instance of GameState, which will be fed to
 * Game.tsx to provide context to the entire game.
 */

/**
 * State machine (WIP)
 * - Player
 */

type StateChangeCb = (newState: GameState) => void;

/**
 * Helpers
 * TODO: Move to a helpers file
 */
function pickFirstPlayer(players: Player[]): Player {
  return players[Math.floor(Math.random() * players.length)];
}

export class GameDirector {
  private gameState: GameState;
  private stateChangeCb: StateChangeCb = () => {};
  // This will be initialized after "creating" players
  private gameConfig: BasicGameConfig;

  /**
   * Constructor
   * @param stateChangeCallback Function given to GameDirector instance to
   *        propagate changes in the state of the game. Used by Game.tsx to
   *        update React Context and keep UI in sync.
   */
  constructor() {
    this.gameConfig = new BasicGameConfig();
    this.gameState = getEmptyGameState();
  }

  getState() {
    return this.gameState;
  }

  getConfig() {
    return this.gameConfig;
  }

  /**
   * Call this method every time we make changes to the state.
   * To ensure we always propagate it.
   */
  private updateGameState(changes: Partial<GameState>) {
    this.gameState = { ...this.gameState, ...changes };
    this.stateChangeCb(this.gameState);
  }

  registerStateChangeCb(cb: StateChangeCb) {
    // TODO: Maybe we might accept multiple callbacks? For now, just one.
    this.stateChangeCb = cb;
  }

  // Method to provide player when starting a new game
  addPlayer(player: Player) {
    if (this.gameState.players.length >= this.gameConfig.maxPlayers) {
      throw new Error('[Game Director] Reached max number of players.');
    }
    this.gameState.players.push(player);
  }

  startGame() {
    const numPlayers = this.gameState.players.length;
    if (numPlayers <= 1) {
      throw new Error(
        `[Game Director] Need more players to start a game. Currently: ${numPlayers}`
      );
    }

    this.updateGameState({
      // Randomly select who starts
      currentPlayer: pickFirstPlayer(this.gameState.players)
      // TODO: Move to 'initialSetup'
      // currentPhase: 'initialSetup'
    });
  }
}
