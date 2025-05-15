import { Board } from './engine/board';
import './styles.css';
import { CatanBoard } from './view/CatanBoard';
import { Game } from './game/Game';
import { GameDirector } from './game/GameDirector';

/**
 * What's next?
 * - Edge Component for tiles
 * - Corner/Edge suggestion style (dashed around the edge/corner?, player color)
 * - click-to-build (road or settlement)
 * - [Debug] Toggle diceNumbers
 */

export default function App() {
  const gameDirector = new GameDirector();
  const board = new Board(2, gameDirector.getConfig());

  return (
    <div className="App">
      <h1>Catan</h1>
        <Game director={gameDirector}>
          <CatanBoard board={board} />
        </Game>
    </div>
  );
}
