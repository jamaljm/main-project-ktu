"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import Image from "next/image";

// Types
import { AgentConfig, SessionStatus } from "@/app/types";

// Context providers & hooks
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useHandleServerEvent } from "./hooks/useHandleServerEvent";

// Utilities
import { createRealtimeConnection } from "./lib/realtimeConnection";

// Agent configs
import { allAgentSets, defaultAgentSetKey } from "@/app/agentConfigs";

function App() {
  const searchParams = useSearchParams();

  const { addTranscriptMessage, addTranscriptBreadcrumb } = useTranscript();
  const { logClientEvent, logServerEvent } = useEvent();

  const [selectedAgentName, setSelectedAgentName] = useState<string>("");
  const [selectedAgentConfigSet, setSelectedAgentConfigSet] = useState<
    AgentConfig[] | null
  >(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>("DISCONNECTED");
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] =
    useState<boolean>(true);

  const sendClientEvent = (eventObj: any, eventNameSuffix = "") => {
    if (dcRef.current && dcRef.current.readyState === "open") {
      logClientEvent(eventObj, eventNameSuffix);
      dcRef.current.send(JSON.stringify(eventObj));
    } else {
      logClientEvent(
        { attemptedEvent: eventObj.type },
        "error.data_channel_not_open"
      );
      console.error(
        "Failed to send message - no data channel available",
        eventObj
      );
    }
  };

  const handleServerEventRef = useHandleServerEvent({
    setSessionStatus,
    selectedAgentName,
    selectedAgentConfigSet,
    sendClientEvent,
    setSelectedAgentName,
  });

  // Enhanced server event handler to detect user intent to apply
  const handleServerEvent = (eventData: any) => {
    // Call the original handler
    handleServerEventRef.current(eventData);

    // Check for user intent to apply from agent messages
    if (
      eventData.type === "conversation.item.create" &&
      eventData.item?.role === "assistant" &&
      eventData.item?.content
    ) {
      const content = eventData.item.content;
      // Check if there's text content suggesting redirection
      const textContent = content.find(
        (c: any) => c.type === "message_creation" || c.type === "text"
      )?.text;

      console.log("Assistant message:", textContent);

      if (
        textContent &&
        (textContent.includes("redirect you to the application page") ||
          textContent.includes("take you to the application form") ||
          textContent.includes("navigate to the application") ||
          textContent.includes("application page") ||
          textContent.includes("Let me take you to") ||
          textContent.includes("I'll redirect you") ||
          textContent.includes("Let's go to"))
      ) {
        console.log("Navigation trigger detected, redirecting to /apply");
        // Navigate to the apply page with a slight delay to ensure the console log is visible
        setTimeout(() => {
          navigateToApply();
        }, 200);
      }
    }

    // Check for audio transcript redirect triggers
    if (
      eventData.type === "response.content_part.done" &&
      eventData.part?.type === "audio" &&
      eventData.part?.transcript
    ) {
      const transcript = eventData.part.transcript;
      console.log("Audio transcript:", transcript);

      // Check if transcript contains redirect phrases
      if (
        transcript &&
        (transcript.includes("redirect you to the application") ||
          transcript.includes("take you to the application") ||
          transcript.includes("navigate to the application") ||
          transcript.includes("go to the application") ||
          transcript.includes("Let me take you to") ||
          transcript.includes("I'll redirect you") ||
          transcript.includes("apply for a certificate") ||
          transcript.includes("application page") ||
          transcript.includes("application form"))
      ) {
        console.log(
          "Audio transcript navigation trigger detected, redirecting to /apply"
        );
        setTimeout(() => {
          navigateToApply();
        }, 200);
      }
    }
  };

  // Function to handle navigation to the apply page
  const navigateToApply = () => {
    console.log("Executing navigation to /apply");

    // Use window.location for more reliable navigation
    window.location.href = "/apply";
  };

  // Handle Apply button clicks
  const handleApplyClick = (certificateType?: string) => {
    // Tell the agent about the user's intent
    try {
      if (certificateType) {
        sendSimulatedUserMessage(
          `I want to apply for a ${certificateType} certificate`
        );
      } else {
        sendSimulatedUserMessage("I want to apply for a certificate");
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }

    // Navigate to apply page after a short delay
    console.log("Apply button clicked, redirecting to application page");
    setTimeout(() => {
      window.location.href = "/apply";
    }, 300);
  };

  useEffect(() => {
    let finalAgentConfig = searchParams.get("agentConfig");
    if (!finalAgentConfig || !allAgentSets[finalAgentConfig]) {
      finalAgentConfig = defaultAgentSetKey;
      const url = new URL(window.location.toString());
      url.searchParams.set("agentConfig", finalAgentConfig);
      window.location.replace(url.toString());
      return;
    }

    const agents = allAgentSets[finalAgentConfig];
    const agentKeyToUse = agents[0]?.name || "";

    setSelectedAgentName(agentKeyToUse);
    setSelectedAgentConfigSet(agents);
  }, [searchParams]);

  useEffect(() => {
    if (selectedAgentName) {
      connectToRealtime();
    }
  }, [selectedAgentName]);

  useEffect(() => {
    if (
      sessionStatus === "CONNECTED" &&
      selectedAgentConfigSet &&
      selectedAgentName
    ) {
      const currentAgent = selectedAgentConfigSet.find(
        (a) => a.name === selectedAgentName
      );
      addTranscriptBreadcrumb(`Agent: ${selectedAgentName}`, currentAgent);
      updateSession(true);
    }
  }, [selectedAgentConfigSet, selectedAgentName, sessionStatus]);

  const fetchEphemeralKey = async (): Promise<string | null> => {
    logClientEvent({ url: "/session" }, "fetch_session_token_request");
    const tokenResponse = await fetch("/api/session");
    const data = await tokenResponse.json();
    logServerEvent(data, "fetch_session_token_response");

    if (!data.client_secret?.value) {
      logClientEvent(data, "error.no_ephemeral_key");
      console.error("No ephemeral key provided by the server");
      setSessionStatus("DISCONNECTED");
      return null;
    }

    return data.client_secret.value;
  };

  const connectToRealtime = async () => {
    if (sessionStatus !== "DISCONNECTED") return;
    setSessionStatus("CONNECTING");

    try {
      const EPHEMERAL_KEY = await fetchEphemeralKey();
      if (!EPHEMERAL_KEY) {
        return;
      }

      if (!audioElementRef.current) {
        audioElementRef.current = document.createElement("audio");
      }
      audioElementRef.current.autoplay = isAudioPlaybackEnabled;

      const { pc, dc } = await createRealtimeConnection(
        EPHEMERAL_KEY,
        audioElementRef
      );
      pcRef.current = pc;
      dcRef.current = dc;

      dc.addEventListener("open", () => {
        logClientEvent({}, "data_channel.open");
      });
      dc.addEventListener("close", () => {
        logClientEvent({}, "data_channel.close");
      });
      dc.addEventListener("error", (err: any) => {
        logClientEvent({ error: err }, "data_channel.error");
      });
      dc.addEventListener("message", (e: MessageEvent) => {
        handleServerEvent(JSON.parse(e.data));
      });
    } catch (err) {
      console.error("Error connecting to realtime:", err);
      setSessionStatus("DISCONNECTED");
    }
  };

  const disconnectFromRealtime = () => {
    if (pcRef.current) {
      pcRef.current.getSenders().forEach((sender) => {
        if (sender.track) {
          sender.track.stop();
        }
      });

      pcRef.current.close();
      pcRef.current = null;
    }
    setSessionStatus("DISCONNECTED");

    logClientEvent({}, "disconnected");
  };

  const sendSimulatedUserMessage = (text: string) => {
    const id = uuidv4().slice(0, 32);
    addTranscriptMessage(id, "user", text, true);

    sendClientEvent(
      {
        type: "conversation.item.create",
        item: {
          id,
          type: "message",
          role: "user",
          content: [{ type: "input_text", text }],
        },
      },
      "(simulated user text message)"
    );
    sendClientEvent(
      { type: "response.create" },
      "(trigger response after simulated user text message)"
    );
  };

  const updateSession = (shouldTriggerResponse: boolean = false) => {
    sendClientEvent(
      { type: "input_audio_buffer.clear" },
      "clear audio buffer on session update"
    );

    const currentAgent = selectedAgentConfigSet?.find(
      (a) => a.name === selectedAgentName
    );

    const instructions = currentAgent?.instructions || "";
    const tools = currentAgent?.tools || [];

    const sessionUpdateEvent = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        instructions,
        voice: "coral",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: { model: "whisper-1" },
        tools,
      },
    };

    sendClientEvent(sessionUpdateEvent);

    if (shouldTriggerResponse) {
      sendSimulatedUserMessage("hi");
    }
  };

  useEffect(() => {
    const storedAudioPlaybackEnabled = localStorage.getItem(
      "audioPlaybackEnabled"
    );
    if (storedAudioPlaybackEnabled) {
      setIsAudioPlaybackEnabled(storedAudioPlaybackEnabled === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "audioPlaybackEnabled",
      isAudioPlaybackEnabled.toString()
    );
  }, [isAudioPlaybackEnabled]);

  useEffect(() => {
    if (audioElementRef.current) {
      if (isAudioPlaybackEnabled) {
        audioElementRef.current.play().catch((err) => {
          console.warn("Autoplay may be blocked by browser:", err);
        });
      } else {
        audioElementRef.current.pause();
      }
    }
  }, [isAudioPlaybackEnabled]);

  useEffect(() => {
    if (dcRef.current) {
      dcRef.current.addEventListener("message", (e: MessageEvent) => {
        handleServerEvent(JSON.parse(e.data));
      });
    }
  }, [dcRef.current]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-green-50 to-white">
      {/* Header */}
      <header className="bg-white text-black p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="OpenAI Logo"
              width={80}
              height={80}
              className="mr-2"
            />
            <div className="text-2xl font-bold">Kerala Government</div>
          </div>
          <div className="flex space-x-4">
            <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
              English
            </button>
            <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
              മലയാളം
            </button>
          </div>
        </div>
      </header>

      {/* Hero section */}
      <div className="relative h-[400px] bg-green-800">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "url('/kerala-bg.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative max-w-7xl mx-auto py-16 px-4 flex flex-col items-center justify-center h-full text-white text-center">
          <h1 className="text-4xl font-bold mb-6">
            Kerala Government Certificate Services
          </h1>
          <p className="text-xl mb-8 max-w-2xl">
            Your gateway to hassle-free certificate applications. Fast, secure,
            and efficient government services at your fingertips.
          </p>
          <div className="flex gap-4">
            <button
              className={`px-6 py-3 rounded-md text-lg font-semibold transition-colors ${
                sessionStatus === "CONNECTED"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
              onClick={
                sessionStatus === "CONNECTED"
                  ? disconnectFromRealtime
                  : connectToRealtime
              }
            >
              {sessionStatus === "CONNECTED"
                ? "Disconnect from Assistant"
                : "Connect to Assistant"}
            </button>
            <button
              className="px-6 py-3 bg-blue-600 text-white rounded-md text-lg font-semibold hover:bg-blue-700"
              onClick={() => handleApplyClick()}
            >
              Apply for Certificate
            </button>
          </div>
          <div className="mt-4 text-white">
            Connection Status:{" "}
            <span
              className={
                sessionStatus === "CONNECTED"
                  ? "text-green-300"
                  : "text-red-300"
              }
            >
              {sessionStatus === "CONNECTED"
                ? "Connected"
                : sessionStatus === "CONNECTING"
                ? "Connecting..."
                : "Disconnected"}
            </span>
          </div>
        </div>
      </div>

      {/* Services section */}
      <div className="max-w-7xl mx-auto py-16 px-4">
        <h2 className="text-3xl font-bold text-center mb-10 text-green-900">
          Available Certificate Services
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              type: "Caste",
              description: "Official document certifying your caste status",
              icon: "📜",
              color: "bg-purple-50",
              borderColor: "border-purple-200",
            },
            {
              type: "Income",
              description: "Proof of annual income certification",
              icon: "💰",
              color: "bg-blue-50",
              borderColor: "border-blue-200",
            },
            {
              type: "Domicile",
              description: "Verify your residential status in Kerala",
              icon: "🏠",
              color: "bg-green-50",
              borderColor: "border-green-200",
            },
            {
              type: "Birth",
              description: "Official birth registration certificate",
              icon: "👶",
              color: "bg-pink-50",
              borderColor: "border-pink-200",
            },
            {
              type: "Death",
              description: "Death registration certification",
              icon: "📋",
              color: "bg-gray-50",
              borderColor: "border-gray-200",
            },
            {
              type: "Marriage",
              description: "Legal marriage registration certificate",
              icon: "💑",
              color: "bg-red-50",
              borderColor: "border-red-200",
            },
          ].map((cert) => (
            <div
              key={cert.type}
              className={`border-2 rounded-lg p-6 transition-all cursor-pointer ${cert.color} ${cert.borderColor} hover:shadow-md`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`text-3xl ${cert.color} p-2 rounded-full`}>
                  {cert.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-800">
                  {cert.type} Certificate
                </h3>
              </div>
              <p className="text-gray-600 mb-4">{cert.description}</p>
              <button
                className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                onClick={() => handleApplyClick(cert.type)}
              >
                Apply Now
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-green-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4">Contact Us</h3>
              <p>Kerala Government Secretariat</p>
              <p>Thiruvananthapuram, Kerala</p>
              <p>India - 695001</p>
              <p>Phone: +91 471 2518800</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="hover:underline">
                    Home
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:underline">
                    Services
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:underline">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:underline">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Follow Us</h3>
              <div className="flex space-x-4">
                <a href="#" className="hover:text-green-300">
                  Facebook
                </a>
                <a href="#" className="hover:text-green-300">
                  Twitter
                </a>
                <a href="#" className="hover:text-green-300">
                  Instagram
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-green-700 text-center">
            <p>© 2023 Government of Kerala. All Rights Reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
