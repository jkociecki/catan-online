class GameService {
  private static instance: GameService;
  private socket: WebSocket | null = null;
  private callbacks: { [key: string]: ((data: any) => void)[] } = {};
  private clientId: string | null = null;

  // Change these URLs to match your exact backend configuration
  private static readonly API_URL = "http://localhost:8000/api";
  // Zmodyfikowany WebSocket URL - uwzględniając poprawną ścieżkę
  private static readonly WS_URL = "ws://localhost:8000/ws";

  private constructor() {
    console.log("GameService instance created");
  }

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
        method: "GET",
        headers: {
          Accept: "application/json",
        },
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
        const wsUrl = `${GameService.WS_URL}/game/${roomId}/`;
        console.log(`Connecting to WebSocket: ${wsUrl}`);
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          console.log("WebSocket connected successfully!");
          // Request client ID immediately after connection
          this.sendMessage({
            type: "get_client_id",
          });
          resolve();
        };

        this.socket.onclose = (event) => {
          console.log("WebSocket disconnected:", event);
          if (event.code !== 1000) {
            console.error(
              `WebSocket closed abnormally. Code: ${event.code}, Reason: ${event.reason}`
            );
          }
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

            // Save client ID if present - to tutaj zapisujemy ID klienta
            if (data.type === "client_id" && data.player_id) {
              this.clientId = data.player_id;
              console.log("Set client ID from message:", this.clientId);

              // Zapisz też w localStorage jako backup
              try {
                // Upewniamy się, że this.clientId nie jest null przed zapisem
                if (this.clientId !== null) {
                  localStorage.setItem("catanClientId", this.clientId);
                  console.log("Saved client ID to localStorage");
                } else {
                  console.warn("Cannot save null clientId to localStorage");
                }
              } catch (e) {
                console.warn("Could not save client ID to localStorage:", e);
              }
            }

            // Dispatch event based on message type
            if (data.type) {
              this.dispatchEvent(data.type, data);
            }
          } catch (err) {
            console.error("Error parsing WebSocket message:", err, event.data);
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
    // Sprawdź czy mamy ID w pamięci
    if (this.clientId) {
      console.log("Returning cached client ID:", this.clientId);
      return this.clientId;
    }

    // Sprawdź czy mamy ID w localStorage
    try {
      const storedId = localStorage.getItem("catanClientId");
      if (storedId) {
        console.log("Retrieved client ID from localStorage:", storedId);
        this.clientId = storedId;
        return storedId;
      }
    } catch (e) {
      console.warn("Could not access localStorage:", e);
    }

    console.log("Requesting client ID from server...");

    return new Promise((resolve, reject) => {
      // Set a timeout to make sure we don't wait forever
      const timeout = setTimeout(() => {
        console.error("Timeout waiting for client ID");
        reject(new Error("Timeout waiting for client ID"));
      }, 5000);

      const handler = (data: any) => {
        console.log("Received client_id event:", data);
        if (data.player_id) {
          this.clientId = data.player_id;
          this.removeEventHandler("client_id", handler);
          clearTimeout(timeout);

          // Zapisz też w localStorage
          try {
            // Upewniamy się, że this.clientId nie jest null przed zapisem
            if (this.clientId !== null) {
              localStorage.setItem("catanClientId", this.clientId);
            } else {
              console.warn("Cannot save null clientId to localStorage");
            }
          } catch (e) {
            console.warn("Could not save client ID to localStorage:", e);
          }

          console.log("Resolved client ID:", data.player_id);
          resolve(data.player_id);
        }
      };

      this.addEventHandler("client_id", handler);

      // Dodaj handler dla player_joined tylko jako backup
      const joinHandler = (data: any) => {
        console.log("Received player_joined event:", data);
        // Sprawdź czy to na pewno informacja o mnie
        // Uwaga: to może być niepoprawne, jeśli nie jesteś w stanie odróżnić
        // czy to ty dołączyłeś, czy inny gracz
        if (data.player_id && !this.clientId) {
          console.log(
            "Setting client ID from player_joined as fallback:",
            data.player_id
          );
          this.clientId = data.player_id;
          this.removeEventHandler("player_joined", joinHandler);
          this.removeEventHandler("client_id", handler); // Usuń też handler client_id
          clearTimeout(timeout);

          // Zapisz też w localStorage
          try {
            localStorage.setItem("catanClientId", data.player_id);
          } catch (e) {
            console.warn("Could not save client ID to localStorage:", e);
          }

          resolve(data.player_id);
        }
      };

      this.addEventHandler("player_joined", joinHandler);

      // Request client ID explicitly if connected
      if (this.isConnected()) {
        this.sendMessage({
          type: "get_client_id",
        });
        console.log("Sent get_client_id request");
      } else {
        console.error("Cannot get client ID: WebSocket not connected");
        reject(new Error("Cannot get client ID: WebSocket not connected"));
      }
    });
  }

  // Game specific methods
  public getGameState(): void {
    console.log("Requesting game state");
    this.sendMessage({
      type: "get_game_state",
    });
  }

  public buildSettlement(coords: any): void {
    console.log("Sending build_settlement action", coords);
    this.sendMessage({
      type: "game_action",
      action: "build_settlement",
      coords: coords,
    });
  }

  public buildCity(coords: any): void {
    console.log("Sending build_city action", coords);
    this.sendMessage({
      type: "game_action",
      action: "build_city",
      coords: coords,
    });
  }

  public buildRoad(coords: any): void {
    console.log("Sending build_road action", coords);
    this.sendMessage({
      type: "game_action",
      action: "build_road",
      coords: coords,
    });
  }

  public rollDice(): void {
    console.log("Sending roll_dice action");
    this.sendMessage({
      type: "game_action",
      action: "roll_dice",
    });
  }

  public endTurn(): void {
    console.log("Sending end_turn action");
    this.sendMessage({
      type: "game_action",
      action: "end_turn",
    });
  }

  // Dodaję metodę do diagnostyki
  public getConnectionInfo(): any {
    return {
      connected: this.isConnected(),
      clientId: this.clientId,
      socketState: this.socket ? this.socket.readyState : "no-socket",
      socketUrl: this.socket ? this.socket.url : "no-socket",
    };
  }
}

export default GameService.getInstance();
