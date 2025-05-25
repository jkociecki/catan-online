// frontend/src/engine/board/SimpleGameService.ts - POPRAWIONA WERSJA

class SimpleGameService {
  private static instance: SimpleGameService;
  private socket: WebSocket | null = null;
  private callbacks: { [key: string]: ((data: any) => void)[] } = {};
  private clientId: string | null = null;
  private currentRoomId: string | null = null; // ✅ DODAJ TO

  // NOWY URL - simple-game zamiast game
  private static readonly API_URL = "http://localhost:8000/api";
  private static readonly WS_URL = "ws://localhost:8000/ws";

  private constructor() {
    console.log("SimpleGameService instance created");
  }

  public static getInstance(): SimpleGameService {
    if (!SimpleGameService.instance) {
      SimpleGameService.instance = new SimpleGameService();
    }
    return SimpleGameService.instance;
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

  public connectToRoom(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.disconnectFromRoom();
      this.currentRoomId = roomId; // ✅ DODAJ TO

      try {
        const wsUrl = `${SimpleGameService.WS_URL}/game/${roomId}/`;
        console.log(`Connecting to WebSocket: ${wsUrl}`);
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          console.log("WebSocket connected successfully!");
          this.sendMessage({
            type: "get_client_id",
          });
          resolve();
        };

        this.socket.onclose = (event) => {
          console.log("WebSocket disconnected:", event);
          this.socket = null;
          this.dispatchEvent("disconnect", {
            code: event.code,
            reason: event.reason,
          });
        };

        this.socket.onerror = (error) => {
          console.error("WebSocket error:", error);
          reject(new Error("WebSocket connection failed"));
        };

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("WebSocket message received:", data);

            if (data.type === "client_id" && data.player_id) {
              this.clientId = data.player_id;
              console.log("Set client ID:", this.clientId);
            }

            if (data.type) {
              this.dispatchEvent(data.type, data);
            }
          } catch (err) {
            console.error("Error parsing WebSocket message:", err);
          }
        };
      } catch (error) {
        console.error("Error creating WebSocket:", error);
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
    this.currentRoomId = null; // ✅ DODAJ TO
  }

  public sendMessage(message: any): void {
    console.log("🚀 Attempting to send message:", message);
    console.log("   WebSocket state:", this.socket?.readyState);
    console.log("   Connected:", this.isConnected());

    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error("❌ WebSocket not connected, message not sent:", message);

      // ✅ SPRÓBUJ PONOWNIE POŁĄCZYĆ
      if (this.currentRoomId) {
        console.log("🔄 Attempting to reconnect...");
        this.connectToRoom(this.currentRoomId)
          .then(() => {
            console.log("✅ Reconnected, retrying message send");
            this.sendMessage(message); // Retry
          })
          .catch((err: any) => {
            console.error("❌ Reconnection failed:", err);
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

  // ✅ DODAJ METODĘ DO FORCE RECONNECT
  public async forceReconnect(): Promise<void> {
    if (this.currentRoomId) {
      console.log("🔄 Force reconnecting to room:", this.currentRoomId);
      this.disconnectFromRoom();
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1s
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

  // METODY GRY
  public buildSettlement(vertexId: number): void {
    console.log("Building settlement at vertex:", vertexId);
    this.sendMessage({
      type: "game_action",
      action: "build_settlement",
      vertex_id: vertexId,
    });
  }

  public buildRoad(edgeId: number): void {
    console.log("Building road at edge:", edgeId);
    this.sendMessage({
      type: "game_action",
      action: "build_road",
      edge_id: edgeId,
    });
  }

  public rollDice(): void {
    console.log("Rolling dice");
    this.sendMessage({
      type: "game_action",
      action: "roll_dice",
    });
  }

  public endTurn(): void {
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
