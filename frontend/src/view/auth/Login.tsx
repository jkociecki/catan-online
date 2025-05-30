import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import SimpleGameService from '../board/SimpleGameService';

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
  max-width: 400px;
  margin: 50px auto;
  padding: 30px;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h2`
  text-align: center;
  color: #2c3e50;
  margin-bottom: 30px;
  font-size: 28px;
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

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [guestName, setGuestName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedColor, setSelectedColor] = useState('red');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const navigate = useNavigate();

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

  const handleRegularLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${AUTH_API_URL}/users/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store authentication token and user data
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_data', JSON.stringify(data.user));

      // Redirect to home
      navigate('/');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
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
          username: guestName,
          preferred_color: selectedColor
        }),
      });

      if (!response.ok) {
        throw new Error('Guest login failed');
      }

      const data = await response.json();
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_data', JSON.stringify(data.user));

      SimpleGameService.setUserData(
        guestName || data.user.display_name || data.user.username,
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
    // Generuj losową nazwę i kolor
    const randomName = `Player_${Math.random().toString(36).substr(2, 6)}`;
    const colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    SimpleGameService.setUserData(randomName, randomColor);
    navigate('/room/new');
  };

  return (
    <AuthContainer>
      <Title>Welcome to Catan</Title>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {isLoggedIn && userData ? (
        <UserInfoBox>
          <UserAvatar
            src={userData.avatar_url || `https://ui-avatars.com/api/?name=${userData.display_name || userData.username}&background=random`}
            alt="User avatar"
          />
          <UserName>Welcome back, {userData.display_name || userData.username}!</UserName>
          <UserStatus>You are already logged in</UserStatus>
          <PlayButton onClick={() => navigate('/room/new')}>
            Play Game
          </PlayButton>
          <LogoutButton onClick={handleLogout}>
            Logout
          </LogoutButton>
        </UserInfoBox>
      ) : (
        <>
          <GoogleButton onClick={() => navigate('/google-login')}>
            <GoogleIcon src="https://www.google.com/favicon.ico" alt="Google" />
            Continue with Google
          </GoogleButton>

          <Divider><span>OR</span></Divider>

          <Form onSubmit={handleRegularLogin}>
            <Input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <Button type="submit" disabled={loading}>
              Login
            </Button>
          </Form>

          <Divider><span>OR</span></Divider>

          <GuestOptions>
            <Input
              type="text"
              placeholder="Guest Name (optional)"
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
        </>
      )}
    </AuthContainer>
  );
}