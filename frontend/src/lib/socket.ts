import { io, Socket } from "socket.io-client";

// Singleton pattern for the WebSocket connection
class SocketService {
  private static instance: SocketService;
  private socket: Socket | null = null;
  private connectionStatus:
    | "connected"
    | "disconnected"
    | "connecting"
    | "error" = "disconnected";
  private errorMessage: string = "";
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  private constructor() {
    // Initialize connection on class instantiation
    this.connect();
  }

  // Get the singleton instance
  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  // Connect to the WebSocket server
  private connect(): void {
    // Check if we're already connected
    if (this.socket) return;

    this.connectionStatus = "connecting";
    console.log("Attempting to connect to WebSocket server...");

    const WEBSOCKET_URL =
      process.env.NEXT_PUBLIC_WEBSOCKET_URL || "https://cea8-2406-8800-9014-a082-f8bd-318a-9deb-5a8e.ngrok-free.app";

    try {
      this.socket = io(WEBSOCKET_URL, {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        timeout: 10000, // 10 seconds timeout
      });

      this.setupEventListeners();
    } catch (error) {
      this.handleError(error);
    }
  }

  // Set up socket event listeners
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("Connected to WebSocket server");
      this.connectionStatus = "connected";
      this.errorMessage = "";
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", (reason) => {
      console.log(`Disconnected from WebSocket server: ${reason}`);
      this.connectionStatus = "disconnected";

      // If client was disconnected by server, try to reconnect
      if (reason === "io server disconnect") {
        setTimeout(() => this.reconnect(), 1000);
      }
    });

    this.socket.on("connect_error", (error) => {
      this.handleError(error);
    });

    this.socket.on("reconnect_attempt", (attempt) => {
      this.reconnectAttempts = attempt;
      console.log(
        `Reconnection attempt ${attempt}/${this.maxReconnectAttempts}`
      );
    });

    this.socket.on("reconnect_failed", () => {
      this.connectionStatus = "error";
      this.errorMessage = "Failed to reconnect after multiple attempts";
      console.error("WebSocket reconnection failed after maximum attempts");
    });
  }

  // Handle connection errors
  private handleError(error: any): void {
    this.connectionStatus = "error";
    this.errorMessage = error?.message || "Unknown connection error";
    console.error("WebSocket connection error:", error);
  }

  // Manual reconnect
  public reconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connect();
  }

  // Disconnect from the WebSocket server
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionStatus = "disconnected";
    }
  }

  // Get the socket instance
  public getSocket(): Socket | null {
    return this.socket;
  }

  // Get connection status
  public getStatus(): {
    status: string;
    error: string;
    reconnectAttempt: number;
  } {
    return {
      status: this.connectionStatus,
      error: this.errorMessage,
      reconnectAttempt: this.reconnectAttempts,
    };
  }

  // Send a message to the server
  public sendMessage(message: any): void {
    if (this.socket && this.connectionStatus === "connected") {
      this.socket.emit("message", message);
    } else {
      console.error(`Cannot send message: WebSocket ${this.connectionStatus}`);

      // Try to reconnect if not connected
      if (this.connectionStatus !== "connecting") {
        this.reconnect();
      }
    }
  }

  // Subscribe to a specific event
  public on(event: string, callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Unsubscribe from a specific event
  public off(event: string): void {
    if (this.socket) {
      this.socket.off(event);
    }
  }
}

// Export the singleton instance
export const socketService = SocketService.getInstance();

// Export a hook to use the socket in React components
export function useSocket(): Socket | null {
  return socketService.getSocket();
}
