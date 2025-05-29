// frontend/src/App.tsx - OCZYSZCZONA WERSJA
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./styles.css";
import RoomJoin from "./view/room/RoomJoin";
import RoomLobby from "./view/room/LobbyRoom";
import Login from "./view/auth/Login";
import AuthCallback from "./view/auth/AuthCallback";
import GoogleLogin from "./view/auth/GoogleLogin";
import { AuthProvider } from "./context/AuthContext";
import SimpleOnlineGame from "./view/game/SimpleOnlineGame";

const App: React.FC = () => {
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
                  useSimpleService={true}
                />
              }
            />
            <Route path="/game/:roomId" element={<SimpleOnlineGame />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
