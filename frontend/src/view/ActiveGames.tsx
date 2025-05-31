// frontend/src/view/ActiveGames.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import NavBar from '../navigation/NavigationBar';

const Container = styled.div`
  min-height: 100vh;
  background: #fafafa;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
`;

const Content = styled.div`
  max-width: 1200px;
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

const FiltersSection = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
`;

const FilterButton = styled.button<{ $active: boolean }>`
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid ${props => props.$active ? '#3b82f6' : '#e2e8f0'};
  background: ${props => props.$active ? '#eff6ff' : 'white'};
  color: ${props => props.$active ? '#3b82f6' : '#64748b'};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: #3b82f6;
    background: #eff6ff;
    color: #3b82f6;
  }
`;

const GamesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
`;

const GameCard = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.3s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
`;

const GameHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #f1f5f9;
`;

const GameTitle = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 8px;
`;

const GameName = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
`;

const GameStatus = styled.span<{ status: string }>`
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  margin-left: auto;
  
  ${props => {
    switch (props.status) {
      case 'waiting':
        return `background: #fef3c7; color: #d97706;`;
      case 'active':
        return `background: #dcfce7; color: #16a34a;`;
      case 'finished':
        return `background: #f3f4f6; color: #6b7280;`;
      default:
        return `background: #f3f4f6; color: #6b7280;`;
    }
  }}
`;

const GameInfo = styled.div`
  color: #64748b;
  font-size: 14px;
  margin-bottom: 12px;
`;

const PlayersSection = styled.div`
  padding: 16px 20px;
`;

const PlayersTitle = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 12px;
`;

const PlayersList = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
`;

const PlayerChip = styled.div<{ color: string; isYou?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: ${props => props.isYou ? '#eff6ff' : '#f8fafc'};
  border: 1px solid ${props => props.isYou ? '#bfdbfe' : '#e2e8f0'};
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
`;

const PlayerColor = styled.div<{ color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${props => props.color};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionButton = styled(Link)<{ variant?: 'primary' | 'secondary' }>`
  flex: 1;
  padding: 10px 16px;
  border-radius: 8px;
  text-align: center;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
  
  ${props => props.variant === 'primary' 
    ? `
      background: #3b82f6;
      color: white;
      &:hover {
        background: #2563eb;
        transform: translateY(-1px);
      }
    `
    : `
      background: #f8fafc;
      color: #64748b;
      border: 1px solid #e2e8f0;
      &:hover {
        background: #f1f5f9;
        color: #374151;
      }
    `
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
`;

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
`;

const EmptyTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px 0;
`;

const EmptyDescription = styled.p`
  margin: 0 0 24px 0;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
`;

const CreateGameButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #3b82f6;
  color: white;
  text-decoration: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.2s;
  
  &:hover {
    background: #2563eb;
    transform: translateY(-1px);
  }
`;

// Mock data - w prawdziwej aplikacji pobrane z API
const mockGames = [
  {
    id: '1',
    name: 'Gra z przyjaciółmi',
    status: 'active',
    players: [
      { id: 'me', name: 'Ty', color: 'red', isYou: true },
      { id: '2', name: 'Anna', color: 'blue' },
      { id: '3', name: 'Piotr', color: 'green' },
    ],
    lastActivity: '2 minuty temu',
    roomId: 'abc123',
    currentTurn: 'Twoja kolej'
  },
  {
    id: '2',
    name: 'Wieczorna rozgrywka',
    status: 'waiting',
    players: [
      { id: 'me', name: 'Ty', color: 'yellow', isYou: true },
      { id: '4', name: 'Marcin', color: 'orange' },
    ],
    lastActivity: '10 minut temu',
    roomId: 'def456',
    currentTurn: 'Oczekiwanie na graczy'
  },
  {
    id: '3',
    name: 'Turniej weekendowy',
    status: 'finished',
    players: [
      { id: 'me', name: 'Ty', color: 'purple', isYou: true },
      { id: '5', name: 'Kasia', color: 'blue' },
      { id: '6', name: 'Tomek', color: 'green' },
      { id: '7', name: 'Ola', color: 'red' },
    ],
    lastActivity: '1 dzień temu',
    roomId: 'ghi789',
    currentTurn: 'Gra zakończona - 2. miejsce'
  }
];

export default function ActiveGames() {
  const [filter, setFilter] = useState<'all' | 'active' | 'waiting' | 'finished'>('all');
  
  const filteredGames = mockGames.filter(game => {
    if (filter === 'all') return true;
    return game.status === filter;
  });

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting': return 'Oczekuje';
      case 'active': return 'W trakcie';
      case 'finished': return 'Zakończona';
      default: return status;
    }
  };

  return (
    <Container>
      <NavBar />
      <Content>
        <Header>
          <Title>🎮 Aktywne Gry</Title>
          <Subtitle>Zarządzaj swoimi rozgrywkami Catan</Subtitle>
        </Header>

        <FiltersSection>
          <span style={{ fontWeight: 600, color: '#374151' }}>Filtruj:</span>
          <FilterButton 
            $active={filter === 'all'} 
            onClick={() => setFilter('all')}
          >
            Wszystkie
          </FilterButton>
          <FilterButton 
            $active={filter === 'active'} 
            onClick={() => setFilter('active')}
          >
            W trakcie
          </FilterButton>
          <FilterButton 
            $active={filter === 'waiting'} 
            onClick={() => setFilter('waiting')}
          >
            Oczekujące
          </FilterButton>
          <FilterButton 
            $active={filter === 'finished'} 
            onClick={() => setFilter('finished')}
          >
            Zakończone
          </FilterButton>
        </FiltersSection>

        {filteredGames.length === 0 ? (
          <EmptyState>
            <EmptyIcon>🎲</EmptyIcon>
            <EmptyTitle>Brak gier do wyświetlenia</EmptyTitle>
            <EmptyDescription>
              {filter === 'all' 
                ? 'Nie masz jeszcze żadnych aktywnych gier. Stwórz nową grę, aby rozpocząć!' 
                : `Nie masz gier o statusie "${getStatusText(filter)}"`
              }
            </EmptyDescription>
            <CreateGameButton to="/room/new">
              ✨ Stwórz Nową Grę
            </CreateGameButton>
          </EmptyState>
        ) : (
          <GamesGrid>
            {filteredGames.map(game => (
              <GameCard key={game.id}>
                <GameHeader>
                  <GameTitle>
                    <GameName>{game.name}</GameName>
                    <GameStatus status={game.status}>
                      {getStatusText(game.status)}
                    </GameStatus>
                  </GameTitle>
                  <GameInfo>
                    {game.currentTurn} • {game.lastActivity}
                  </GameInfo>
                </GameHeader>
                
                <PlayersSection>
                  <PlayersTitle>Gracze ({game.players.length}/4)</PlayersTitle>
                  <PlayersList>
                    {game.players.map(player => (
                      <PlayerChip key={player.id} color={player.color} isYou={player.isYou}>
                        <PlayerColor color={player.color} />
                        {player.name}
                      </PlayerChip>
                    ))}
                  </PlayersList>
                  

                  </PlayersSection>
              </GameCard>
            ))}
          </GamesGrid>
        )}
      </Content>
    </Container>
  );
}
