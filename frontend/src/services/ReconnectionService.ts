class ReconnectionService {
    private static instance: ReconnectionService;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private reconnectDelay = 1000; // Start with 1 second
    
    static getInstance(): ReconnectionService {
        if (!ReconnectionService.instance) {
            ReconnectionService.instance = new ReconnectionService();
        }
        return ReconnectionService.instance;
    }
    
    async checkForActiveGames(): Promise<any[]> {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('/api/game-session/my-active-games/', {
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.active_games || [];
            }
        } catch (error) {
            console.error('Error checking active games:', error);
        }
        return [];
    }
    
    async attemptReconnection(roomId: string): Promise<boolean> {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('/api/game-session/reconnect-to-game/', {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ room_id: roomId })
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.can_reconnect;
            }
        } catch (error) {
            console.error('Error attempting reconnection:', error);
        }
        return false;
    }
    
    resetReconnectionState(): void {
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
    }
}

export default ReconnectionService.getInstance();