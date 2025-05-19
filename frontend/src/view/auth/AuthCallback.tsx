import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: #f5f5f5;
`;

const Spinner = styled.div`
  border: 5px solid #f3f3f3;
  border-top: 5px solid #4caf50;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const Message = styled.div`
  font-size: 18px;
  color: #333;
  text-align: center;
  max-width: 400px;
  margin: 0 20px;
`;

const ErrorMessage = styled(Message)`
  color: #d32f2f;
`;

const SuccessMessage = styled(Message)`
  color: #2e7d32;
`;

const fetchUserProfile = async (token: string) => {
    const endpoints = [
        'http://localhost:8000/api/auth/users/profile/',
        'http://localhost:8000/api/auth/users/me/',
        'http://localhost:8000/api/auth/profile/',
        'http://localhost:8000/api/auth/me/'
    ];

    for (const endpoint of endpoints) {
        try {
            console.log(`Trying endpoint: ${endpoint}`);
            const response = await fetch(endpoint, {
                headers: {
                    'Authorization': `Token ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log(`Success from ${endpoint}:`, data);
                return data;
            } else {
                console.log(`Failed from ${endpoint}:`, response.status);
            }
        } catch (error) {
            console.log(`Error from ${endpoint}:`, error);
        }
    }
    
    throw new Error('Failed to fetch user profile from all endpoints');
};

export default function AuthCallback() {
    const navigate = useNavigate();
    const location = useLocation();
    const [status, setStatus] = useState('Authenticating...');
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        console.log("Auth callback mounted. Search params:", location.search);
        const params = new URLSearchParams(location.search);
        const token = params.get('token');

        if (!token) {
            console.error("No token found in URL");
            setStatus('Authentication failed. No token received.');
            setIsError(true);
            setTimeout(() => navigate('/'), 3000);
            return;
        }

        console.log("Token received:", token);
        // Save token
        localStorage.setItem('auth_token', token);

        // Get user data
        fetchUserProfile(token)
            .then(userData => {
                console.log("User data received:", userData);
                localStorage.setItem('user_data', JSON.stringify(userData));
                setStatus('Login successful! Redirecting to game...');
                setIsError(false);
                setTimeout(() => navigate('/room/new'), 1500);
            })
            .catch(error => {
                console.error('Error fetching user data:', error);
                setStatus('Failed to get user profile. Please try logging in again.');
                setIsError(true);
                setTimeout(() => navigate('/'), 3000);
            });
    }, [navigate, location]);

    return (
        <Container>
            <Spinner />
            {isError ? (
                <ErrorMessage>{status}</ErrorMessage>
            ) : (
                <SuccessMessage>{status}</SuccessMessage>
            )}
        </Container>
    );
} 