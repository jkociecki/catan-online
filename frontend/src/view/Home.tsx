// frontend/src/view/Home.tsx - UPDATED WITH LOGIN REDIRECT
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../context/AuthContext';
import NavBar from '../navigation/NavigationBar';
import ReconnectionService from '../services/ReconnectionService';

const Container = styled.div`
  min-height: 100vh;
  background: #fafafa;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
`;

const HeroSection = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 80px 20px;
  text-align: center;
`;

const HeroTitle = styled.h1`
  font-size: 48px;
  font-weight: 700;
  margin: 0 0 16px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
`;

const HeroSubtitle = styled.p`
  font-size: 20px;
  margin: 0 0 32px 0;
  opacity: 0.9;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
`;

const HeroButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: white;
  color: #667eea;
  text-decoration: none;
  padding: 16px 32px;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 600;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  transition: all 0.3s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
  }
`;

const FeaturesSection = styled.div`
  padding: 80px 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const FeaturesTitle = styled.h2`
  text-align: center;
  font-size: 36px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 48px 0;
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 32px;
`;

const FeatureCard = styled.div`
  background: white;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  text-align: center;
  transition: all 0.3s;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  }
`;

const FeatureIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
`;

const FeatureTitle = styled.h3`
  font-size: 24px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 12px 0;
`;

const FeatureDescription = styled.p`
  color: #64748b;
  line-height: 1.6;
  margin: 0;
`;

const QuickActionsSection = styled.div`
  background: white;
  padding: 60px 20px;
  border-top: 1px solid #e2e8f0;
`;

const QuickActionsTitle = styled.h2`
  text-align: center;
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 40px 0;
`;

const ActionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
  max-width: 800px;
  margin: 0 auto;
`;

const ActionCard = styled(Link)`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.3s;
  
  &:hover {
    border-color: #3b82f6;
    background: #eff6ff;
    transform: translateY(-2px);
  }
`;

const ActionIcon = styled.div`
  font-size: 32px;
  margin-bottom: 12px;
`;

const ActionTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px 0;
`;

const ActionDescription = styled.p`
  color: #64748b;
  text-align: center;
  margin: 0;
  font-size: 14px;
`;

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeGames, setActiveGames] = useState<any[]>([]);

  // Jeśli nie ma użytkownika, przekieruj na stronę logowania
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Check for active games on component mount
  useEffect(() => {
    const checkActiveGames = async () => {
      if (user) {
        const games = await ReconnectionService.checkForActiveGames();
        setActiveGames(games);
      }
    };

    checkActiveGames();
  }, [user]);

  // Jeśli nie ma użytkownika, nie renderuj nic (zostanie przekierowany)
  if (!user) {
    return null;
  }

  return (
    <Container>
      <NavBar />
      
      <QuickActionsSection>
        <QuickActionsTitle>Witaj ponownie, {user.display_name || user.username}!</QuickActionsTitle>
        
        {activeGames.length > 0 && (
          <div style={{ 
            marginBottom: '24px', 
            padding: '16px', 
            background: '#eff6ff', 
            borderRadius: '8px', 
            border: '1px solid #bfdbfe' 
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#1e40af' }}>🎮 Active Games</h3>
            {activeGames.map(game => (
              <div key={game.session_id} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '8px 12px', 
                background: 'white', 
                borderRadius: '6px', 
                marginBottom: '8px', 
                border: '1px solid #e5e7eb' 
              }}>
                <div>
                  <strong>{game.room_id}</strong> - {game.display_name}
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {game.players_count} players • {game.is_connected ? '🟢 Connected' : '🔴 Disconnected'}
                  </div>
                </div>
                <ActionCard 
                  to={`/room/${game.room_id}`} 
                  style={{ margin: 0, padding: '8px 16px' }}
                >
                  {game.is_connected ? 'Rejoin' : 'Reconnect'}
                </ActionCard>
              </div>
            ))}
          </div>
        )}

        <ActionGrid>
          <ActionCard to="/room/new">
            <ActionIcon>✨</ActionIcon>
            <ActionTitle>Nowa Gra</ActionTitle>
            <ActionDescription>Stwórz nowy pokój i zaproś znajomych</ActionDescription>
          </ActionCard>
          
          <ActionCard to="/active-games">
            <ActionIcon>🎮</ActionIcon>
            <ActionTitle>Aktywne Gry</ActionTitle>
            <ActionDescription>Wróć do swoich rozgrywek</ActionDescription>
          </ActionCard>
          
          <ActionCard to="/statistics">
            <ActionIcon>📊</ActionIcon>
            <ActionTitle>Statystyki</ActionTitle>
            <ActionDescription>Zobacz swoje osiągnięcia</ActionDescription>
          </ActionCard>
          
          <ActionCard to="/profile">
            <ActionIcon>👤</ActionIcon>
            <ActionTitle>Profil</ActionTitle>
            <ActionDescription>Zarządzaj swoim kontem</ActionDescription>
          </ActionCard>
        </ActionGrid>
      </QuickActionsSection>

      <FeaturesSection>
        <FeaturesTitle>Dlaczego Catan Online?</FeaturesTitle>
        <FeatureGrid>
          <FeatureCard>
            <FeatureIcon>🌐</FeatureIcon>
            <FeatureTitle>Graj Online</FeatureTitle>
            <FeatureDescription>
              Połącz się z przyjaciółmi z całego świata i graj w czasie rzeczywistym 
              bez potrzeby instalowania dodatkowego oprogramowania.
            </FeatureDescription>
          </FeatureCard>
          
          <FeatureCard>
            <FeatureIcon>⚡</FeatureIcon>
            <FeatureTitle>Szybkie Rozgrywki</FeatureTitle>
            <FeatureDescription>
              Automatyczne zarządzanie mechanikami gry, intuicyjny interfejs 
              i płynna rozgrywka dla maksymalnej przyjemności.
            </FeatureDescription>
          </FeatureCard>
          
          <FeatureCard>
            <FeatureIcon>📱</FeatureIcon>
            <FeatureTitle>Responsywność</FeatureTitle>
            <FeatureDescription>
              Graj na dowolnym urządzeniu - komputerze, tablecie czy telefonie. 
              Interfejs dostosowuje się do rozmiaru ekranu.
            </FeatureDescription>
          </FeatureCard>
          
          <FeatureCard>
            <FeatureIcon>🏆</FeatureIcon>
            <FeatureTitle>Statystyki</FeatureTitle>
            <FeatureDescription>
              Śledź swoje postępy, analizuj strategie i rywalizuj 
              z innymi graczami w rankingach.
            </FeatureDescription>
          </FeatureCard>
          
          <FeatureCard>
            <FeatureIcon>🎨</FeatureIcon>
            <FeatureTitle>Personalizacja</FeatureTitle>
            <FeatureDescription>
              Wybierz swój ulubiony kolor, avatar i dostosuj 
              interfejs gry do swoich preferencji.
            </FeatureDescription>
          </FeatureCard>
          
          <FeatureCard>
            <FeatureIcon>🔒</FeatureIcon>
            <FeatureTitle>Bezpieczeństwo</FeatureTitle>
            <FeatureDescription>
              Prywatne pokoje gier, bezpieczne logowanie przez Google 
              i ochrona danych osobowych.
            </FeatureDescription>
          </FeatureCard>
        </FeatureGrid>
      </FeaturesSection>
    </Container>
  );
}