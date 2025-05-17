import { Routes, Route, BrowserRouter } from 'react-router-dom';
import './styles.css';
import { CatanBoard } from './view/CatanBoard';
import { Game } from './game/Game';
import { GameDirector } from './game/GameDirector';
import { useEffect, useState } from 'react';
import { PlayerResourcesDisplay } from './view/PlayerResources';
import RoomJoin from './view/room/RoomJoin';
import RoomLobby from './view/room/LobbyRoom';
import OnlineGame from './view/game/OnlineGame';
import { Board } from './engine/board';
import { BasicGameConfig } from './game/config';
import Navbar from './view/auth/NavBar';
import Login from './view/auth/Login';
import Profile from './view/auth/Profile';
import AuthCallback from './view/auth/AuthCallback';

/**
 * What's next?
 * - Edge Component for tiles
 * - Corner/Edge suggestion style (dashed around the edge/corner?, player color)
 * - click-to-build (road or settlement)
 * - [Debug] Toggle diceNumbers
 */

export default function App() {
  const [board] = useState(() => new Board(2, new BasicGameConfig()));

  return (
    <BrowserRouter>
      <div className="App">
        <Navbar />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/auth-callback" element={<AuthCallback />} />
          <Route path="/" element={<RoomJoin />} />
          <Route path="/room/:roomId" element={<RoomLobby roomId={window.location.pathname.split('/').pop() || ''} />} />
          <Route path="/game/:roomId" element={<OnlineGame />} />
          <Route path="/local-game" element={
            <div>
              <h1>Catan - Local Game</h1>
              <div style={{ display: 'flex', gap: '20px', padding: '20px' }}>
                <div style={{ flex: 1 }}>
                  <Game director={new GameDirector()}>
                    <CatanBoard board={board} />
                  </Game>
                </div>
                <div style={{ width: '300px' }}>
                  <PlayerResourcesDisplay />
                </div>
              </div>
            </div>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  );
}