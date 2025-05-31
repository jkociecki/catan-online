import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../../context/AuthContext';
import SimpleGameService from '../board/SimpleGameService';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  background-color: #f5f5f5;
`;

const Card = styled.div`
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 400px;
  width: 90%;
`;

const Title = styled.h1`
  color: #2c3e50;
  font-size: 24px;
  margin-bottom: 20px;
`;

const Message = styled.p`
  color: #666;
  margin-bottom: 20px;
`;

const ErrorMessage = styled.p`
  color: #d32f2f;
  background-color: #ffebee;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
`;

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, setToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async (token: string) => {
      try {
        // Save token to localStorage first
        localStorage.setItem('auth_token', token);

        // First verify the token is valid
        const testResponse = await fetch('http://localhost:8000/api/auth/test-token/', {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!testResponse.ok) {
          throw new Error('Invalid token');
        }

        // Now fetch user profile
        const response = await fetch('http://localhost:8000/api/auth/profile/', {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const userData = await response.json();
          console.log('User data fetched successfully:', userData);

          // Save user data to localStorage
          localStorage.setItem('user_data', JSON.stringify(userData));

          // Update auth context
          setUser(userData);
          setToken(token);

          // Set user data in SimpleGameService
          SimpleGameService.setUserData(
            userData.display_name || userData.username,
            userData.preferred_color || 'blue'
          );

          // Redirect to game room
          navigate('/room/new');
        } else {
          throw new Error(`Failed to fetch user data: ${response.status}`);
        }
      } catch (err) {
        console.error('Error in auth flow:', err);
        setError(err instanceof Error ? err.message : 'Network or server error. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    // Get token from URL params
    const token = new URLSearchParams(location.search).get('token');
    if (token) {
      fetchUserData(token);
    } else {
      setError('No authentication token found');
      setLoading(false);
    }
  }, [location, navigate, setUser, setToken]);

  return (
    <Container>
      <Card>
        <Title>Authentication</Title>
        {loading ? (
          <Message>Logging you in...</Message>
        ) : error ? (
          <ErrorMessage>{error}</ErrorMessage>
        ) : (
          <Message>Success! Redirecting...</Message>
        )}
      </Card>
    </Container>
  );
};

export default AuthCallback; 