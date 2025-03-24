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
    maxHttpBufferSize: 5e6, // Increase buffer size for audio data (5MB)
  });

  // Store active conversations
  const activeConversations = new Map();

  // Connection event
  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // Initialize conversation history for this client
    activeConversations.set(socket.id, [
      {
        role: "system",
        content:
          "You are a helpful assistant. Provide concise and natural-sounding responses suitable for voice conversation.",
      },
    ]);

    // Handle client sending a message (for potential text chat fallback)
    socket.on("message", (data) => {
      const messageContent = typeof data === "object" ? data : { text: data };
      console.log("Message received:", messageContent);

      // Add to conversation history
      const conversationHistory = activeConversations.get(socket.id);
      if (conversationHistory) {
        conversationHistory.push({
          role: "user",
          content: messageContent.text,
        });
      }

      // Broadcast that a message was received (for UI feedback)
      socket.emit("messageSent", {
        id: socket.id,
        content: messageContent,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle audio transcription result
    socket.on("transcriptionResult", (transcription) => {
      console.log("Transcription from client:", transcription);

      // Update conversation history
      const conversationHistory = activeConversations.get(socket.id);
      if (conversationHistory) {
        conversationHistory.push({ role: "user", content: transcription });
      }
    });

    // Handle assistant response
    socket.on("assistantResponse", (response) => {
      console.log("Assistant response to client:", response);

      // Update conversation history
      const conversationHistory = activeConversations.get(socket.id);
      if (conversationHistory) {
        conversationHistory.push({ role: "assistant", content: response });
      }
    });

    // Handle client requesting conversation history
    socket.on("getConversationHistory", () => {
      const history = activeConversations.get(socket.id) || [];
      // Only send user and assistant messages, not system message
      const clientHistory = history
        .filter((msg) => msg.role !== "system")
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

      socket.emit("conversationHistory", clientHistory);
    });

    // Handle client clearing conversation
    socket.on("clearConversation", () => {
      // Reset to just the system message
      activeConversations.set(socket.id, [
        {
          role: "system",
          content:
            "You are a helpful assistant. Provide concise and natural-sounding responses suitable for voice conversation.",
        },
      ]);
      socket.emit("conversationCleared");
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      // Clean up conversation history
      activeConversations.delete(socket.id);
    });
  });

  console.log("WebSocket server initialized");
  return io;
}

module.exports = setupWebSocketServer;
