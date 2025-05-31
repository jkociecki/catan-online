// frontend/src/App.tsx - UPDATED VERSION WITH NAVIGATION
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./styles.css";
import Home from "./view/Home";
import RoomJoin from "./view/room/RoomJoin";
import RoomLobby from "./view/room/LobbyRoom";
import Login from "./view/auth/Login";
import AuthCallback from "./view/auth/AuthCallback";
import GoogleLogin from "./view/auth/GoogleLogin";
import ActiveGames from "./view/ActiveGames";
import Statistics from "./view/Statistics";
import Profile from "./view/Profile";
import { AuthProvider } from "./context/AuthContext";
import SimpleOnlineGame from "./view/game/SimpleOnlineGame";
import NavBar from "./navigation/NavigationBar";

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/auth-callback" element={<AuthCallback />} />
            <Route path="/google-login" element={<GoogleLogin />} />
            
            {/* Main app routes */}
            <Route path="/" element={<Home />} />
            <Route path="/active-games" element={<ActiveGames />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/room/new" element={<RoomJoin />} />
            
            {/* Game routes */}
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