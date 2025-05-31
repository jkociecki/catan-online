// frontend/src/components/NavBar.tsx
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../context/AuthContext';

const NavContainer = styled.nav`
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
  gap: 32px;
`;

const Logo = styled(Link)`
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  text-decoration: none;
  
  &:hover {
    color: #3b82f6;
  }
`;

const NavLinks = styled.div`
  display: flex;
  gap: 24px;
  align-items: center;
`;

const NavLink = styled(Link)<{ $isActive: boolean }>`
  color: ${props => props.$isActive ? '#3b82f6' : '#64748b'};
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
  border: 1px solid transparent;
  
  &:hover {
    color: #3b82f6;
    background: #f8fafc;
    border-color: #e2e8f0;
  }
  
  ${props => props.$isActive && `
    background: #eff6ff;
    border-color: #bfdbfe;
  `}
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

const LoginButton = styled(Link)`
  background: #3b82f6;
  color: white;
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s;
  
  &:hover {
    background: #2563eb;
    transform: translateY(-1px);
  }
`;

export default function NavBar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  return (
    <NavContainer>
      <LeftSection>
        <Logo to="/">Catan Online</Logo>
        
        {user && (
          <NavLinks>
            <NavLink to="/active-games" $isActive={isActive('/active-games')}>
              🎮 Aktywne Gry
            </NavLink>
            <NavLink to="/statistics" $isActive={isActive('/statistics')}>
              📊 Statystyki
            </NavLink>
            <NavLink to="/profile" $isActive={isActive('/profile')}>
              👤 Profil
            </NavLink>
            <NavLink to="/room/new" $isActive={isActive('/room/new')}>
              ✨ Nowa Gra
            </NavLink>
          </NavLinks>
        )}
      </LeftSection>

      <RightSection>
        {user ? (
          <UserInfo>
            <UserAvatar
              src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.display_name || user.username}&background=random`}
              alt="User avatar"
            />
            <UserName>
              {user.display_name || user.username}
              {user.is_guest && <GuestBadge>Guest</GuestBadge>}
            </UserName>
            <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
          </UserInfo>
        ) : (
          <LoginButton to="/">Zaloguj się</LoginButton>
        )}
      </RightSection>
    </NavContainer>
  );
}