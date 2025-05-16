class GameService {
    private static instance: GameService;
    private socket: WebSocket | null = null;
    private callbacks: {[key: string]: ((data: any) => void)[]} = {};
    private clientId: string | null = null;

    private constructor() {}

    public static getInstance(): GameService {
        if (!GameService.instance) {
            GameService.instance = new GameService();
        }
        return GameService.instance;
    }

    public async createRoom(): Promise<string> {
        const response = await fetch('http://localhost:8000/api/room/create/');
        const data = await response.json();
        return data.room_id;
    }

    public connectToRoom(roomId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.disconnectFromRoom();

            this.socket = new WebSocket(`ws://localhost:8000/ws/game/${roomId}/`);

            this.socket.onopen = () => {
                console.log('WebSocket connected');
                resolve();
            };

            this.socket.onclose = (event) => {
                console.log('WebSocket disconnected:', event);
                this.socket = null;
                this.dispatchEvent('disconnect', {});
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            };

            this.socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log('WebSocket message:', data);
                
                // Dispatch event based on message type
                if (data.type) {
                    this.dispatchEvent(data.type, data);
                }
            };
        });
    }

    public disconnectFromRoom(): void {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }

    public sendMessage(message: any): void {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        } else {
            console.error('WebSocket not connected');
        }
    }

    public addEventHandler(eventType: string, callback: (data: any) => void): void {
        if (!this.callbacks[eventType]) {
            this.callbacks[eventType] = [];
        }
        this.callbacks[eventType].push(callback);
    }

    public removeEventHandler(eventType: string, callback: (data: any) => void): void {
        if (this.callbacks[eventType]) {
            this.callbacks[eventType] = this.callbacks[eventType].filter(cb => cb !== callback);
        }
    }

    private dispatchEvent(eventType: string, data: any): void {
        if (this.callbacks[eventType]) {
            this.callbacks[eventType].forEach(callback => callback(data));
        }
    }

    public isConnected(): boolean {
        return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
    }

    public async getClientId(): Promise<string> {
        if (this.clientId) {
            return this.clientId;
        }
        
        return new Promise((resolve) => {
            // First try to get from a message event
            const handler = (data: any) => {
                if (data.player_id) {
                    this.clientId = data.player_id;
                    this.removeEventHandler('player_joined', handler);
                    resolve(data.player_id); // Use data.player_id directly
                }
            };
            
            this.addEventHandler('player_joined', handler);
            
            // Also send a request to get ID
            this.sendMessage({
                type: 'get_client_id'
            });
        });
    }

    // Game specific methods
    public getGameState(): void {
        this.sendMessage({
            type: 'get_game_state'
        });
    }

    public buildSettlement(coords: any): void {
        this.sendMessage({
            type: 'game_action',
            action: 'build_settlement',
            coords: coords
        });
    }

    // Add more game actions as needed
}

export default GameService.getInstance();