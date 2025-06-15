// frontend/src/view/Home.tsx - POPRAWIONA WERSJA Z RECONNECTION
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

const ActiveGamesSection = styled.div`
  margin-bottom: 40px;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
`;

const ActiveGamesTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const GameCard = styled.div`
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 12px;
  transition: all 0.2s;

  &:hover {
    background: #dbeafe;
    border-color: #93c5fd;
    transform: translateY(-1px);
  }
`;

const GameHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 12px;
`;

const GameInfo = styled.div`
  flex: 1;
`;

const GameTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #1e40af;
  margin-bottom: 4px;
`;

const GameMeta = styled.div`
  font-size: 13px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 16px;
`;

const StatusBadge = styled.span<{ connected: boolean }>`
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  background: ${props => props.connected ? '#dcfce7' : '#fef3c7'};
  color: ${props => props.connected ? '#166534' : '#d97706'};
`;

const ReconnectButton = styled(Link)`
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

const LoadingSpinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid #f1f5f9;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #64748b;
  font-style: italic;
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

interface ActiveGame {
  session_id: string;
  room_id: string;
  display_name: string;
  color: string;
  players_count: number;
  is_connected: boolean;
  last_activity: string;
  can_reconnect: boolean;
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeGames, setActiveGames] = useState<ActiveGame[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);

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
        setLoadingGames(true);
        console.log('🔍 Checking for active games...');
        
        try {
          const games = await ReconnectionService.checkForActiveGames();
          console.log('✅ Received active games:', games);
          setActiveGames(games);
        } catch (error) {
          console.error('❌ Error checking active games:', error);
          setActiveGames([]);
        } finally {
          setLoadingGames(false);
        }
      }
    };

    checkActiveGames();
  }, [user]);

  // Jeśli nie ma użytkownika, nie renderuj nic (zostanie przekierowany)
  if (!user) {
    return null;
  }

  const formatLastActivity = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      
      if (diffMins < 1) return 'Teraz';
      if (diffMins < 60) return `${diffMins} min temu`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h temu`;
      
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} dni temu`;
    } catch {
      return timestamp;
    }
  };

  return (
    <Container>
      <NavBar />
      
      <QuickActionsSection>
        <QuickActionsTitle>Witaj ponownie, {user.display_name || user.username}!</QuickActionsTitle>
        
        {/* Active Games Section */}
        {loadingGames ? (
          <ActiveGamesSection>
            <ActiveGamesTitle>🎮 Ładowanie aktywnych gier...</ActiveGamesTitle>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
              <LoadingSpinner />
            </div>
          </ActiveGamesSection>
        ) : activeGames.length > 0 ? (
          <ActiveGamesSection>
            <ActiveGamesTitle>
              🎮 Aktywne Gry ({activeGames.length})
            </ActiveGamesTitle>
            {activeGames.map(game => (
              <GameCard key={game.session_id}>
                <GameHeader>
                  <GameInfo>
                    <GameTitle>Pokój: {game.room_id}</GameTitle>
                    <GameMeta>
                      <span>Gracz: {game.display_name}</span>
                      <span>Graczy: {game.players_count}</span>
                      <span>Ostatnia aktywność: {formatLastActivity(game.last_activity)}</span>
                      <StatusBadge connected={game.is_connected}>
                        {game.is_connected ? '🟢 Połączony' : '🔴 Rozłączony'}
                      </StatusBadge>
                    </GameMeta>
                  </GameInfo>
                  <ReconnectButton to={`/room/${game.room_id}`}>
                    {game.is_connected ? 'Dołącz' : 'Połącz ponownie'}
                  </ReconnectButton>
                </GameHeader>
              </GameCard>
            ))}
          </ActiveGamesSection>
        ) : null}

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