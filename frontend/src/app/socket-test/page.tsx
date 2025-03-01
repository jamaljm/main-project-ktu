"use client";

import WebSocketDemo from "@/components/WebSocketDemo";

export default function SocketTestPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Real-time Chat Demo</h1>
      <p className="mb-6 text-gray-600">
        This page demonstrates a WhatsApp-style chat interface using WebSockets
        for real-time communication. Messages from you appear on the right side,
        and messages from other users appear on the left side.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:order-2">
          <WebSocketDemo />
        </div>

        <div className="md:order-1 p-4 border rounded-lg shadow-sm bg-gray-50">
          <h2 className="text-xl font-bold mb-4">How It Works</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              Each browser connection gets a unique identifier and username
            </li>
            <li>
              Your messages are displayed on the right side (green bubbles)
            </li>
            <li>
              Messages from other users are displayed on the left side (white
              bubbles)
            </li>
            <li>
              Open this page in multiple browser windows to see the full effect
            </li>
            <li>
              All messages are broadcast to everyone connected to the chat
            </li>
          </ol>

          <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
            <p className="font-medium text-blue-800">
              Technical Implementation:
            </p>
            <p className="text-blue-700 mt-1">
              This chat system uses Socket.IO to establish WebSocket connections
              between browsers and the Node.js server. The frontend maintains
              the current user's socket ID to determine message ownership, and
              styles messages differently based on whether they were sent by the
              current user or someone else.
            </p>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold mb-2">Try These Features:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Open in multiple windows side by side</li>
              <li>Send messages from different windows</li>
              <li>
                See how messages appear differently for sender vs receivers
              </li>
              <li>Close a window and see disconnection status</li>
              <li>Reopen window to test reconnection</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
