// frontend/src/engine/board/SimpleGameService.ts
class SimpleGameService {
  private static instance: SimpleGameService;
  private socket: WebSocket | null = null;
  private callbacks: { [key: string]: ((data: any) => void)[] } = {};
  private clientId: string | null = null;

  // NOWY URL - simple-game zamiast game
  private static readonly API_URL = "http://localhost:8000/api";
  private static readonly WS_URL = "ws://localhost:8000/ws/simple-game";

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

      try {
        const wsUrl = `${SimpleGameService.WS_URL}/${roomId}/`;
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
  }

  public sendMessage(message: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const messageStr = JSON.stringify(message);
      console.log("Sending WebSocket message:", message);
      this.socket.send(messageStr);
    } else {
      console.error("WebSocket not connected, message not sent:", message);
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
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
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

  // NOWE METODY - proste ID zamiast współrzędnych
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
