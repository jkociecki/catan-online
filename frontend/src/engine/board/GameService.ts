class GameService {
    private static instance: GameService;
    private socket: WebSocket | null = null;
    private callbacks: {[key: string]: ((data: any) => void)[]} = {};
    private clientId: string | null = null;
    
    // Change these URLs to match your exact backend configuration
    private static readonly API_URL = 'http://localhost:8000/api';
    private static readonly WS_URL = 'ws://localhost:8000';

    private constructor() {}

    public static getInstance(): GameService {
        if (!GameService.instance) {
            GameService.instance = new GameService();
        }
        return GameService.instance;
    }

    public async createRoom(): Promise<string> {
        try {
            console.log("Attempting to create a new room...");
            const response = await fetch(`${GameService.API_URL}/room/create/`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("Created room with ID:", data.room_id);
            return data.room_id;
        } catch (error) {
            console.error("Error creating room:", error);
            throw error;
        }
    }

    public connectToRoom(roomId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.disconnectFromRoom();

            try {
                const wsUrl = `${GameService.WS_URL}/ws/game/${roomId}/`;
                console.log(`Connecting to WebSocket: ${wsUrl}`);
                this.socket = new WebSocket(wsUrl);

                this.socket.onopen = () => {
                    console.log('WebSocket connected successfully');
                    // Request client ID immediately after connection
                    this.sendMessage({
                        type: 'get_client_id'
                    });
                    resolve();
                };

                this.socket.onclose = (event) => {
                    console.log('WebSocket disconnected:', event);
                    if (event.code !== 1000) {
                        console.error(`WebSocket closed abnormally. Code: ${event.code}, Reason: ${event.reason}`);
                    }
                    this.socket = null;
                    this.dispatchEvent('disconnect', { code: event.code, reason: event.reason });
                };

                this.socket.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    // Don't reject here as onclose will be called after error
                    // This allows for better error handling
                };

                this.socket.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        console.log('WebSocket message received:', data);
                        
                        // Save client ID if present
                        if (data.type === 'client_id' && data.player_id) {
                            this.clientId = data.player_id;
                            console.log('Set client ID:', this.clientId);
                        }
                        
                        // Dispatch event based on message type
                        if (data.type) {
                            this.dispatchEvent(data.type, data);
                        }
                    } catch (err) {
                        console.error('Error parsing WebSocket message:', err, event.data);
                    }
                };
            } catch (error) {
                console.error('Error creating WebSocket:', error);
                reject(error);
            }
        });
    }

    public disconnectFromRoom(): void {
        if (this.socket) {
            console.log("Disconnecting from WebSocket");
            this.socket.close();
            this.socket = null;
        }
    }

    public sendMessage(message: any): void {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            const messageStr = JSON.stringify(message);
            console.log('Sending WebSocket message:', message);
            this.socket.send(messageStr);
        } else {
            console.error('WebSocket not connected, message not sent:', message);
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
        
        return new Promise((resolve, reject) => {
            // Set a timeout to make sure we don't wait forever
            const timeout = setTimeout(() => {
                reject(new Error("Timeout waiting for client ID"));
            }, 5000);
            
            const handler = (data: any) => {
                if (data.player_id) {
                    this.clientId = data.player_id;
                    this.removeEventHandler('client_id', handler);
                    clearTimeout(timeout);
                    resolve(data.player_id);
                }
            };
            
            this.addEventHandler('client_id', handler);
            
            // Also try player_joined event
            const joinHandler = (data: any) => {
                if (data.player_id) {
                    this.clientId = data.player_id;
                    this.removeEventHandler('player_joined', joinHandler);
                    clearTimeout(timeout);
                    resolve(data.player_id);
                }
            };
            
            this.addEventHandler('player_joined', joinHandler);
            
            // Request client ID explicitly if connected
            if (this.isConnected()) {
                this.sendMessage({
                    type: 'get_client_id'
                });
            } else {
                console.error("Cannot get client ID: WebSocket not connected");
            }
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

    public buildCity(coords: any): void {
        this.sendMessage({
            type: 'game_action',
            action: 'build_city',
            coords: coords
        });
    }

    public buildRoad(coords: any): void {
        this.sendMessage({
            type: 'game_action',
            action: 'build_road',
            coords: coords
        });
    }

    public rollDice(): void {
        this.sendMessage({
            type: 'game_action',
            action: 'roll_dice'
        });
    }

    public endTurn(): void {
        this.sendMessage({
            type: 'game_action',
            action: 'end_turn'
        });
    }
}

export default GameService.getInstance();