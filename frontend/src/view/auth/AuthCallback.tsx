import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';

const LoadingContainer = styled.div`
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
`;

export default function AuthCallback() {
    const navigate = useNavigate();
    const location = useLocation();
    const [status, setStatus] = useState('Authenticating...');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const token = params.get('token');

        if (!token) {
            setStatus('Authentication failed. No token received.');
            setTimeout(() => navigate('/login'), 2000);
            return;
        }

        // Save token
        localStorage.setItem('auth_token', token);

        // Get user data
        setStatus('Getting user profile...');
        fetch('http://localhost:8000/api/auth/users/profile/', {
            headers: {
                'Authorization': `Token ${token}`
            }
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch user profile');
                }
                return response.json();
            })
            .then(userData => {
                localStorage.setItem('user_data', JSON.stringify(userData));
                setStatus('Login successful! Redirecting...');
                setTimeout(() => navigate('/'), 1000);
            })
            .catch(error => {
                console.error('Error fetching user data:', error);
                setStatus('Failed to get user profile. Redirecting to login...');
                setTimeout(() => navigate('/login'), 2000);
            });
    }, [navigate, location]);

    return (
        <LoadingContainer>
            <Spinner />
            <Message>{status}</Message>
        </LoadingContainer>
    );
} 