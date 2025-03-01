// WebSocket server implementation using Socket.IO
const { Server } = require("socket.io");
require("dotenv").config({ path: "../.env" });

// Function to setup WebSocket server with an existing HTTP server
function setupWebSocketServer(server) {
  // Initialize Socket.IO with CORS settings
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Connection event
  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // Handle custom events
    socket.on("message", (data) => {
      // Check if data is a string or an object
      const messageContent =
        typeof data === "object"
          ? data
          : { text: data, username: `User-${socket.id.substring(0, 4)}` };

      console.log("Message received:", messageContent);

      // Broadcast the message to all connected clients
      io.emit("message", {
        id: socket.id,
        content: messageContent,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  console.log("WebSocket server initialized");
  return io;
}

module.exports = setupWebSocketServer;
