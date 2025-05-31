import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import SimpleGameService from '../board/SimpleGameService';
import { useAuth } from "../../context/AuthContext";

// Mock function for Google Sign-In
// In a real implementation, you'd use a library like react-google-login
const mockGoogleSignIn = () => {
  return new Promise((resolve) => {
    // Simulate Google auth response
    setTimeout(() => {
      resolve({
        provider: 'google',
        external_id: 'google_123456789',
        email: 'user@example.com',
        name: 'Google User',
        avatar_url: 'https://via.placeholder.com/150'
      });
    }, 1000);
  });
};

const AUTH_API_URL = 'http://localhost:8000/api/auth';

const AuthContainer = styled.div`
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
  justify-content: center;
  align-items: center;
  padding: 12px 24px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
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

const LoginContainer = styled.div`
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

const UserInfoBox = styled.div`
  background-color: #e3f2fd;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  text-align: center;
`;

const UserAvatar = styled.img`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  margin-bottom: 15px;
  border: 3px solid #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const UserName = styled.h3`
  color: #2c3e50;
  margin: 0 0 10px 0;
  font-size: 20px;
`;

const UserStatus = styled.p`
  color: #666;
  margin: 0 0 15px 0;
`;

const ActionButton = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  margin: 5px 0;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const PlayButton = styled(ActionButton)`
  background-color: #4caf50;
  color: white;
  
  &:hover {
    background-color: #45a049;
  }
`;

const LogoutButton = styled(ActionButton)`
  background-color: #f44336;
  color: white;
  
  &:hover {
    background-color: #d32f2f;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const Input = styled.input`
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 16px;
`;

const Button = styled.button`
  padding: 12px 20px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  width: 100%;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #45a049;
  }
  
  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const GoogleButton = styled(Button)`
  background-color: #4285f4;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  
  &:hover {
    background-color: #357ae8;
  }
`;

const GoogleIcon = styled.img`
  width: 20px;
  height: 20px;
`;

const DirectLink = styled.a`
  display: block;
  text-align: center;
  margin-top: 15px;
  color: #4285f4;
  text-decoration: none;
  font-size: 14px;
  
  &:hover {
    text-decoration: underline;
  }
`;

const SkipLoginButton = styled(Button)`
  background-color: #95a5a6;
  margin-top: 20px;
  
  &:hover {
    background-color: #7f8c8d;
  }
`;

const Divider = styled.div`
  margin: 20px 0;
  text-align: center;
  position: relative;
  
  &::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background-color: #ccc;
    z-index: 0;
  }
  
  span {
    background-color: #f8f8f8;
    padding: 0 10px;
    position: relative;
    z-index: 1;
    color: #666;
  }
`;

const ErrorMessage = styled.div`
  color: #f44336;
  margin: 10px 0;
  padding: 10px;
  background-color: #ffeeee;
  border-radius: 4px;
  border: 1px solid #ffcccc;
`;

const GuestOptions = styled.div`
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ColorOptions = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  margin: 10px 0;
`;

const ColorOption = styled.div<{ color: string; selected: boolean }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: ${props => props.color};
  cursor: pointer;
  border: 3px solid ${props => props.selected ? '#333' : 'transparent'};
  
  &:hover {
    transform: scale(1.1);
  }
`;

const GuestBadge = styled.span`
  background-color: #f1f5f9;
  color: #64748b;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 10px;
  margin-left: 6px;
  font-weight: 500;
`;

export default function Login() {
  const [guestName, setGuestName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedColor, setSelectedColor] = useState('red');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const navigate = useNavigate();
  const { setUser, setToken } = useAuth();

  const colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple'];

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('auth_token');
    const userDataStr = localStorage.getItem('user_data');

    if (token && userDataStr) {
      try {
        const parsedUserData = JSON.parse(userDataStr);
        setIsLoggedIn(true);
        setUserData(parsedUserData);
      } catch (e) {
        console.error("Error parsing user data", e);
        localStorage.removeItem('user_data');
        localStorage.removeItem('auth_token');
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    setIsLoggedIn(false);
    setUserData(null);
    window.location.reload();
  };

  const handleGoogleSignIn = () => {
    // Redirect to Django's Google login URL from allauth
    window.location.href = 'http://localhost:8000/accounts/google/login/';
  };

  const handleGuestLogin = async () => {
    if (!guestName) {
      setError('Please enter a name');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${AUTH_API_URL}/users/guest_login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guest_name: guestName,
          preferred_color: selectedColor
        }),
      });

      if (!response.ok) {
        throw new Error('Guest login failed');
      }

      const data = await response.json();

      // Nadpisz display_name podaną nazwą
      data.user.display_name = guestName;
      data.user.is_guest = true;

      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_data', JSON.stringify(data.user));

      // Update AuthContext
      setUser(data.user);
      setToken(data.token);

      SimpleGameService.setUserData(
        guestName,
        selectedColor
      );

      navigate('/room/new');
    } catch (err) {
      setError('Failed to login as guest');
      console.error('Guest login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipLogin = () => {
    const randomName = `Player_${Math.random().toString(36).substr(2, 6)}`;
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    // Create mock user data for skip login
    const mockUser = {
      id: Date.now(),
      username: randomName,
      email: '',
      first_name: '',
      last_name: '',
      is_authenticated: true,
      display_name: randomName,
      preferred_color: randomColor,
      avatar_url: `https://ui-avatars.com/api/?name=${randomName}&background=random`,
      is_guest: true
    };

    const mockToken = `skip_${Date.now()}`;

    // Save to localStorage and AuthContext
    localStorage.setItem('auth_token', mockToken);
    localStorage.setItem('user_data', JSON.stringify(mockUser));
    setUser(mockUser);
    setToken(mockToken);

    SimpleGameService.setUserData(randomName, randomColor);
    navigate('/room/new');
  };

  return (
    <AuthContainer>
      <TopBar>
        <Title>Catan</Title>
      </TopBar>

      <MainContent>
        <LoginContainer>
          {error && (
            <Section>
              <ErrorMessage>{error}</ErrorMessage>
            </Section>
          )}

          {isLoggedIn && userData ? (
            <Section>
              <UserInfoBox>
                <UserAvatar
                  src={userData.avatar_url || `https://ui-avatars.com/api/?name=${userData.display_name || userData.username}&background=random`}
                  alt="User avatar"
                />
                <UserName>
                  Welcome back, {userData.display_name || userData.username}!
                  {userData.is_guest && <GuestBadge>Guest</GuestBadge>}
                </UserName>
                <UserStatus>You are already logged in</UserStatus>
                <PlayButton onClick={() => navigate('/room/new')}>
                  Play Game
                </PlayButton>
                <LogoutButton onClick={handleLogout}>
                  Logout
                </LogoutButton>
              </UserInfoBox>
            </Section>
          ) : (
            <>
              <Section>
                <GoogleButton onClick={() => navigate('/google-login')}>
                  <GoogleIcon src="https://www.google.com/favicon.ico" alt="Google" />
                  Continue with Google
                </GoogleButton>
              </Section>

              <Section>
                <Divider><span>OR</span></Divider>

                <GuestOptions>
                  <Input
                    type="text"
                    placeholder="Enter your name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    disabled={loading}
                  />

                  <div>
                    <p>Choose your color:</p>
                    <ColorOptions>
                      {colors.map(color => (
                        <ColorOption
                          key={color}
                          color={color}
                          selected={selectedColor === color}
                          onClick={() => setSelectedColor(color)}
                        />
                      ))}
                    </ColorOptions>
                  </div>

                  <Button
                    onClick={handleGuestLogin}
                    disabled={loading}
                    type="button"
                  >
                    Play as Guest
                  </Button>
                </GuestOptions>

                <SkipLoginButton
                  onClick={handleSkipLogin}
                  type="button"
                >
                  Skip Login and Create Game
                </SkipLoginButton>
              </Section>
            </>
          )}
        </LoginContainer>
      </MainContent>
    </AuthContainer>
  );
}