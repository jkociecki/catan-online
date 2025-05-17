class GameService {
    private static instance: GameService;
    private socket: WebSocket | null = null;
    private callbacks: {[key: string]: ((data: any) => void)[]} = {};
    private clientId: string | null = null;
    private roomId: string | null = null;
    private reconnectionAttempts: number = 0;
    private readonly MAX_RECONNECTION_ATTEMPTS = 5;
    
    // Change these URLs to match your exact backend configuration
    private static readonly API_URL = 'http://localhost:8000/api';
    // Zmodyfikowany WebSocket URL - uwzględniając poprawną ścieżkę
    private static readonly WS_URL = 'ws://localhost:8000/ws';

    private constructor() {
        // Setup event listener for online/offline status
        window.addEventListener('online', this.handleOnlineStatus.bind(this));
        window.addEventListener('offline', this.handleOfflineStatus.bind(this));
        
        // Setup unload handler to notify the server when the user leaves
        window.addEventListener('beforeunload', () => {
            this.disconnectFromRoom();
        });
    }

    public static getInstance(): GameService {
        if (!GameService.instance) {
            GameService.instance = new GameService();
        }
        return GameService.instance;
    }

    private handleOnlineStatus() {
        console.log("Browser went online, checking connection...");
        if (this.roomId && !this.isConnected()) {
            console.log("Reconnecting after coming back online");
            this.reconnectIfNeeded(this.roomId);
        }
    }

    private handleOfflineStatus() {
        console.log("Browser went offline");
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

    public async connectToRoom(roomId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.disconnectFromRoom();
            this.roomId = roomId;

            try {
                // Check if we have a stored client ID for this room
                const storedClientId = localStorage.getItem(`catan_player_id_${roomId}`);
                let wsUrl = `${GameService.WS_URL}/game/${roomId}/`;
                
                // If we have a stored client ID, add it to the URL for reconnection
                if (storedClientId) {
                    wsUrl += `?existing_id=${storedClientId}`;
                    console.log(`Reconnecting with existing ID: ${storedClientId}`);
                    this.clientId = storedClientId;
                }
                
                console.log(`Connecting to WebSocket: ${wsUrl}`);
                this.socket = new WebSocket(wsUrl);

                this.socket.onopen = () => {
                    console.log('WebSocket connected successfully!');
                    this.reconnectionAttempts = 0;
                    
                    // Request client ID immediately after connection
                    this.sendMessage({
                        type: 'get_client_id'
                    });
                    
                    // Request game state
                    setTimeout(() => {
                        this.getGameState();
                    }, 300);
                    
                    resolve();
                };

                this.socket.onclose = (event) => {
                    console.log('WebSocket disconnected:', event);
                    if (event.code !== 1000) {
                        console.error(`WebSocket closed abnormally. Code: ${event.code}, Reason: ${event.reason}`);
                        
                        // Attempt automatic reconnection if it wasn't a normal closure
                        if (this.roomId && this.reconnectionAttempts < this.MAX_RECONNECTION_ATTEMPTS) {
                            this.reconnectionAttempts++;
                            const backoffDelay = Math.min(1000 * Math.pow(2, this.reconnectionAttempts), 10000);
                            console.log(`Attempting to reconnect in ${backoffDelay/1000} seconds... (attempt ${this.reconnectionAttempts})`);
                            
                            setTimeout(() => {
                                this.reconnectIfNeeded(this.roomId!);
                            }, backoffDelay);
                        }
                    }
                    
                    this.socket = null;
                    this.dispatchEvent('disconnect', { code: event.code, reason: event.reason });
                };

                this.socket.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    reject(new Error('WebSocket connection failed'));
                };

                this.socket.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        console.log('WebSocket message received:', data);
                        
                        // Save client ID if present
                        if (data.type === 'client_id' && data.player_id) {
                            this.clientId = data.player_id;
                            console.log('Set client ID:', this.clientId);
                            
                            // Store client ID for this room in localStorage for reconnection
                            localStorage.setItem(`catan_player_id_${roomId}`, this.clientId);
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

    public async reconnectIfNeeded(roomId: string): Promise<boolean> {
        if (this.isConnected()) {
            console.log("Already connected to WebSocket");
            return true;
        }
        
        try {
            await this.connectToRoom(roomId);
            // Request latest game state after connecting
            this.getGameState();
            return true;
        } catch (error) {
            console.error("Failed to reconnect:", error);
            return false;
        }
    }

    public disconnectFromRoom(): void {
        if (this.socket) {
            console.log("Disconnecting from WebSocket");
            this.socket.close();
            this.socket = null;
        }
        // Don't clear clientId to allow reconnection
    }

    public sendMessage(message: any): void {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            const messageStr = JSON.stringify(message);
            console.log('Sending WebSocket message:', message);
            this.socket.send(messageStr);
        } else {
            console.error('WebSocket not connected, message not sent:', message);
            
            // Try to reconnect if possible
            if (this.roomId) {
                console.log('Attempting to reconnect before sending message');
                this.reconnectIfNeeded(this.roomId).then(success => {
                    if (success && this.socket && this.socket.readyState === WebSocket.OPEN) {
                        console.log('Reconnected, now sending delayed message');
                        const messageStr = JSON.stringify(message);
                        this.socket.send(messageStr);
                    }
                });
            }
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
                    
                    // Store client ID for this room in localStorage
                    if (this.roomId) {
                        localStorage.setItem(`catan_player_id_${this.roomId}`, this.clientId);
                    }
                    
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
                    
                    // Store client ID for this room in localStorage
                    if (this.roomId) {
                        localStorage.setItem(`catan_player_id_${this.roomId}`, this.clientId);
                    }
                    
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
                reject(new Error("Cannot get client ID: WebSocket not connected"));
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

    public enterBuildMode(buildType: string | null): void {
        this.sendMessage({
            type: 'enter_build_mode', 
            build_type: buildType
        });
    }
}

export default GameService.getInstance();