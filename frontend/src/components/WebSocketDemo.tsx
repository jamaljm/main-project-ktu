"use client";

import { useState, useEffect, useRef } from "react";
import { socketService } from "@/lib/socket";

interface Message {
  id: string;
  content: string | { text: string; username: string };
  timestamp: string;
}

export default function WebSocketDemo() {
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [username, setUsername] = useState("");
  const [currentClientId, setCurrentClientId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages whenever new message arrives
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Generate a random username if not set
  useEffect(() => {
    if (!username) {
      const randomName = `User${Math.floor(Math.random() * 1000)}`;
      setUsername(randomName);
    }
  }, [username]);

  useEffect(() => {
    const socket = socketService.getSocket();

    if (socket) {
      // Update connection status
      const handleConnect = () => {
        setConnected(true);
        // Save current client ID when connected
        if (socket.id) {
          setCurrentClientId(socket.id);
          console.log("Connected with ID:", socket.id);
        }
      };

      const handleDisconnect = () => setConnected(false);

      // Handle incoming messages
      const handleMessage = (data: Message) => {
        // Ensure we have the sender's ID stored
        if (!currentClientId && socket.connected && socket.id) {
          setCurrentClientId(socket.id);
        }

        setMessages((prev) => [...prev, data]);
      };

      // Set up event listeners
      socket.on("connect", handleConnect);
      socket.on("disconnect", handleDisconnect);
      socket.on("message", handleMessage);

      // Initial connection status
      if (socket.connected && socket.id) {
        setConnected(true);
        setCurrentClientId(socket.id);
      }

      // Clean up event listeners on unmount
      return () => {
        socket.off("connect", handleConnect);
        socket.off("disconnect", handleDisconnect);
        socket.off("message", handleMessage);
      };
    }
  }, [currentClientId]);

  const sendMessage = () => {
    if (message.trim() !== "") {
      // Send message with username
      socketService.sendMessage({
        text: message,
        username: username,
      });
      setMessage("");
    }
  };

  // Determine if a message is from the current client
  const isOwnMessage = (messageId: string) => {
    return messageId === currentClientId;
  };

  return (
    <div className="flex flex-col h-[500px] border rounded-lg shadow-sm">
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-3 rounded-t-lg">
        <h2 className="text-xl font-bold">WebSocket Chat</h2>
        <div className="flex justify-between items-center">
          <span className="text-sm opacity-80">Your name: {username}</span>
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              connected
                ? "bg-green-200 text-green-800"
                : "bg-red-200 text-red-800"
            }`}
          >
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Messages container */}
      <div className="flex-1 p-4 bg-gray-50 overflow-y-auto">
        <div className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No messages yet. Start the conversation!
            </p>
          ) : (
            messages.map((msg, index) => {
              const own = isOwnMessage(msg.id);
              const msgContent =
                typeof msg.content === "object" && msg.content !== null
                  ? msg.content.text
                  : String(msg.content);
              const msgUsername =
                typeof msg.content === "object" && msg.content !== null
                  ? msg.content.username
                  : own
                  ? username
                  : "Unknown User";

              return (
                <div
                  key={index}
                  className={`flex ${own ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] break-words rounded-lg p-3 ${
                      own
                        ? "bg-green-100 text-green-900 rounded-tr-none"
                        : "bg-white border shadow-sm rounded-tl-none"
                    }`}
                  >
                    <div className="text-xs font-semibold text-gray-600 mb-1">
                      {own ? "You" : msgUsername}
                    </div>
                    <p className="mb-1">{msgContent}</p>
                    <div className="text-right">
                      <span className="text-xs text-gray-500">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message input */}
      <div className="p-3 bg-white border-t">
        <div className="flex items-center gap-2">
          <input
            type="text"
            className="flex-1 px-3 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={!connected}
          />
          <button
            className="p-2.5 bg-green-500 text-white rounded-full hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={sendMessage}
            disabled={!connected || message.trim() === ""}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
