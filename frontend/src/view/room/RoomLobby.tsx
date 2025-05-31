import React, { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import Navbar from '../auth/NavBar';

interface Player {
    id: string;
    color: string;
    display_name: string;
}

const PlayerName = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: #1e293b;
`;

const Container = styled.div`
  min-height: 100vh;
  background: #fafafa;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
`;

const RoomLobby: React.FC = () => {
    const navigate = useNavigate();
    const { roomId } = useParams<{ roomId: string }>();
    const [players, setPlayers] = useState<Player[]>([]);
    const [gameState, setGameState] = useState<any>(null);

    const handleGameState = (data: any) => {
        console.log("🎮 Game state update:", data);
        if (data.game_state && data.game_state.players) {
            let playersList = [];

            if (Array.isArray(data.game_state.players)) {
                playersList = data.game_state.players.map((p: any) => ({
                    id: p.id || p.player_id,
                    color: p.color || "#64748b",
                    display_name: p.display_name,
                }));
            } else {
                playersList = Object.values(data.game_state.players).map(
                    (p: any) => ({
                        id: p.id || p.player_id,
                        color: p.color || "#64748b",
                        display_name: p.display_name,
                    })
                );
            }

            console.log("👥 Setting players:", playersList);
            setPlayers(playersList);
        }
    };

    return (
    <Container>

        <Navbar />
        <div>
            {players.map((player) => (
                <div key={player.id}>
                    <PlayerName>
                        {(player as any).display_name || `Player ${player.id.substring(0, 8)}`}
                    </PlayerName>
                </div>
            ))}
        </div>
        </Container>

    );
};

export default RoomLobby; 