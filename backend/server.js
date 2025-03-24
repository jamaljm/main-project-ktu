require("dotenv").config({ path: "../.env" }); // Load environment variables from .env file in the parent directory
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fetch = require("node-fetch"); // Import fetch for API requests
const http = require("http"); // Import HTTP module for server creation
const setupWebSocketServer = require("./websocket"); // Import WebSocket setup function
const multer = require("multer"); // For handling multipart/form-data
const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");

const app = express();
const PORT = 5000;

// Create HTTP server using Express app
const server = http.createServer(app);

// Initialize WebSocket with our HTTP server
const io = setupWebSocketServer(server);

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware
app.use(cors());
app.use(bodyParser.json());

// OpenAI API setup
const apiKey =
  "sk-";
console.log("API Key Loaded:", apiKey ? "Yes" : "No"); // Debugging check to confirm the API key is loaded correctly

// Store conversation history
const conversations = new Map();

// Get or create a conversation for a user
function getConversation(userId = "default") {
  if (!conversations.has(userId)) {
    conversations.set(userId, {
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant in a voice conversation. Keep your responses concise and natural-sounding, as they will be spoken aloud. Act like you're in a real phone call with the user.",
        },
      ],
      lastActive: Date.now(),
    });
  }

  // Update last active timestamp
  const conversation = conversations.get(userId);
  conversation.lastActive = Date.now();

  return conversation;
}

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

// Route to receive audio and transcribe it
app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      console.error("No file in request");
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    console.log(
      "Received audio file - size:",
      req.file.size,
      "bytes, mimetype:",
      req.file.mimetype
    );

    if (req.file.size < 100) {
      console.error("Audio file too small, likely corrupt or empty");
      io.emit(
        "error",
        "Audio file too small or empty. Please try speaking longer and louder."
      );
      return res.status(400).json({ error: "Audio file too small or empty" });
    }

    // Try transcribe with auto format detection first, then fallback if needed
    const result = await transcribeAudioWithFallback(req.file, res);

    if (result.success) {
      // Get user ID from the request (could be from a header, query param, or just default to 'default')
      const userId = req.query.userId || "default";

      // Send transcription to client via WebSocket
      io.emit("transcription", result.text);

      // Add user message to conversation history
      const conversation = getConversation(userId);
      conversation.messages.push({
        role: "user",
        content: result.text,
      });

      // Now send the transcription to OpenAI for a response
      processOpenAIResponse(result.text, userId);

      return res.status(200).json({ success: true });
    } else {
      // If we get here, all transcription attempts failed
      return res.status(400).json({
        error: "Failed to transcribe audio after multiple attempts",
        details: result.error,
      });
    }
  } catch (error) {
    console.error("Error in transcription:", error);
    io.emit("error", `Failed to transcribe audio: ${error.message}`);
    return res
      .status(500)
      .json({ error: "Failed to transcribe audio", details: error.message });
  }
});

// New function to handle transcription with fallback for format issues
async function transcribeAudioWithFallback(file, res) {
  // Define formats to try, in order of preference
  const formatsToTry = ["webm", "mp3", "wav", "ogg", "mp4"];
  let lastError = null;

  // First, try using the provided MIME type
  if (file.mimetype) {
    const detectedFormat = detectFormatFromMimeType(file.mimetype);
    if (detectedFormat && !formatsToTry.includes(detectedFormat)) {
      // Add detected format to the beginning of the array if it's valid and not already there
      formatsToTry.unshift(detectedFormat);
    }
  }

  // Try each format until one works
  for (const format of formatsToTry) {
    try {
      const result = await attemptTranscription(file, format);
      console.log(`Successfully transcribed with format: ${format}`);
      return { success: true, text: result.text };
    } catch (error) {
      console.warn(
        `Transcription attempt with ${format} failed:`,
        error.message
      );
      lastError = error;

      // If it's not a format error, don't try other formats
      if (!error.message.includes("Invalid file format")) {
        break;
      }
    }
  }

  // If all attempts failed, report error
  console.error("All transcription attempts failed");
  io.emit(
    "error",
    "Failed to transcribe audio. Please try speaking more clearly."
  );
  return { success: false, error: lastError?.message || "Unknown error" };
}

// Helper function to detect format from MIME type
function detectFormatFromMimeType(mimeType) {
  const mime = mimeType.toLowerCase();

  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp3")) return "mp3";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("mpeg")) return "mp3";
  if (mime.includes("m4a")) return "m4a";
  if (mime.includes("flac")) return "flac";

  return null;
}

// Helper function to attempt transcription with a specific format
async function attemptTranscription(file, format) {
  const tempFilePath = path.join(__dirname, `temp-${Date.now()}.${format}`);
  console.log(`Attempting transcription with format: ${format}`);
  console.log("Creating temporary file:", tempFilePath);

  try {
    // Write the buffer to a temporary file
    fs.writeFileSync(tempFilePath, file.buffer);

    // Use form-data package
    const FormData = require("form-data");
    const formData = new FormData();
    formData.append("model", "whisper-1");

    // Add file with specified format
    formData.append("file", fs.createReadStream(tempFilePath), {
      filename: `audio.${format}`,
      contentType: `audio/${format}`,
    });

    // Send to OpenAI
    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      }
    );

    // Clean up temp file
    try {
      fs.unlinkSync(tempFilePath);
    } catch (err) {
      console.warn("Error cleaning up temp file:", err);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Server error: ${response.status}`);
    }

    const result = await response.json();

    if (!result.text || result.text.trim() === "") {
      throw new Error("No speech detected");
    }

    return result;
  } catch (error) {
    // Clean up temp file in case of error
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch (cleanupError) {
      console.warn("Error cleaning up temp file:", cleanupError);
    }

    throw error;
  }
}

// Function to get OpenAI's response to the transcribed text
async function processOpenAIResponse(transcribedText, userId = "default") {
  try {
    console.log("Sending to OpenAI:", transcribedText);

    // Get conversation history
    const conversation = getConversation(userId);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: conversation.messages,
        temperature: 0.7,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      throw new Error("Failed to get response from OpenAI");
    }

    const result = await response.json();
    const aiResponse = result.choices[0].message.content;
    console.log("AI Response:", aiResponse);

    // Add assistant's response to conversation history
    conversation.messages.push({
      role: "assistant",
      content: aiResponse,
    });

    // Trim conversation history if it gets too long (keep the system message + last 10 exchanges)
    if (conversation.messages.length > 21) {
      // system message + 10 user/assistant pairs
      conversation.messages = [
        conversation.messages[0],
        ...conversation.messages.slice(-20),
      ];
    }

    // Send the AI response to the client
    io.emit("response", aiResponse);
  } catch (error) {
    console.error("Error getting AI response:", error);
    io.emit("error", "Failed to get AI response");
  }
}

// Route to clear conversation history
app.post("/api/clear-conversation", (req, res) => {
  const userId = req.query.userId || "default";

  if (conversations.has(userId)) {
    const systemMessage = conversations.get(userId).messages[0];
    conversations.set(userId, {
      messages: [systemMessage],
      lastActive: Date.now(),
    });
  } else {
    getConversation(userId); // Create a fresh conversation
  }

  res.status(200).json({ success: true, message: "Conversation cleared" });
});

// WebSocket handler to clear conversation
io.on("connection", (socket) => {
  socket.on("clearConversation", () => {
    const userId = "default"; // You could get a user-specific ID from the socket

    if (conversations.has(userId)) {
      const systemMessage = conversations.get(userId).messages[0];
      conversations.set(userId, {
        messages: [systemMessage],
        lastActive: Date.now(),
      });
    }

    socket.emit("conversationCleared", { success: true });
  });
});

// Cleanup old conversations periodically (every hour)
setInterval(() => {
  const now = Date.now();
  const MAX_IDLE_TIME = 3600000; // 1 hour in milliseconds

  for (const [userId, conversation] of conversations.entries()) {
    if (now - conversation.lastActive > MAX_IDLE_TIME) {
      console.log(`Cleaning up idle conversation for user: ${userId}`);
      conversations.delete(userId);
    }
  }
}, 3600000);

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server is also running on the same port`);
});
