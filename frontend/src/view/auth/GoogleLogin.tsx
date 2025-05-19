import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20px;
`;

const LoginCard = styled.div`
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  text-align: center;
`;

const Logo = styled.div`
  margin-bottom: 30px;
  
  img {
    width: 80px;
    height: 80px;
  }
`;

const Title = styled.h1`
  color: #2c3e50;
  font-size: 24px;
  margin-bottom: 20px;
`;

const Subtitle = styled.p`
  color: #7f8c8d;
  margin-bottom: 30px;
  font-size: 16px;
`;

const GoogleButton = styled.button`
  background-color: #4285f4;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 12px 24px;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: #357ae8;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(66, 133, 244, 0.2);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const GoogleIcon = styled.img`
  width: 24px;
  height: 24px;
`;

const BackLink = styled.a`
  color: #4285f4;
  text-decoration: none;
  margin-top: 20px;
  display: inline-block;
  transition: all 0.2s ease;
  
  &:hover {
    color: #357ae8;
    text-decoration: underline;
  }
`;

const InfoBox = styled.div`
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 15px;
  margin: 20px 0;
  text-align: left;
  font-size: 14px;
  color: #666;
  
  h3 {
    color: #2c3e50;
    margin: 0 0 10px 0;
    font-size: 16px;
  }
  
  ul {
    margin: 0;
    padding-left: 20px;
  }
  
  li {
    margin: 5px 0;
  }
`;

export default function GoogleLogin() {
  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:8000/accounts/google/login/';
  };

  return (
    <Container>
      <LoginCard>
        <Logo>
          <img src="/logo.png" alt="Catan Logo" />
        </Logo>
        <Title>Welcome to Catan</Title>
        <Subtitle>Sign in with your Google account to continue</Subtitle>
        
        <InfoBox>
          <h3>Why sign in with Google?</h3>
          <ul>
            <li>Save your game progress</li>
            <li>Play with friends</li>
            <li>Track your achievements</li>
            <li>Access your game history</li>
          </ul>
        </InfoBox>
        
        <GoogleButton onClick={handleGoogleLogin}>
          <GoogleIcon src="https://www.google.com/favicon.ico" alt="Google" />
          Continue with Google
        </GoogleButton>
        
        <BackLink href="/">← Back to login</BackLink>
      </LoginCard>
    </Container>
  );
} 