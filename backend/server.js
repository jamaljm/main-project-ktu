require("dotenv").config({ path: "../.env" }); // Load environment variables from .env file in the parent directory
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fetch = require("node-fetch"); // Import fetch for API requests
const http = require("http"); // Import HTTP module for server creation
const setupWebSocketServer = require("./websocket"); // Import WebSocket setup function

const app = express();
const PORT = 5000;

// Create HTTP server using Express app
const server = http.createServer(app);

// Initialize WebSocket with our HTTP server
const io = setupWebSocketServer(server);

// Middleware
app.use(cors());
app.use(bodyParser.json());

// OpenAI API setup
const apiKey = process.env.OPENAI_API_KEY;
console.log("API Key Loaded:", apiKey ? "Yes" : "No"); // Debugging check to confirm the API key is loaded correctly

// Route to receive text and convert to speech
app.post("/api/say", async (req, res) => {
  const { text } = req.body;
  console.log("Received text:", text);

  try {
    // Request audio data from OpenAI API
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1", // Ensure the correct model is used
        voice: "alloy", // You can change the voice if needed
        input: text, // The text to convert to speech
      }),
    });

    // Check if the response is OK (status code 200-299)
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error from OpenAI:", errorText); // Log the error response from OpenAI
      throw new Error("Failed to fetch speech data from OpenAI");
    }

    // Set headers to stream the MP3 audio data back to the client
    res.setHeader("Content-Type", "audio/mp3");
    const audioStream = response.body;

    // Pipe the OpenAI audio response directly to the client
    audioStream.pipe(res);
  } catch (error) {
    console.error("Error generating speech:", error);
    res.status(500).send("Error generating speech");
  }
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server is also running on the same port`);
});
