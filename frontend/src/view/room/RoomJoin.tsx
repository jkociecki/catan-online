import React, { useState, useEffect } from "react";
import SimpleGameService from "../board/SimpleGameService";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";
import NavBar from "../../navigation/NavigationBar";

// ✅ DOKŁADNIE jak SimpleOnlineGame - kompaktowo, profesjonalnie
const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #fafafa;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
    sans-serif;
  color: #1e293b;
  overflow: hidden;
`;

const TopBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
`;

const UserAvatar = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
`;

const UserName = styled.div`
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
`;

const GuestBadge = styled.span`
  background-color: #f1f5f9;
  color: #64748b;
  padding: 1px 4px;
  border-radius: 6px;
  font-size: 9px;
  margin-left: 4px;
  font-weight: 500;
`;

const LogoutButton = styled.button`
  background: #64748b;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #475569;
    transform: translateY(-1px);
  }
`;

const Title = styled.h1`
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: #1e293b;
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const Container = styled.div`
  max-width: 450px;
  width: 100%;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  overflow: hidden;
`;

const Section = styled.div`
  padding: 20px;
  border-bottom: 1px solid #f1f5f9;

  &:last-child {
    border-bottom: none;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;

const SectionIcon = styled.span`
  font-size: 16px;
  width: 20px;
  display: flex;
  justify-content: center;
`;

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: #1e293b;
`;

const SectionDescription = styled.p`
  font-size: 13px;
  color: #64748b;
  margin: 0 0 16px 0;
  line-height: 1.4;
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  margin: 8px 0 16px 0;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  background: #fafafa;
  color: #1e293b;
  transition: all 0.2s;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    background: white;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:disabled {
    background: #f1f5f9;
    color: #94a3b8;
    cursor: not-allowed;
  }

  &::placeholder {
    color: #94a3b8;
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;

  &:hover:not(:disabled) {
    background: #2563eb;
    border-color: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  &:disabled {
    background: #f8fafc;
    border-color: #e2e8f0;
    color: #94a3b8;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const StatusMessage = styled.div`
  margin: 16px 20px;
  padding: 12px 16px;
  background: #f0f9ff;
  border-radius: 8px;
  border: 1px solid #bae6fd;
  color: #0c4a6e;
  font-size: 13px;
  font-weight: 500;
`;

const ErrorMessage = styled.div`
  color: #dc2626;
  margin: 16px 20px;
  padding: 12px 16px;
  background: #fef2f2;
  border-radius: 8px;
  border: 1px solid #fecaca;
  font-size: 13px;
  font-weight: 500;
`;

const LoadingSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid #f1f5f9;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const SettingsButton = styled.button<{ primary?: boolean }>`
  background: ${props => props.primary ? '#3b82f6' : 'white'};
  color: ${props => props.primary ? 'white' : '#64748b'};
  border: 1px solid ${props => props.primary ? '#3b82f6' : '#e2e8f0'};
  padding: ${props => props.primary ? '8px 16px' : '4px 6px'};
  border-radius: ${props => props.primary ? '6px' : '4px'};
  font-size: ${props => props.primary ? '12px' : '14px'};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.primary ? '#2563eb' : '#f8fafc'};
    transform: translateY(-1px);
  }
`;

const SettingsModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const SettingsContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
`;

const SettingsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #64748b;

  &:hover {
    color: #ef4444;
  }
`;

const SettingsSection = styled.div`
  margin-bottom: 20px;
`;

const SettingsSectionTitle = styled.h4`
  margin: 0 0 12px 0;
  color: #1e293b;
  font-size: 14px;
`;

const ColorGrid = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
`;

const ColorOption = styled.div<{ color: string; selected: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: ${props => props.color};
  cursor: pointer;
  border: 3px solid ${props => props.selected ? '#333' : 'transparent'};
  transition: all 0.2s;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
`;

const SettingsButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

export default function RoomJoin() {
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuth();
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedSettingsColor, setSelectedSettingsColor] = useState(user?.preferred_color || 'red');
  const colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple'];

  useEffect(() => {
    if (user?.preferred_color) {
      setSelectedSettingsColor(user.preferred_color);
    }
  }, [user]);

  const updateUserSettings = () => {
    if (user) {
      const updatedUser = {
        ...user,
        preferred_color: selectedSettingsColor
      };

      // Update AuthContext
      setUser(updatedUser);

      // Update localStorage
      localStorage.setItem('user_data', JSON.stringify(updatedUser));

      // Update SimpleGameService
      SimpleGameService.setUserData(
        user.display_name || user.username,
        selectedSettingsColor
      );

      setShowSettings(false);
    }
  };

  const handleCreate = async () => {
    setIsLoading(true);
    setError(null);
    setStatus("Creating a new game room...");

    try {
      const newRoomId = await SimpleGameService.createRoom();
      const normalizedRoomId = newRoomId.toLowerCase();

      setStatus(`Room created! Room ID: ${normalizedRoomId}. Connecting...`);

      try {
        await SimpleGameService.connectToRoom(normalizedRoomId);
        setStatus(`Connected to room ${normalizedRoomId}! Redirecting...`);
        navigate(`/room/${normalizedRoomId}`);
      } catch (connectError) {
        console.error("Error connecting to room:", connectError);
        setError(
          `Created room but couldn't connect. Please try joining with room ID: ${normalizedRoomId}`
        );
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Room creation error:", err);
      setError(err instanceof Error ? err.message : "Failed to create room");
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!roomId.trim()) {
      setError("Please enter a room code");
      return;
    }

    const normalizedRoomId = roomId.trim().toLowerCase();

    setIsLoading(true);
    setError(null);
    setStatus(`Connecting to room ${normalizedRoomId}...`);

    try {
      await SimpleGameService.connectToRoom(normalizedRoomId);
      setStatus(`Connected to room ${normalizedRoomId}! Redirecting...`);
      navigate(`/room/${normalizedRoomId}`);
    } catch (err) {
      console.error("Room join error:", err);
      setError(
        "Failed to join room - make sure the server is running and the room ID is correct"
      );
      setIsLoading(false);
    }
  };

  return (
    <AppContainer>

      <NavBar />


      <MainContent>
        <Container>
          <Section>
            <SectionHeader>
              <SectionIcon>✨</SectionIcon>
              <SectionTitle>Create New Game</SectionTitle>
            </SectionHeader>
            <SectionDescription>
              Start a new game room and share the code with friends
            </SectionDescription>
            <Button onClick={handleCreate} disabled={isLoading}>
              {isLoading ? (
                <>
                  <LoadingSpinner />
                  Creating...
                </>
              ) : (
                "Create Game Room"
              )}
            </Button>
          </Section>

          <Section>
            <SectionHeader>
              <SectionIcon>🚪</SectionIcon>
              <SectionTitle>Join Existing Game</SectionTitle>
            </SectionHeader>
            <SectionDescription>
              Enter a room code to join a friend's game
            </SectionDescription>
            <Input
              type="text"
              placeholder="Enter Room Code"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toLowerCase())}
              disabled={isLoading}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !isLoading) {
                  handleJoin();
                }
              }}
            />
            <Button onClick={handleJoin} disabled={isLoading || !roomId.trim()}>
              {isLoading ? (
                <>
                  <LoadingSpinner />
                  Joining...
                </>
              ) : (
                "Join Game"
              )}
            </Button>
          </Section>

          {status && <StatusMessage>{status}</StatusMessage>}
          {error && <ErrorMessage>{error}</ErrorMessage>}
        </Container>
      </MainContent>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal onClick={() => setShowSettings(false)}>
          <SettingsContent onClick={(e) => e.stopPropagation()}>
            <SettingsHeader>
              <h3 style={{ margin: 0, color: '#1e293b' }}>⚙️ Settings</h3>
              <CloseButton onClick={() => setShowSettings(false)}>×</CloseButton>
            </SettingsHeader>

            <SettingsSection>
              <SettingsSectionTitle>Preferred Color</SettingsSectionTitle>
              <ColorGrid>
                {colors.map(color => (
                  <ColorOption
                    key={color}
                    color={color}
                    selected={selectedSettingsColor === color}
                    onClick={() => setSelectedSettingsColor(color)}
                  />
                ))}
              </ColorGrid>
            </SettingsSection>

            <SettingsButtons>
              <SettingsButton onClick={() => setShowSettings(false)}>
                Cancel
              </SettingsButton>
              <SettingsButton primary onClick={updateUserSettings}>
                Save Changes
              </SettingsButton>
            </SettingsButtons>
          </SettingsContent>
        </SettingsModal>
      )}
    </AppContainer>
  );
}
