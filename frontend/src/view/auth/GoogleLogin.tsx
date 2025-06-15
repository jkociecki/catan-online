import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  background-color: #f5f5f5;
`;

const LoginCard = styled.div`
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 400px;
  width: 90%;
`;

const Logo = styled.img`
  width: 80px;
  height: 80px;
  margin-bottom: 20px;
`;

const Title = styled.h1`
  color: #2c3e50;
  font-size: 24px;
  margin-bottom: 20px;
`;

const Subtitle = styled.p`
  color: #666;
  margin-bottom: 30px;
`;

const GoogleButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 12px 24px;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
  color: #333;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: #f8f8f8;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`;

const GoogleIcon = styled.img`
  width: 24px;
  height: 24px;
  margin-right: 12px;
`;

const BackLink = styled.a`
  display: inline-block;
  margin-top: 20px;
  color: #4285f4;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const GoogleLogin: React.FC = () => {
  const handleGoogleLogin = () => {
    // Directly redirect to Django's OAuth endpoint
    window.location.href = `${process.env.REACT_APP_API_URL}/accounts/google/login/`;
  };

  return (
    <Container>
      <LoginCard>
        <Logo src="/static/logo.svg" alt="Catan Logo" />
        <Title>Welcome to Catan</Title>
        <Subtitle>Sign in with your Google account to continue</Subtitle>
        <GoogleButton onClick={handleGoogleLogin}>
          <GoogleIcon src="https://www.google.com/favicon.ico" alt="Google" />
          Continue with Google
        </GoogleButton>
        <BackLink href="/">← Back to login</BackLink>
      </LoginCard>
    </Container>
  );
};

export default GoogleLogin; 