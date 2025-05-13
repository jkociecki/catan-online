import React from 'react';
import { GameState, getEmptyGameState } from './GameState';
import { GameDirector } from './GameDirector';

interface GameProps {
  director: GameDirector;
  children?: React.ReactNode;

}

const game: GameState = getEmptyGameState();

export const GameContext = React.createContext(game);

/**
 * Game controller. Will set up a context for all the views
 * to nurture from it.
 * Every time the Game Director informs of a change in Game State,
 * this context provider will get updated and the UI will receive it.
 */
export const Game: React.FC<GameProps> = ({ director, children }) => {
  const [gameState, setGameState] = React.useState(game);

  const onStateChange = (newState: GameState) => {
    setGameState(newState);
  };

  director.registerStateChangeCb(onStateChange);

  return (
    <GameContext.Provider value={gameState}>{children}</GameContext.Provider>
  );
};

Game.displayName = 'Game';
