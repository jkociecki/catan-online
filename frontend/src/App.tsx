// frontend/src/App.tsx - poprawka typów
import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./styles.css";
import { CatanBoard } from "./view/CatanBoard";
import { Game } from "./game/Game";
import { GameDirector } from "./game/GameDirector";
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
import OnlineCatanSVGBoard from "./view/board/OnlineCatanSVGBoard";
import SimpleGameService from "./view/board/SimpleGameService";
import SimpleOnlineGame from "./view/game/SimpleOnlineGame"; // NOWY IMPORT

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
            <Route
              path="/room/:roomId"
              element={
                <RoomLobby
                  roomId={window.location.pathname.split("/").pop() || ""}
                  useSimpleService={true} // NOWY PROP
                />
              }
            />
            <Route path="/game/:roomId" element={<SimpleOnlineGame />} />
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
            <Route
              path="/simple-game"
              element={
                <div style={{ padding: "20px" }}>
                  <h1>Test Simple Game</h1>
                  <SimpleGameTest />
                </div>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

function SimpleGameTest() {
  const [roomId, setRoomId] = useState<string>("");
  const [connected, setConnected] = useState<boolean>(false);
  const [gameState, setGameState] = useState<any>(null);

  const handleCreateRoom = async () => {
    try {
      const newRoomId = await SimpleGameService.createRoom();
      setRoomId(newRoomId);
      await SimpleGameService.connectToRoom(newRoomId);
      setConnected(true);

      // Listen for game updates - POPRAWIONE TYPY
      SimpleGameService.addEventHandler("game_state", (data: any) => {
        setGameState(data.game_state);
      });

      SimpleGameService.addEventHandler("game_update", (data: any) => {
        setGameState(data.game_state);
      });
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleVertexClick = (vertexId: number) => {
    SimpleGameService.buildSettlement(vertexId);
  };

  const handleEdgeClick = (edgeId: number) => {
    SimpleGameService.buildRoad(edgeId);
  };

  return (
    <div>
      {!connected ? (
        <button onClick={handleCreateRoom}>Create Test Room</button>
      ) : (
        <div>
          <p>Room: {roomId}</p>
          <OnlineCatanSVGBoard
            gameState={gameState}
            onVertexClick={handleVertexClick}
            onEdgeClick={handleEdgeClick}
            buildMode="road"
            isMyTurn={true}
          />
        </div>
      )}
    </div>
  );
}

export default App;
