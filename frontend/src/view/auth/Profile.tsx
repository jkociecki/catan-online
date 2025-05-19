import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';

interface User {
    id: number;
    username: string;
    display_name: string | null;
    email: string;
    is_guest: boolean;
    avatar_url: string | null;
    preferred_color: string | null;
}

const NavContainer = styled.nav`
  background-color: #333;
  padding: 10px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
`;

const Logo = styled(Link)`
  color: white;
  font-size: 24px;
  font-weight: bold;
  text-decoration: none;
  
  &:hover {
    color: #ddd;
  }
`;

const NavLinks = styled.div`
  display: flex;
  gap: 15px;
  align-items: center;
`;

const NavLink = styled(Link)`
  color: white;
  text-decoration: none;
  padding: 5px 10px;
  border-radius: 4px;
  
  &:hover {
    background-color: #444;
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Avatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  background-color: #ccc;
`;

const UserName = styled.span`
  font-weight: bold;
`;

const GuestBadge = styled.span`
  background-color: #666;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 12px;
  margin-left: 5px;
`;

const LogoutButton = styled.button`
  background-color: transparent;
  color: white;
  border: 1px solid white;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
`;

const LoginButton = styled(Link)`
  background-color: #4caf50;
  color: white;
  text-decoration: none;
  padding: 5px 10px;
  border-radius: 4px;
  
  &:hover {
    background-color: #45a049;
  }
`;

export default function Navbar() {
    const [user, setUser] = useState<User | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Check if user is logged in
        const userData = localStorage.getItem('user_data');
        if (userData) {
            try {
                setUser(JSON.parse(userData));
            } catch (error) {
                console.error('Error parsing user data', error);
            }
        }
    }, []);

    const handleLogout = () => {
        // Clear authentication data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        setUser(null);

        // Redirect to login page
        navigate('/login');
    };

    return (
        <NavContainer>
            <Logo to="/">Catan Online</Logo>
            <NavLinks>
                {user ? (
                    <>
                        <NavLink to="/">Home</NavLink>
                        <NavLink to="/profile">Profile</NavLink>
                        <UserInfo>
                            <Avatar
                                src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.display_name || user.username}&background=random`}
                                alt={user.display_name || user.username}
                            />
                            <UserName>
                                {user.display_name || user.username}
                                {user.is_guest && <GuestBadge>Guest</GuestBadge>}
                            </UserName>
                            <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
                        </UserInfo>
                    </>
                ) : (
                    <LoginButton to="/login">Login</LoginButton>
                )}
            </NavLinks>
        </NavContainer>
    );
}