// frontend/src/view/board/SimpleGameService.ts - POPRAWIONA WERSJA

class SimpleGameService {
  private static instance: SimpleGameService;
  private socket: WebSocket | null = null;
  private callbacks: { [key: string]: ((data: any) => void)[] } = {};
  private clientId: string | null = null;
  private currentRoomId: string | null = null;
  private userData: { displayName: string; color: string } | null = null;

  private static readonly API_URL = "http://localhost:8000/api";
  private static readonly WS_URL = "ws://localhost:8000/ws";

  private constructor() {
    console.log("SimpleGameService instance created");
    // ✅ DODANE - Odczytaj userData z localStorage przy starcie
    this.loadUserDataFromStorage();
  }

  public static getInstance(): SimpleGameService {
    if (!SimpleGameService.instance) {
      SimpleGameService.instance = new SimpleGameService();
    }
    return SimpleGameService.instance;
  }

  // ✅ NOWA METODA - Odczytuj userData z localStorage
  private loadUserDataFromStorage(): void {
    try {
      const userDataStr = localStorage.getItem('user_data');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        if (userData) {
          this.userData = {
            displayName: userData.display_name || userData.username,
            color: userData.preferred_color || 'blue'
          };
          console.log("🔄 Loaded user data from localStorage:", this.userData);
        }
      }
    } catch (error) {
      console.warn("❌ Failed to load user data from localStorage:", error);
    }
  }

  public async createRoom(): Promise<string> {
    try {
      console.log("Creating new room...");
      const response = await fetch(
        `${SimpleGameService.API_URL}/room/create/`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

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

  public setUserData(displayName: string, color: string): void {
    this.userData = { displayName, color };
    console.log("✅ Set user data:", this.userData);
    
    // ✅ DODANE - Zapisz do localStorage
    try {
      const existingData = JSON.parse(localStorage.getItem('user_data') || '{}');
      existingData.display_name = displayName;
      existingData.preferred_color = color;
      localStorage.setItem('user_data', JSON.stringify(existingData));
      console.log("💾 Saved user data to localStorage");
    } catch (error) {
      console.warn("❌ Failed to save user data to localStorage:", error);
    }
  }

  public connectToRoom(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.disconnectFromRoom();
      this.currentRoomId = roomId;

      // ✅ KRYTYCZNA POPRAWKA - Sprawdź userData przed połączeniem
      if (!this.userData) {
        console.log("🔄 No userData set, trying to load from localStorage...");
        this.loadUserDataFromStorage();
        
        if (!this.userData) {
          console.warn("⚠️ Still no userData available, using defaults");
          this.userData = {
            displayName: `Player_${Date.now().toString(36)}`,
            color: 'blue'
          };
        }
      }

      try {
        const token = localStorage.getItem("auth_token");
        const wsUrl = `${SimpleGameService.WS_URL}/game/${roomId}/?token=${token}`;
        console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);
        console.log(`👤 With user data:`, this.userData);

        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          console.log("✅ WebSocket connected successfully!");
          
          // ✅ KROK 1: Pobierz client ID
          console.log("📤 Requesting client ID...");
          this.sendMessage({
            type: "get_client_id",
          });
          
          resolve();
        };

        this.socket.onclose = (event) => {
          console.log("❌ WebSocket disconnected:", event);
          this.socket = null;
          this.dispatchEvent("disconnect", {
            code: event.code,
            reason: event.reason,
          });
        };

        this.socket.onerror = (error) => {
          console.error("❌ WebSocket error:", error);
          reject(new Error("WebSocket connection failed"));
        };

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("📨 WebSocket message received:", data);

            // ✅ KROK 2: Gdy dostaniemy client_id, NATYCHMIAST wyślij dane użytkownika
            if (data.type === "client_id" && data.player_id) {
              this.clientId = data.player_id;
              console.log("✅ Set client ID:", this.clientId);
              
              // ✅ KRYTYCZNA POPRAWKA - Sprawdź userData jeszcze raz
              if (!this.userData) {
                console.log("🔄 Still no userData after client_id, loading again...");
                this.loadUserDataFromStorage();
              }
              
              if (this.userData) {
                console.log("📤 Sending user data immediately:", this.userData);
                this.sendMessage({
                  type: "set_user_data",
                  display_name: this.userData.displayName,
                  color: this.userData.color,
                });
              } else {
                console.error("❌ CRITICAL: No user data available after all attempts!");
                // Wyślij dane domyślne
                this.sendMessage({
                  type: "set_user_data",
                  display_name: `Player_${this.clientId?.substring(0, 8) || 'default'}`,
                  color: 'blue',
                });
              }
            }

            if (data.type) {
              this.dispatchEvent(data.type, data);
            }
          } catch (err) {
            console.error("❌ Error parsing WebSocket message:", err);
          }
        };
      } catch (error) {
        console.error("❌ Error creating WebSocket:", error);
        reject(error);
      }
    });
  }

  public disconnectFromRoom(): void {
    if (this.socket) {
      console.log("🔌 Disconnecting from WebSocket");
      this.socket.close();
      this.socket = null;
    }
    this.currentRoomId = null;
  }

  public sendMessage(message: any): void {
    console.log("📤 Attempting to send message:", message);
    console.log("   WebSocket state:", this.socket?.readyState);
    console.log("   Connected:", this.isConnected());

    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error("❌ WebSocket not connected, message not sent:", message);
      
      if (this.currentRoomId && message.type !== "get_client_id") {
        console.log("🔄 Attempting auto-reconnect...");
        this.connectToRoom(this.currentRoomId)
          .then(() => {
            console.log("✅ Auto-reconnected, retrying message send");
            setTimeout(() => {
              if (this.isConnected()) {
                this.socket?.send(JSON.stringify(message));
              }
            }, 500);
          })
          .catch((err: any) => {
            console.error("❌ Auto-reconnection failed:", err);
          });
      }
      return;
    }

    try {
      const messageStr = JSON.stringify(message);
      this.socket.send(messageStr);
      console.log("✅ Message sent successfully");
    } catch (error) {
      console.error("❌ Error sending message:", error);
    }
  }

  public addEventHandler(
    eventType: string,
    callback: (data: any) => void
  ): void {
    if (!this.callbacks[eventType]) {
      this.callbacks[eventType] = [];
    }
    this.callbacks[eventType].push(callback);
  }

  public removeEventHandler(
    eventType: string,
    callback: (data: any) => void
  ): void {
    if (this.callbacks[eventType]) {
      this.callbacks[eventType] = this.callbacks[eventType].filter(
        (cb) => cb !== callback
      );
    }
  }

  private dispatchEvent(eventType: string, data: any): void {
    if (this.callbacks[eventType]) {
      this.callbacks[eventType].forEach((callback) => callback(data));
    }
  }

  public isConnected(): boolean {
    const connected =
      this.socket !== null && this.socket.readyState === WebSocket.OPEN;
    console.log("🔍 Connection check:", {
      hasWebSocket: !!this.socket,
      readyState: this.socket?.readyState,
      connected: connected,
    });
    return connected;
  }

  public async forceReconnect(): Promise<void> {
    if (this.currentRoomId) {
      console.log("🔄 Force reconnecting to room:", this.currentRoomId);
      this.disconnectFromRoom();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await this.connectToRoom(this.currentRoomId);
    } else {
      throw new Error("No current room to reconnect to");
    }
  }

  public async getClientId(): Promise<string> {
    if (this.clientId) {
      return this.clientId;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout waiting for client ID"));
      }, 5000);

      const handler = (data: any) => {
        if (data.player_id) {
          this.clientId = data.player_id;
          this.removeEventHandler("client_id", handler);
          clearTimeout(timeout);
          resolve(data.player_id);
        }
      };

      this.addEventHandler("client_id", handler);

      if (this.isConnected()) {
        this.sendMessage({
          type: "get_client_id",
        });
      } else {
        reject(new Error("WebSocket not connected"));
      }
    });
  }

  public healthCheck(): boolean {
    const isHealthy =
      this.socket !== null &&
      this.socket.readyState === WebSocket.OPEN &&
      this.clientId !== null;

    console.log("🏥 Health check:", {
      hasSocket: !!this.socket,
      readyState: this.socket?.readyState,
      hasClientId: !!this.clientId,
      isHealthy,
    });

    return isHealthy;
  }

  // METODY GRY
  public buildSettlement(vertexId: number): void {
    if (!this.healthCheck()) {
      console.error("❌ Cannot build settlement - connection unhealthy");
      return;
    }

    console.log("Building settlement at vertex:", vertexId);
    this.sendMessage({
      type: "game_action",
      action: "build_settlement",
      vertex_id: vertexId,
    });
  }

  public buildRoad(edgeId: number): void {
    if (!this.healthCheck()) {
      console.error("❌ Cannot build road - connection unhealthy");
      return;
    }

    console.log("Building road at edge:", edgeId);
    this.sendMessage({
      type: "game_action",
      action: "build_road",
      edge_id: edgeId,
    });
  }

  public buildCity(vertexId: number): void {
    if (!this.healthCheck()) {
      console.error("❌ Cannot build city - connection unhealthy");
      return;
    }

    console.log("Building city at vertex:", vertexId);
    this.sendMessage({
      type: "game_action",
      action: "build_city", 
      vertex_id: vertexId,
    });
  }

  public seedResources(): void {
    console.log("🎯 Seeding resources for testing");
    this.sendMessage({
      type: "seed_resources",
    });
  }

  public rollDice(): void {
    if (!this.healthCheck()) {
      console.error("❌ Cannot roll dice - connection unhealthy");
      return;
    }

    console.log("Rolling dice");
    this.sendMessage({
      type: "game_action",
      action: "roll_dice",
    });
  }

  public endTurn(): void {
    if (!this.healthCheck()) {
      console.error("❌ Cannot end turn - connection unhealthy");
      return;
    }

    console.log("Ending turn");
    this.sendMessage({
      type: "game_action",
      action: "end_turn",
    });
  }

  public getGameState(): void {
    console.log("Requesting game state");
    this.sendMessage({
      type: "get_game_state",
    });
  }
}

export default SimpleGameService.getInstance();