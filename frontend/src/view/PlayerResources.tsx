import React, { useEffect, useState } from 'react';

interface PlayerResources {
    color: string;
    resources: {
        WHEAT: number;
        BRICK: number;
        ORE: number;
        SHEEP: number;
        WOOD: number;
    };
}

export const PlayerResourcesDisplay: React.FC = () => {
    const [playerData, setPlayerData] = useState<PlayerResources | null>(null);

    const fetchPlayerData = async () => {
        try {
            console.log('Fetching player data...');
            const response = await fetch('http://localhost:8000/api/player/');
            const data = await response.json();
            console.log('Received player data:', data);
            if (data.player) {
                console.log('Setting new player data:', data.player);
                setPlayerData(data.player);
            }
        } catch (error) {
            console.error('Error fetching player data:', error);
        }
    };

    useEffect(() => {
        // Initial fetch
        fetchPlayerData();

        // Add event listener for resource updates
        const handleResourceUpdate = (event: Event) => {
            console.log('Resource update event received:', event);
            fetchPlayerData();
        };

        console.log('Adding resourcesUpdated event listener');
        window.addEventListener('resourcesUpdated', handleResourceUpdate);

        // Cleanup
        return () => {
            console.log('Removing resourcesUpdated event listener');
            window.removeEventListener('resourcesUpdated', handleResourceUpdate);
        };
    }, []);

    // Add effect to log state changes
    useEffect(() => {
        console.log('Player data state updated:', playerData);
    }, [playerData]);

    if (!playerData) {
        return <div>Loading player resources...</div>;
    }

    return (
        <div style={{
            padding: '20px',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            margin: '10px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
            <h2 style={{ color: playerData.color.toLowerCase() }}>Gracz {playerData.color}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {Object.entries(playerData.resources).map(([resource, amount]) => (
                    <div key={resource} style={{
                        padding: '10px',
                        backgroundColor: 'white',
                        borderRadius: '4px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span style={{ fontWeight: 'bold' }}>{resource}:</span>
                        <span>{amount}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}; 