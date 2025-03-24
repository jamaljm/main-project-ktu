"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Send, Volume2, Headphones } from "lucide-react";
import { io, Socket } from "socket.io-client";

// Define types for chat messages
interface Message {
  role: "user" | "assistant";
  content: string;
  isAudio?: boolean;
}

export default function Speech() {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("Ready");

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isProcessingRef = useRef<boolean>(false);

  // Connect to WebSocket server
  useEffect(() => {
    const socketInstance = io("http://localhost:5000");
    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      setStatusMessage("Connected to server");
    });

    socketInstance.on("disconnect", () => {
      setStatusMessage("Disconnected from server");
    });

    socketInstance.on("transcription", (text: string) => {
      setMessages((prev) => [...prev, { role: "user", content: text }]);
    });

    socketInstance.on("response", (text: string) => {
      setMessages((prev) => [...prev, { role: "assistant", content: text }]);
      playResponseAudio(text);
    });

    socketInstance.on("error", (errorMessage: string) => {
      setError(errorMessage);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Text-to-speech function
  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    try {
      // Add user message to the chat
      setMessages((prev) => [...prev, { role: "user", content: text }]);

      // Get AI response via fetch or socket
      if (socket?.connected) {
        socket.emit("chat", text);
      } else {
        // Fallback if socket is not connected
        await fetchResponse(text);
      }

      setText(""); // Clear the input field
    } catch (error) {
      console.error("Error sending text:", error);
      setError("Failed to send message");
    }
  };

  // Fetch AI response directly (fallback method)
  const fetchResponse = async (userText: string) => {
    try {
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: userText }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();
      const aiResponse = data.response;

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: aiResponse },
      ]);
      playResponseAudio(aiResponse);
    } catch (error) {
      console.error("Error fetching response:", error);
    }
  };

  // Play audio response
  const playResponseAudio = async (text: string) => {
    try {
      setIsPlaying(true);
      setStatusMessage("Playing response...");

      const response = await fetch("http://localhost:5000/api/say", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error("Failed to get audio response");
      }

      const audioBlob = await response.blob();
      const audioObjectUrl = URL.createObjectURL(audioBlob);

      // Create and play audio
      const audio = new Audio(audioObjectUrl);

      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioObjectUrl);
        setStatusMessage("Ready");
      };

      audio.onerror = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioObjectUrl);
        setStatusMessage("Error playing audio");
      };

      await audio.play();
    } catch (err) {
      console.error("Error playing audio:", err);
      setError("Failed to play response audio");
      setIsPlaying(false);
      setStatusMessage("Ready");
    }
  };

  // Start recording audio
  const startRecording = async () => {
    try {
      setError(null);
      setStatusMessage("Requesting microphone access...");

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Specify audio format
      const options = {
        mimeType: "audio/webm",
      };

      // Create MediaRecorder
      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
        console.log("Using WebM audio format");
      } catch (e) {
        console.warn("WebM format not supported, using default format", e);
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Handle data
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        processRecordedAudio();
      };

      // Start recording
      mediaRecorder.start(200);
      setIsRecording(true);
      setStatusMessage("Recording your message... Press Stop when finished");
    } catch (err) {
      console.error("Error starting recording:", err);
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError(
          "Microphone access denied. Please allow microphone access and try again."
        );
      } else {
        setError(
          `Could not access microphone: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
      }
      setStatusMessage("Cannot record - microphone access denied");
    }
  };

  // Stop recording audio
  const stopRecording = () => {
    if (!isRecording) return;

    try {
      setIsRecording(false);
      setStatusMessage("Processing your message...");

      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }

      // Stop all tracks in the stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        streamRef.current = null;
      }
    } catch (err) {
      console.error("Error stopping recording:", err);
      setError("Failed to stop recording properly");
      isProcessingRef.current = false;
    }
  };

  // Process the recorded audio
  const processRecordedAudio = async () => {
    if (audioChunksRef.current.length === 0) {
      isProcessingRef.current = false;
      return;
    }

    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      // Get the MIME type from the recorder if available
      const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
      console.log("Processing audio with MIME type:", mimeType);

      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

      if (audioBlob.size < 100) {
        isProcessingRef.current = false;
        setStatusMessage("Audio too short. Please speak longer.");
        return;
      }

      await sendAudioToServer(audioBlob);
    } catch (err) {
      console.error("Error processing audio:", err);
      setError("Failed to process audio");
    } finally {
      isProcessingRef.current = false;
    }
  };

  // Send recorded audio to the server
  const sendAudioToServer = async (audioBlob: Blob) => {
    if (!socket?.connected) {
      setError("Not connected to server");
      isProcessingRef.current = false;
      return;
    }

    if (!audioBlob || audioBlob.size === 0) {
      isProcessingRef.current = false;
      return;
    }

    try {
      console.log(
        `Sending audio blob: size=${audioBlob.size}, type=${audioBlob.type}`
      );

      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: "Processing your message...",
          isAudio: true,
        },
      ]);

      const formData = new FormData();
      formData.append("audio", audioBlob);

      const response = await fetch("http://localhost:5000/api/transcribe", {
        method: "POST",
        body: formData,
      });

      // Remove the processing message
      setMessages((prev) => prev.filter((msg) => !msg.isAudio));

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Transcription error:", errorText);
        throw new Error(errorText || `Server error: ${response.status}`);
      }

      setStatusMessage("Waiting for response...");
    } catch (err) {
      console.error("Error sending audio:", err);
      setError(
        `Failed to send audio: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    } finally {
      isProcessingRef.current = false;
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center text-2xl">
          Simple Voice Chat
        </CardTitle>
        <CardDescription className="text-center">
          Press Start to record, then Stop when finished
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Status message */}
        <div className="mb-4 text-center text-sm font-medium text-gray-600">
          <p className="flex items-center justify-center gap-2">
            {isRecording && (
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
            {isPlaying && <Volume2 size={16} className="text-blue-500" />}
            {statusMessage}
          </p>
        </div>

        {/* Messages display */}
        <div className="space-y-4 h-[300px] overflow-y-auto p-4 border rounded-lg mb-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 h-full flex flex-col items-center justify-center">
              <p>Press Start to begin recording your message</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-blue-500 text-white rounded-tr-none"
                      : "bg-gray-200 text-gray-800 rounded-tl-none"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Text input */}
        <form
          onSubmit={handleTextSubmit}
          className="flex flex-col sm:flex-row gap-4 mb-4"
        >
          <Input
            type="text"
            placeholder="Type your message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-grow"
          />
          <Button type="submit" className="bg-green-700 hover:bg-green-800">
            <Send size={16} className="mr-2" /> Send
          </Button>
        </form>

        {/* Error display */}
        {error && (
          <div className="mt-2 p-3 bg-red-50 text-red-600 border border-red-200 rounded-md">
            <p>{error}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-center gap-4 border-t p-4">
        {!isRecording ? (
          <Button
            variant="default"
            size="lg"
            className="bg-green-600 hover:bg-green-700"
            onClick={startRecording}
            disabled={isPlaying || isRecording}
          >
            <Mic size={20} className="mr-2" /> Start
          </Button>
        ) : (
          <Button
            variant="destructive"
            size="lg"
            onClick={stopRecording}
            disabled={isPlaying || !isRecording}
          >
            <MicOff size={20} className="mr-2" /> Stop
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
