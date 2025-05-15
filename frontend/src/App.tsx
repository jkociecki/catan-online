import { Board } from './engine/board';
import './styles.css';
import { CatanBoard } from './view/CatanBoard';
import { Game } from './game/Game';
import { GameDirector } from './game/GameDirector';
import { useEffect, useState } from 'react';

/**
 * What's next?
 * - Edge Component for tiles
 * - Corner/Edge suggestion style (dashed around the edge/corner?, player color)
 * - click-to-build (road or settlement)
 * - [Debug] Toggle diceNumbers
 */

export default function App() {
  const [board, setBoard] = useState<Board | null>(null);
  const gameDirector = new GameDirector();

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/board/');
        const data = await response.json();
        const newBoard = new Board(2, gameDirector.getConfig());
        newBoard.loadFromData(data);
        setBoard(newBoard);
      } catch (error) {
        console.error('Error fetching board:', error);
      }
    };

    fetchBoard();
  }, []);

  if (!board) {
    return <div>Loading...</div>;
  }

  return (
    <div className="App">
      <h1>Catan</h1>
      <Game director={gameDirector}>
        <CatanBoard board={board} />
      </Game>
    </div>
  );
}
