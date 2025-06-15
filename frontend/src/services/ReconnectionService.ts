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
            if (!token) {
                console.log('🔍 No auth token found, skipping active games check');
                return [];
            }

            console.log('🔍 Checking for active games with token:', token.substring(0, 10) + '...');
            
            const response = await fetch('http://localhost:8000/api/game-session/my-active-games/', {
                method: 'GET',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            console.log('🔍 Active games response status:', response.status);
            const headersObject: Record<string, string> = {};
            response.headers.forEach((value, key) => {
                headersObject[key] = value;
            });
            console.log('🔍 Active games response headers:', headersObject);
            
            if (!response.ok) {
                console.error('❌ Active games request failed:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('❌ Error response:', errorText);
                return [];
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.error('❌ Response is not JSON:', contentType);
                const responseText = await response.text();
                console.error('❌ Response body:', responseText.substring(0, 200));
                return [];
            }
            
            const data = await response.json();
            console.log('✅ Active games data received:', data);
            return data.active_games || [];
            
        } catch (error) {
            console.error('❌ Error checking active games:', error);
            return [];
        }
    }
    
    async attemptReconnection(roomId: string): Promise<boolean> {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                console.log('🔍 No auth token found, cannot reconnect');
                return false;
            }

            console.log('🔄 Attempting reconnection to room:', roomId);
            
            const response = await fetch('http://localhost:8000/api/game-session/reconnect-to-game/', {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ room_id: roomId })
            });
            
            console.log('🔄 Reconnection response status:', response.status);
            
            if (!response.ok) {
                console.error('❌ Reconnection request failed:', response.status);
                const errorText = await response.text();
                console.error('❌ Reconnection error:', errorText);
                return false;
            }
            
            const data = await response.json();
            console.log('✅ Reconnection response:', data);
            return data.can_reconnect || false;
            
        } catch (error) {
            console.error('❌ Error attempting reconnection:', error);
            return false;
        }
    }
    
    resetReconnectionState(): void {
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
    }
}

export default ReconnectionService.getInstance();