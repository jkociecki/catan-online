import { Routes, Route, BrowserRouter } from 'react-router-dom';
import './styles.css';
import RoomJoin from './view/room/RoomJoin';
import RoomLobby from './view/room/LobbyRoom';
import OnlineGame from './view/game/OnlineGame';

export default function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route path="/" element={<RoomJoin />} />
          <Route path="/room/:roomId" element={<RoomLobby roomId={window.location.pathname.split('/').pop() || ''} />} />
          <Route path="/game" element={<OnlineGame />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}