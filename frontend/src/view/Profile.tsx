// frontend/src/view/Profile.tsx
import React, { useState } from 'react';
import styled from 'styled-components';
import NavBar from '../navigation/NavigationBar';
import { useAuth } from '../context/AuthContext';

const Container = styled.div`
  min-height: 100vh;
  background: #fafafa;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
`;

const Content = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
`;

const Header = styled.div`
  margin-bottom: 32px;
`;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
`;

const Subtitle = styled.p`
  color: #64748b;
  font-size: 16px;
  margin: 0;
`;

const ProfileCard = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 24px;
`;

const ProfileHeader = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 32px 24px;
  text-align: center;
  color: white;
`;

const AvatarSection = styled.div`
  margin-bottom: 16px;
`;

const Avatar = styled.img`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 4px solid white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
`;

const ChangeAvatarButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const UserName = styled.h2`
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 4px 0;
`;

const UserBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
`;

const ProfileBody = styled.div`
  padding: 24px;
`;

const Section = styled.div`
  margin-bottom: 24px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  background: #fafafa;
  color: #1e293b;
  transition: all 0.2s;
  box-sizing: border-box;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    background: white;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  &:disabled {
    background: #f1f5f9;
    color: #94a3b8;
    cursor: not-allowed;
  }
`;

const ColorGrid = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const ColorOption = styled.div<{ color: string; selected: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: ${props => props.color};
  cursor: pointer;
  border: 3px solid ${props => props.selected ? '#3b82f6' : 'transparent'};
  transition: all 0.2s;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid;
  
  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
          &:hover {
            background: #2563eb;
            border-color: #2563eb;
            transform: translateY(-1px);
          }
        `;
      case 'danger':
        return `
          background: #ef4444;
          border-color: #ef4444;
          color: white;
          &:hover {
            background: #dc2626;
            border-color: #dc2626;
            transform: translateY(-1px);
          }
        `;
      default:
        return `
          background: white;
          border-color: #e2e8f0;
          color: #64748b;
          &:hover {
            background: #f8fafc;
            color: #374151;
          }
        `;
    }
  }}
`;

const InfoCard = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
`;

const InfoTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
`;

const InfoText = styled.div`
  font-size: 14px;
  color: #64748b;
  line-height: 1.5;
`;

const StatsList = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`;

const StatItem = styled.div`
  text-align: center;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
`;

const StatValue = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
`;

const colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple'];

export default function Profile() {
  const { user, setUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.display_name || user?.username || '',
    preferredColor: user?.preferred_color || 'red'
  });

  const handleSave = () => {
    if (user) {
      const updatedUser = {
        ...user,
        display_name: formData.displayName,
        preferred_color: formData.preferredColor
      };
      
      setUser(updatedUser);
      localStorage.setItem('user_data', JSON.stringify(updatedUser));
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      displayName: user?.display_name || user?.username || '',
      preferredColor: user?.preferred_color || 'red'
    });
    setIsEditing(false);
  };

  if (!user) {
    return (
      <Container>
        <NavBar />
        <Content>
          <Header>
            <Title>👤 Profil</Title>
            <Subtitle>Nie jesteś zalogowany</Subtitle>
          </Header>
        </Content>
      </Container>
    );
  }

  return (
    <Container>
      <NavBar />
      <Content>
        <Header>
          <Title>👤 Profil</Title>
          <Subtitle>Zarządzaj swoim kontem i preferencjami</Subtitle>
        </Header>

        <ProfileCard>
          <ProfileHeader>
            <AvatarSection>
              <Avatar
                src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.display_name || user.username}&background=random`}
                alt="Avatar"
              />
              <br />
              <ChangeAvatarButton>Zmień Avatar</ChangeAvatarButton>
            </AvatarSection>
            <UserName>{user.display_name || user.username}</UserName>
            {user.is_guest && (
              <UserBadge>
                👤 Konto Gościa
              </UserBadge>
            )}
          </ProfileHeader>

          <ProfileBody>
            <Section>
              <SectionTitle>ℹ️ Informacje Podstawowe</SectionTitle>
              
              <FormGroup>
                <Label>Nazwa wyświetlana</Label>
                <Input
                  type="text"
                  value={isEditing ? formData.displayName : (user.display_name || user.username)}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  disabled={!isEditing}
                />
              </FormGroup>

              <FormGroup>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={user.email || 'Brak'}
                  disabled
                />
              </FormGroup>

              <FormGroup>
                <Label>Status konta</Label>
                <Input
                  value={user.is_guest ? 'Konto gościa' : 'Zarejestrowane konto'}
                  disabled
                />
              </FormGroup>
            </Section>

            <Section>
              <SectionTitle>🎨 Preferencje Gry</SectionTitle>
              
              <FormGroup>
                <Label>Preferowany kolor</Label>
                <ColorGrid>
                  {colors.map(color => (
                    <ColorOption
                      key={color}
                      color={color}
                      selected={isEditing ? formData.preferredColor === color : user.preferred_color === color}
                      onClick={() => isEditing && setFormData({ ...formData, preferredColor: color })}
                    />
                  ))}
                </ColorGrid>
              </FormGroup>
            </Section>

            <Section>
              <SectionTitle>📊 Szybkie Statystyki</SectionTitle>
              <StatsList>
                <StatItem>
                  <StatValue>27</StatValue>
                  <StatLabel>Gry</StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue>15</StatValue>
                  <StatLabel>Zwycięstwa</StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue>56%</StatValue>
                  <StatLabel>Skuteczność</StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue>5</StatValue>
                  <StatLabel>Najdłuższa seria</StatLabel>
                </StatItem>
              </StatsList>
            </Section>

            {user.is_guest && (
              <Section>
                <InfoCard>
                  <InfoTitle>💡 Zarejestruj się, aby nie stracić postępów</InfoTitle>
                  <InfoText>
                    Jako gość, Twoje statystyki i postępy mogą zostać utracone. 
                    Zarejestruj się przez Google, aby zapisać swoje osiągnięcia na stałe.
                  </InfoText>
                </InfoCard>
              </Section>
            )}

            <ButtonGroup>
              {isEditing ? (
                <>
                  <Button onClick={handleCancel}>Anuluj</Button>
                  <Button variant="primary" onClick={handleSave}>Zapisz Zmiany</Button>
                </>
              ) : (
                <>
                  <Button variant="danger">Usuń Konto</Button>
                  <Button variant="primary" onClick={() => setIsEditing(true)}>Edytuj Profil</Button>
                </>
              )}
            </ButtonGroup>
          </ProfileBody>
        </ProfileCard>
      </Content>
    </Container>
  );
}