import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./styles.css";
import { CatanBoard } from "./view/CatanBoard";
import { Game } from "./game/Game";
import { GameDirector } from "./game/GameDirector";
import { useEffect, useState } from "react";
import { PlayerResourcesDisplay } from "./view/PlayerResources";
import RoomJoin from "./view/room/RoomJoin";
import RoomLobby from "./view/room/LobbyRoom";
import OnlineGame from "./view/game/OnlineGame";
import { Board } from "./engine/board";
import { BasicGameConfig } from "./game/config";
import Login from "./view/auth/Login";
import AuthCallback from "./view/auth/AuthCallback";
import GoogleLogin from "./view/auth/GoogleLogin";
import { AuthProvider } from "./context/AuthContext";
import CatanSVGBoard from "./view/board/CatanSVGBoard";
import TestPage from "./view/TestPage";

/**
 * What's next?
 * - Edge Component for tiles
 * - Corner/Edge suggestion style (dashed around the edge/corner?, player color)
 * - click-to-build (road or settlement)
 * - [Debug] Toggle diceNumbers
 */

const App: React.FC = () => {
  const [board] = useState(() => new Board(2, new BasicGameConfig()));

  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/auth-callback" element={<AuthCallback />} />
            <Route path="/google-login" element={<GoogleLogin />} />
            <Route path="/room/new" element={<RoomJoin />} />
            <Route
              path="/room/:roomId"
              element={
                <RoomLobby
                  roomId={window.location.pathname.split("/").pop() || ""}
                />
              }
            />
            <Route path="/game/:roomId" element={<OnlineGame />} />
            <Route
              path="/local-game"
              element={
                <div>
                  <h1>Catan - Local Game</h1>
                  <div
                    style={{ display: "flex", gap: "20px", padding: "20px" }}
                  >
                    <div style={{ flex: 1 }}>
                      <Game director={new GameDirector()}>
                        <CatanBoard board={board} />
                      </Game>
                    </div>
                    <div style={{ width: "300px" }}>
                      <PlayerResourcesDisplay />
                    </div>
                  </div>
                </div>
              }
            />
            <Route path="/test-svg" element={<TestPage />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
