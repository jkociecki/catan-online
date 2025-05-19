import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../../context/AuthContext';

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

  useEffect(() => {
    const fetchUserData = async (token: string) => {
      const endpoints = [
        'http://localhost:8000/api/auth/profile/',
        'http://localhost:8000/api/auth/me/',
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          const response = await fetch(endpoint, {
            headers: {
              'Authorization': `Token ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            console.log('Success response:', data);
            setUser(data);
            setToken(token);
            navigate('/room/lobby');
            return;
          } else {
            console.log(`Failed response from ${endpoint}:`, response.status);
          }
        } catch (err) {
          console.error(`Error fetching from ${endpoint}:`, err);
        }
      }

      setError('Failed to fetch user data. Please try logging in again.');
    };

    const token = new URLSearchParams(location.search).get('token');
    if (token) {
      fetchUserData(token);
    } else {
      setError('No authentication token found. Please try logging in again.');
    }
  }, [location, navigate, setUser, setToken]);

  return (
    <Container>
      <Card>
        <Title>Processing Login</Title>
        {error ? (
          <ErrorMessage>{error}</ErrorMessage>
        ) : (
          <Message>Please wait while we complete your login...</Message>
        )}
      </Card>
    </Container>
  );
};

export default AuthCallback; 