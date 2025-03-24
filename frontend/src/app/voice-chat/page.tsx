"use client";

import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mic, MicOff, Send, Volume2, Headphones } from "lucide-react";

// Define types for our chat messages
interface Message {
  role: "user" | "assistant";
  content: string;
  isAudio?: boolean;
}

export default function VoiceChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const [autoMode, setAutoMode] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string>("Initializing...");
  const [currentVolumeLevel, setCurrentVolumeLevel] = useState<number>(0);
  const [thresholdValue, setThresholdValue] = useState<number>(2);
  const [showVolumeNumbers, setShowVolumeNumbers] = useState<boolean>(false);
  const [maxRecordingTime, setMaxRecordingTime] = useState<number>(10); // Maximum recording time in seconds
  const [stopSensitivity, setStopSensitivity] = useState<number>(3); // New: Sensitivity for stopping (1-10)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const speechTimeout = useRef<NodeJS.Timeout | null>(null);
  const silenceTimeout = useRef<NodeJS.Timeout | null>(null);
  const volumeCallback = useRef<Function | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const recentVolumeLevelsRef = useRef<number[]>([]);
  const silenceFrameCountRef = useRef<number>(0);
  const volumeHistoryRef = useRef<number[]>(Array(50).fill(0));
  const recordingStartTimeRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const peakVolumeReachedRef = useRef<boolean>(false);
  const lowVolumeFrameCountRef = useRef<number>(0);

  // Constants for audio detection
  const MAX_SILENCE_FRAMES = 50; // About 1 second of silence (at 60fps)
  const PEAK_VOLUME_THRESHOLD = 95; // Volume must reach this level to enable auto-stop at lower volumes
  const LOW_VOLUME_STOP_THRESHOLD = 50; // Stop recording when volume drops below this after peak reached
  const MAX_SILENCE_DURATION = 800; // Shortened silence timeout (ms) before stopping
  const CONSECUTIVE_LOW_FRAMES_FOR_STOP = 5; // How many consecutive low frames before stopping
  const MIN_RECORDING_DURATION = 1000; // Minimum recording duration (ms) before allowing auto-stop

  // Use an array of Whisper-supported formats to try
  const supportedFormats = [
    "audio/mp4",
    "audio/m4a",
    "audio/webm",
    "audio/webm;codecs=opus",
    "audio/wav",
    "audio/ogg;codecs=opus",
    "audio/mpeg",
  ];

  // Find the first supported format
  let options: MediaRecorderOptions = {};
  const supportedFormat = supportedFormats.find((format) => {
    try {
      return MediaRecorder.isTypeSupported(format);
    } catch (e) {
      console.warn(`Error checking support for ${format}:`, e);
      return false;
    }
  });

  if (supportedFormat) {
    options = { mimeType: supportedFormat };
    console.log(`Using supported audio format: ${supportedFormat}`);
  } else {
    console.log(
      "No explicitly supported formats available - using browser default"
    );
  }

  // Connect to WebSocket server
  useEffect(() => {
    console.log("Initializing WebSocket connection...");
    const socketInstance = io("http://localhost:5000");
    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      console.log("Connected to WebSocket server");
      setStatusMessage("Connected to server. You can start speaking now.");
    });

    socketInstance.on("disconnect", () => {
      console.log("Disconnected from WebSocket server");
      setStatusMessage("Disconnected from server. Trying to reconnect...");
    });

    socketInstance.on("transcription", (text: string) => {
      console.log("Received transcription:", text);
      setMessages((prev) => [...prev, { role: "user", content: text }]);
    });

    socketInstance.on("response", (text: string) => {
      console.log("Received AI response:", text);
      setMessages((prev) => [...prev, { role: "assistant", content: text }]);
      playResponseAudio(text);
    });

    socketInstance.on("error", (errorMessage: string) => {
      console.error("WebSocket error:", errorMessage);
      setError(errorMessage);
    });

    return () => {
      console.log("Cleaning up WebSocket connection");
      socketInstance.disconnect();
    };
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Start auto listening when component mounts if autoMode is enabled
  useEffect(() => {
    if (autoMode) {
      startListening();
    }

    return () => {
      stopListening();
    };
  }, [autoMode]);

  // Initialize audio processing for voice detection
  const initAudioProcessing = (stream: MediaStream) => {
    try {
      console.log(
        "Audio stream received. Tracks:",
        stream.getAudioTracks().length
      );

      // Log audio track settings to debug
      stream.getAudioTracks().forEach((track) => {
        console.log("Audio track settings:", track.getSettings());
        console.log("Audio track constraints:", track.getConstraints());
        console.log("Audio track enabled:", track.enabled);
        console.log("Audio track muted:", track.muted);
      });

      // Using AudioContext with suspended workaround for Chrome
      const audioContext = new AudioContext();

      // Chrome may require user interaction before starting AudioContext
      if (audioContext.state === "suspended") {
        console.log("AudioContext is suspended. Attempting to resume.");
        audioContext
          .resume()
          .then(() => {
            console.log("AudioContext resumed successfully");
          })
          .catch((err) => {
            console.error("Failed to resume AudioContext:", err);
          });
      }

      audioContextRef.current = audioContext;

      console.log("Creating source from microphone stream");
      const source = audioContext.createMediaStreamSource(stream);

      console.log("Creating ScriptProcessor for direct audio processing");
      // Use ScriptProcessor for more direct audio processing (better for some browsers)
      const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

      // Also keep an analyzer for frequency data
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256; // Smaller FFT size for more responsive visualization
      analyser.smoothingTimeConstant = 0.2; // Less smoothing for faster response

      // Connect everything
      source.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);

      // Set up the array for frequency data
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      console.log(
        "Audio processing setup complete. Buffer length:",
        bufferLength
      );

      // Reset counters
      recentVolumeLevelsRef.current = [];
      silenceFrameCountRef.current = 0;
      volumeHistoryRef.current = Array(50).fill(0);

      // Add direct scriptProcessor audio processing (more reliable than analyzer in some browsers)
      scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
        // Get raw audio data
        const inputBuffer = audioProcessingEvent.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);

        // Calculate volume using RMS (root mean square)
        let sumSquares = 0;
        for (let i = 0; i < inputData.length; i++) {
          // Sum the squared values
          sumSquares += inputData[i] * inputData[i];
        }

        // Calculate the RMS value
        const rms = Math.sqrt(sumSquares / inputData.length);

        // Convert to a 0-100 range with amplification
        const volume = Math.min(100, Math.floor(rms * 10000));

        // Set the volume level and update history
        setCurrentVolumeLevel(volume);

        // Update volume history
        volumeHistoryRef.current.push(volume);
        volumeHistoryRef.current.shift();

        // Check for speech
        const isSpeakingNow = volume > thresholdValue;

        // Update recording state based on speech detection
        if (isSpeakingNow && !isRecording && !isProcessingRef.current) {
          console.log(
            `Speech detected (volume: ${volume}), starting recording`
          );
          if (silenceTimeout.current) {
            clearTimeout(silenceTimeout.current);
            silenceTimeout.current = null;
          }
          lowVolumeFrameCountRef.current = 0;
          startRecording();
          setIsSpeaking(true);
        } else if (isRecording) {
          // Check if we've reached peak volume
          if (volume >= PEAK_VOLUME_THRESHOLD) {
            peakVolumeReachedRef.current = true;
            console.log(`Peak volume reached: ${volume}`);
            lowVolumeFrameCountRef.current = 0;
          }

          // Get current recording duration
          const recordingDuration = recordingStartTimeRef.current
            ? Date.now() - recordingStartTimeRef.current
            : 0;

          if (isSpeakingNow) {
            setIsSpeaking(true);
            lowVolumeFrameCountRef.current = 0;
            if (silenceTimeout.current) {
              clearTimeout(silenceTimeout.current);
              silenceTimeout.current = null;
            }

            // Check recording duration
            if (recordingDuration > maxRecordingTime * 1000) {
              console.log(
                `Maximum recording time reached (${maxRecordingTime}s), stopping recording`
              );
              stopRecording();
            }
          } else if (!isSpeakingNow) {
            setIsSpeaking(false);

            // Only consider stopping if we've recorded for at least the minimum duration
            if (recordingDuration >= MIN_RECORDING_DURATION) {
              // If we've reached peak volume and now it's below LOW_VOLUME_STOP_THRESHOLD, count frames
              if (
                peakVolumeReachedRef.current &&
                volume < LOW_VOLUME_STOP_THRESHOLD
              ) {
                lowVolumeFrameCountRef.current++;

                // If we've had enough consecutive low volume frames, stop recording
                if (
                  lowVolumeFrameCountRef.current >=
                  CONSECUTIVE_LOW_FRAMES_FOR_STOP * stopSensitivity
                ) {
                  console.log(
                    `${lowVolumeFrameCountRef.current} consecutive low volume frames detected, stopping recording`
                  );
                  stopRecording();
                  return;
                }
              } else {
                // Reset the counter if volume goes back up
                lowVolumeFrameCountRef.current = 0;
              }

              // Set silence timeout if not already set
              if (!silenceTimeout.current) {
                console.log(
                  `Silence detected (volume: ${volume}), setting silence timeout`
                );
                silenceTimeout.current = setTimeout(() => {
                  if (isRecording && !isProcessingRef.current) {
                    console.log("Silence timeout reached, stopping recording");
                    stopRecording();
                    silenceTimeout.current = null;
                  }
                }, MAX_SILENCE_DURATION); // Shorter silence timeout before stopping
              }
            }
          }
        }
      };

      // Keep the analyzer method as a backup and for visualization
      const checkAudioLevel = () => {
        if (!isListening) return;
        if (isPlaying) {
          requestAnimationFrame(checkAudioLevel);
          return;
        }

        analyser.getByteFrequencyData(dataArray);

        // For debugging, always log the raw values
        if (Math.random() < 0.05) {
          // Log only 5% of frames to avoid console flooding
          console.log(
            "Raw frequency data:",
            Array.from(dataArray).slice(0, 10)
          );
        }

        // Schedule next check
        requestAnimationFrame(checkAudioLevel);
      };

      // Start monitoring audio levels as a backup
      checkAudioLevel();

      // Return the cleanup function
      return () => {
        console.log("Cleaning up audio processing");
        scriptProcessor.disconnect();
        analyser.disconnect();
        source.disconnect();
        audioContext.close();
      };
    } catch (err: unknown) {
      console.error("Error setting up audio processing:", err);
      setError(
        `Failed to set up voice detection: ${
          err instanceof Error ? err.message : "Unknown error"
        }. Please try again.`
      );
    }
  };

  // Start listening for audio with improved error handling
  const startListening = async () => {
    try {
      setStatusMessage("Requesting microphone access...");
      setError(null);

      if (isListening) {
        console.log("Already listening");
        return;
      }

      console.log("Getting user media with audio constraints");

      // Try with more detailed constraints first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 1,
          },
        });

        console.log("Successfully got audio stream with detailed constraints");
        streamRef.current = stream;
        setIsListening(true);
        setStatusMessage("Listening with enhanced audio settings...");

        // Initialize audio processing
        initAudioProcessing(stream);
      } catch (detailedErr) {
        console.warn(
          "Failed with detailed constraints, trying basic audio:",
          detailedErr
        );

        // Fall back to basic audio constraints
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        console.log("Successfully got audio stream with basic constraints");
        streamRef.current = stream;
        setIsListening(true);
        setStatusMessage("Listening with basic audio settings...");

        // Initialize audio processing
        initAudioProcessing(stream);
      }

      console.log("Audio processing initialized");
    } catch (err: unknown) {
      console.error("Error accessing microphone:", err);
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError(
          "⚠️ Microphone access denied. Please allow microphone access and refresh the page."
        );
      } else {
        setError(
          `⚠️ Could not access microphone: ${
            err instanceof Error ? err.message : "Unknown error"
          }. Please check your device settings.`
        );
      }
      setIsListening(false);
      setStatusMessage("Cannot listen - microphone access denied.");
    }
  };

  // Stop listening for audio
  const stopListening = () => {
    try {
      console.log("Executing stopListening...");

      // First, make sure recording is stopped
      if (isRecording) {
        console.log("Stopping active recording first");
        stopRecording();
      }

      // Clean up audio processing
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
          console.log("AudioContext closed successfully");
        } catch (err) {
          console.error("Error closing AudioContext:", err);
        }
        audioContextRef.current = null;
      }

      // Clean up timeouts
      if (speechTimeout.current) {
        clearTimeout(speechTimeout.current);
        speechTimeout.current = null;
      }

      if (silenceTimeout.current) {
        clearTimeout(silenceTimeout.current);
        silenceTimeout.current = null;
      }

      // Stop all tracks in the stream
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach((track) => {
            track.stop();
            console.log(`Audio track ${track.id} stopped`);
          });
        } catch (err) {
          console.error("Error stopping audio tracks:", err);
        }
        streamRef.current = null;
      }

      // Force reset all state variables
      setIsListening(false);
      setIsRecording(false);
      setIsSpeaking(false);
      setStatusMessage("Listening stopped.");
      console.log("Listening completely stopped");
    } catch (err) {
      console.error("Error in stopListening:", err);
      // Force reset state even on error
      setIsListening(false);
      setIsRecording(false);
      setIsSpeaking(false);
      setError("Error stopping listening. Please refresh the page.");
    }
  };

  // Start recording audio
  const startRecording = () => {
    try {
      if (isRecording || !streamRef.current || isProcessingRef.current) {
        console.log("Cannot start recording:", {
          isRecording,
          hasStream: !!streamRef.current,
          isProcessing: isProcessingRef.current,
        });
        return;
      }

      console.log("Starting recording");

      // Reset recording state
      recordingStartTimeRef.current = Date.now();
      peakVolumeReachedRef.current = false;

      // Create MediaRecorder with format options
      const mediaRecorder = new MediaRecorder(streamRef.current, options);
      console.log(
        "Created MediaRecorder with mimeType:",
        mediaRecorder.mimeType
      );

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Set up data collection
      mediaRecorder.ondataavailable = (event) => {
        console.log(`Data available event, size: ${event.data.size} bytes`);
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Set up what happens when recording stops
      mediaRecorder.onstop = () => {
        console.log(
          "MediaRecorder stopped event triggered, processing audio..."
        );
        processRecordedAudio();
      };

      // Lifecycle events for debugging
      mediaRecorder.onstart = () => {
        console.log("MediaRecorder started");
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
      };

      // Start recording - collect data more frequently in smaller chunks
      mediaRecorder.start(200); // Collect data every 200ms
      setIsRecording(true);
      setStatusMessage("Recording your message...");

      // Set a timer to stop recording after maxRecordingTime seconds
      recordingTimerRef.current = setTimeout(() => {
        if (isRecording) {
          console.log(
            `Maximum recording time (${maxRecordingTime}s) reached, stopping recording`
          );
          stopRecording();
        }
      }, maxRecordingTime * 1000);
    } catch (err) {
      console.error("Error starting recording:", err);
      setError("Failed to start recording. Please refresh and try again.");
      setIsRecording(false);
    }
  };

  // Stop recording audio with enhanced reliability
  const stopRecording = () => {
    if (!isRecording) return;

    console.log("Explicitly stopping recording");
    try {
      // Clear recording timer if it exists
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      // Clear silence timeout if it exists
      if (silenceTimeout.current) {
        clearTimeout(silenceTimeout.current);
        silenceTimeout.current = null;
      }

      // Force state update first to prevent any race conditions
      setIsRecording(false);

      // Track attempts to avoid infinite loops
      let stopAttempt = 0;
      const maxStopAttempts = 3;

      const finalizeStop = () => {
        // Reset recording state
        recordingStartTimeRef.current = null;
        peakVolumeReachedRef.current = false;
        lowVolumeFrameCountRef.current = 0;

        setStatusMessage("Processing your message...");

        // If we have audio chunks, process them
        if (audioChunksRef.current.length > 0) {
          processRecordedAudio();
        } else {
          console.log("No audio chunks to process after stopping");
          isProcessingRef.current = false;
        }
      };

      // Try to stop the MediaRecorder if it exists and is active
      if (mediaRecorderRef.current) {
        const attemptStop = () => {
          stopAttempt++;

          try {
            if (
              mediaRecorderRef.current &&
              mediaRecorderRef.current.state !== "inactive"
            ) {
              console.log(
                `Stop attempt ${stopAttempt}: Calling stop() on MediaRecorder`
              );
              mediaRecorderRef.current.stop();

              // Double-check after a short delay that it really stopped
              setTimeout(() => {
                if (
                  mediaRecorderRef.current &&
                  mediaRecorderRef.current.state !== "inactive"
                ) {
                  console.warn(
                    "MediaRecorder still not inactive after stop() call"
                  );
                  if (stopAttempt < maxStopAttempts) {
                    attemptStop(); // Try again
                  } else {
                    console.error("Max stop attempts reached, forcing cleanup");
                    finalizeStop();
                  }
                } else {
                  console.log("MediaRecorder successfully stopped");
                  // We don't need to call processRecordedAudio() here because onstop will do it
                }
              }, 100);
            } else {
              console.log(
                "MediaRecorder already inactive, manually triggering processing"
              );
              finalizeStop();
            }
          } catch (stopErr) {
            console.error(`Error in stop attempt ${stopAttempt}:`, stopErr);
            if (stopAttempt < maxStopAttempts) {
              attemptStop(); // Try again
            } else {
              finalizeStop(); // Give up and just process what we have
            }
          }
        };

        // Start the stop attempt process
        attemptStop();
      } else {
        console.log("No MediaRecorder found to stop");
        finalizeStop();
      }
    } catch (err: unknown) {
      console.error("Error stopping recording:", err);
      setError(
        "Failed to stop recording properly. Please try the Force Stop button."
      );
      // Try to recover
      isProcessingRef.current = false;
      setIsRecording(false);
    }
  };

  // Force stop recording (emergency button for when normal stop fails)
  const forceStopRecording = () => {
    console.log("FORCE STOP: Emergency stop of recording");

    try {
      // Clear all timers
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      if (silenceTimeout.current) {
        clearTimeout(silenceTimeout.current);
        silenceTimeout.current = null;
      }

      // Reset state immediately
      setIsRecording(false);
      setIsSpeaking(false);

      // Force the MediaRecorder to stop if it exists
      if (mediaRecorderRef.current) {
        try {
          if (mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
          }
        } catch (e) {
          console.error("Error stopping MediaRecorder:", e);
        }
      }

      // Reset all recording state
      recordingStartTimeRef.current = null;
      peakVolumeReachedRef.current = false;

      // Process any audio we might have
      if (audioChunksRef.current.length > 0) {
        processRecordedAudio();
      } else {
        isProcessingRef.current = false;
      }

      setStatusMessage("Recording forcefully stopped. Ready to listen again.");
    } catch (err: unknown) {
      console.error("Error in force stop:", err);
      // Make sure we reset state even on errors
      setIsRecording(false);
      isProcessingRef.current = false;
    }
  };

  // Process the recorded audio
  const processRecordedAudio = async () => {
    console.log(
      "Processing recorded audio, chunks:",
      audioChunksRef.current.length
    );

    if (audioChunksRef.current.length === 0) {
      console.log("No audio chunks to process, resetting state");
      isProcessingRef.current = false;
      return;
    }

    // Prevent multiple processing operations simultaneously
    if (isProcessingRef.current) {
      console.log("Already processing audio, ignoring");
      return;
    }

    isProcessingRef.current = true;

    try {
      // Get MIME type from the MediaRecorder
      const mimeType =
        mediaRecorderRef.current?.mimeType || supportedFormat || "audio/webm";
      console.log(`Using MIME type: ${mimeType} for audio blob creation`);

      // Create audio blob with explicit MIME type
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      console.log(
        `Created audio blob, size: ${audioBlob.size} bytes, type: ${audioBlob.type}`
      );

      if (audioBlob.size < 100) {
        console.log("Audio too short, ignoring");
        isProcessingRef.current = false;
        setStatusMessage("Audio too short. Please speak longer.");
        return;
      }

      // Extract file extension from mimeType
      let fileExtension = "webm";
      if (mimeType.includes("mp4")) fileExtension = "mp4";
      else if (mimeType.includes("m4a")) fileExtension = "m4a";
      else if (mimeType.includes("webm")) fileExtension = "webm";
      else if (mimeType.includes("wav")) fileExtension = "wav";
      else if (mimeType.includes("ogg")) fileExtension = "ogg";
      else if (mimeType.includes("mpeg") || mimeType.includes("mp3"))
        fileExtension = "mp3";

      // Rename blob with proper extension to help server identify format
      const properBlob = new Blob([audioBlob], { type: mimeType });
      const file = new File([properBlob], `recording.${fileExtension}`, {
        type: mimeType,
        lastModified: Date.now(),
      });

      console.log(
        `Created file with name recording.${fileExtension} and type ${file.type}`
      );

      await sendAudioToServer(file);
    } catch (err) {
      console.error("Error processing audio:", err);
      setError("Failed to process audio. Please try again.");
    } finally {
      isProcessingRef.current = false;
    }
  };

  // Send recorded audio to the server
  const sendAudioToServer = async (audioFile: File | Blob) => {
    if (!socket?.connected) {
      setError("Not connected to server. Please refresh the page.");
      isProcessingRef.current = false;
      return;
    }

    // Check if the audio blob is valid
    if (!audioFile || audioFile.size === 0) {
      console.log("Empty audio file, not sending");
      isProcessingRef.current = false;
      return;
    }

    console.log(
      `Sending audio to server, size: ${audioFile.size} bytes, type: ${
        audioFile.type || "default"
      }${audioFile instanceof File ? `, filename: ${audioFile.name}` : ""}`
    );

    const formData = new FormData();
    formData.append("audio", audioFile);

    try {
      // Show a sending status message
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: "Processing your message...",
          isAudio: true,
        },
      ]);

      console.log("Sending fetch request to /api/transcribe");
      const response = await fetch("http://localhost:5000/api/transcribe", {
        method: "POST",
        body: formData,
      });

      console.log("Server response received:", response.status);

      // Remove the processing message
      setMessages((prev) => prev.filter((msg) => !msg.isAudio));

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server error:", errorText);
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

  // Play audio response from OpenAI
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
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and play audio
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        console.log("Audio playback complete");
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        setStatusMessage("Listening... Speak whenever you're ready.");
      };

      audio.onerror = () => {
        console.error("Audio playback error");
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        setStatusMessage("Listening... Speak whenever you're ready.");
      };

      await audio.play();
    } catch (err) {
      console.error("Error playing audio:", err);
      setError("Failed to play response audio.");
      setIsPlaying(false);
      setStatusMessage("Listening... Speak whenever you're ready.");
    }
  };

  // Toggle auto mode
  const toggleAutoMode = () => {
    if (autoMode) {
      // Turning off auto mode
      stopListening();
      setAutoMode(false);
      setStatusMessage(
        "Auto mode disabled. Click the microphone button to talk."
      );
    } else {
      // Turning on auto mode
      setAutoMode(true);
      startListening();
      setStatusMessage("Auto mode enabled. You can start speaking anytime.");
    }
  };

  // Manual recording control (backup option)
  const toggleRecording = () => {
    if (autoMode) return; // Do nothing in auto mode

    if (isRecording) {
      stopRecording();
    } else {
      if (!isListening) {
        startListening();
      }
      startRecording();
    }
  };

  // Add an emergency reset function
  const emergencyReset = () => {
    try {
      console.log("EMERGENCY RESET: Forcing cleanup of all audio resources");

      // Stop any active MediaRecorder
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        try {
          mediaRecorderRef.current.stop();
        } catch (err) {
          console.error("Error stopping MediaRecorder:", err);
        }
      }

      // Force close AudioContext
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (err) {
          console.error("Error closing AudioContext:", err);
        }
      }

      // Stop all audio tracks
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach((track) => track.stop());
        } catch (err) {
          console.error("Error stopping audio tracks:", err);
        }
      }

      // Clear all timeouts
      if (speechTimeout.current) clearTimeout(speechTimeout.current);
      if (silenceTimeout.current) clearTimeout(silenceTimeout.current);

      // Reset all refs
      mediaRecorderRef.current = null;
      audioContextRef.current = null;
      streamRef.current = null;
      speechTimeout.current = null;
      silenceTimeout.current = null;
      audioChunksRef.current = [];
      isProcessingRef.current = false;

      // Reset all state
      setIsListening(false);
      setIsRecording(false);
      setIsSpeaking(false);
      setIsPlaying(false);
      setStatusMessage(
        "System reset complete. Please refresh the page if issues persist."
      );

      console.log("Emergency reset complete");
    } catch (err) {
      console.error("Error during emergency reset:", err);
      setError("Failed to reset audio system. Please refresh the page.");
    }
  };

  // Add a simple reset button for when recording doesn't start
  const forceStartRecording = () => {
    if (!isListening) {
      startListening().then(() => {
        // Wait a short time for the audio context to initialize
        setTimeout(() => {
          startRecording();
        }, 500);
      });
    } else {
      startRecording();
    }
  };

  // Add function to test microphone
  const testMicrophone = () => {
    if (!isListening) {
      startListening();
    }
    // Flash status message to show we're testing
    setStatusMessage("Testing microphone... Please speak");
    setTimeout(() => {
      if (isListening) {
        setStatusMessage("Listening... Speak whenever you're ready.");
      }
    }, 2000);
  };

  // Add this new function to test audio thoroughly
  const diagnoseAudio = async () => {
    try {
      setStatusMessage("Testing audio system...");
      setError(null);

      // List all audio devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = devices.filter(
        (device) => device.kind === "audioinput"
      );

      console.log("Available audio devices:", audioDevices.length);
      audioDevices.forEach((device, index) => {
        console.log(
          `Device ${index}: ${
            device.label || "unnamed device"
          } (${device.deviceId.substring(0, 8)}...)`
        );
      });

      // Stop any existing streams
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      // Create a new audio context
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (e) {
          console.error("Error closing existing AudioContext:", e);
        }
        audioContextRef.current = null;
      }

      // Try with the default device
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Flash indicator that we're testing
      setCurrentVolumeLevel(100);
      setTimeout(() => setCurrentVolumeLevel(0), 300);

      // Get a short audio sample
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 32;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Sample a few frames
      for (let i = 0; i < 5; i++) {
        analyser.getByteFrequencyData(dataArray);
        console.log(`Audio sample ${i}:`, Array.from(dataArray));
        await new Promise((r) => setTimeout(r, 100));
      }

      // Clean up
      source.disconnect();
      audioContext.close();

      setStatusMessage("Audio diagnostic complete. Check console for details.");

      // Restart listening
      stopListening();
      setTimeout(() => {
        startListening();
      }, 500);
    } catch (err: unknown) {
      console.error("Audio diagnostics error:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Audio diagnostics failed: ${errorMessage}`);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Real-time Voice Chat with OpenAI</CardTitle>
          <CardDescription className="flex justify-between items-center">
            <span>
              Natural conversation with OpenAI - just like a phone call
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDebug(!showDebug)}
              className="text-xs"
            >
              {showDebug ? "Hide Debug" : "Show Debug"}
            </Button>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Debug controls */}
          {showDebug && (
            <div className="mb-4 p-3 bg-gray-100 rounded-md">
              <h3 className="font-medium mb-2">Debug Tools</h3>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={toggleAutoMode}>
                  {autoMode ? "Disable Auto Mode" : "Enable Auto Mode"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => socket?.emit("clearConversation")}
                >
                  Clear Chat
                </Button>
                <Button
                  variant={isListening ? "default" : "outline"}
                  size="sm"
                  onClick={isListening ? stopListening : startListening}
                >
                  {isListening ? "Stop Listening" : "Start Listening"}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={forceStartRecording}
                >
                  Force Start Recording
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={forceStopRecording}
                  className="bg-red-500 hover:bg-red-600"
                >
                  Force Stop Recording
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={emergencyReset}
                  className="ml-auto"
                >
                  Emergency Reset
                </Button>
              </div>

              {/* Microphone test button */}
              <div className="mt-2 flex gap-2">
                <Button variant="outline" size="sm" onClick={testMicrophone}>
                  Test Microphone
                </Button>
                <Button variant="default" size="sm" onClick={diagnoseAudio}>
                  Diagnose Audio
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowVolumeNumbers(!showVolumeNumbers)}
                >
                  {showVolumeNumbers ? "Hide Numbers" : "Show Numbers"}
                </Button>
              </div>

              <div className="mt-2 text-xs text-gray-500">
                <p>Connected: {socket?.connected ? "Yes" : "No"}</p>
                <p>Listening: {isListening ? "Yes" : "No"}</p>
                <p>Recording: {isRecording ? "Yes" : "No"}</p>
                <p>Speaking: {isSpeaking ? "Yes" : "No"}</p>
                <p>Playing: {isPlaying ? "Yes" : "No"}</p>
                <p className="font-medium text-blue-500">
                  Volume: {currentVolumeLevel.toFixed(1)}
                </p>
              </div>

              {/* Add adjustable threshold slider */}
              <div className="mt-3">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-gray-700">
                    Speech Detection Threshold:
                  </label>
                  <span className="text-xs font-medium">{thresholdValue}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="30"
                  step="0.5"
                  value={thresholdValue}
                  onChange={(e) =>
                    setThresholdValue(parseFloat(e.target.value))
                  }
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Lower = more sensitive, Higher = less sensitive
                </p>
              </div>

              {/* Add max recording time slider */}
              <div className="mt-3">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-gray-700">
                    Max Recording Time (seconds):
                  </label>
                  <span className="text-xs font-medium">
                    {maxRecordingTime}s
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={maxRecordingTime}
                  onChange={(e) =>
                    setMaxRecordingTime(parseInt(e.target.value))
                  }
                  className="w-full"
                />
              </div>

              {/* Add threshold indicators */}
              <div className="mt-2 flex gap-2 text-xs">
                <span className="flex items-center">
                  <span className="inline-block w-3 h-3 bg-yellow-500 mr-1"></span>
                  Peak: {PEAK_VOLUME_THRESHOLD}
                </span>
                <span className="flex items-center">
                  <span className="inline-block w-3 h-3 bg-red-500 mr-1"></span>
                  Stop: {LOW_VOLUME_STOP_THRESHOLD}
                </span>
              </div>

              {/* Add stop sensitivity slider */}
              <div className="mt-3">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-gray-700">
                    Stop Sensitivity:
                  </label>
                  <span className="text-xs font-medium">
                    {stopSensitivity}{" "}
                    {stopSensitivity <= 2
                      ? "(Fast)"
                      : stopSensitivity >= 8
                      ? "(Slow)"
                      : "(Normal)"}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={stopSensitivity}
                  onChange={(e) => setStopSensitivity(parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Low = stops quickly, High = waits longer before stopping
                </p>
              </div>

              {/* Enhanced volume meter */}
              <div className="mt-3">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs text-gray-700">Current Volume Level:</p>
                  <span className="text-xs font-medium">
                    {currentVolumeLevel.toFixed(1)}
                  </span>
                </div>
                <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
                  <div
                    className={`h-full rounded-full ${
                      currentVolumeLevel > thresholdValue
                        ? "bg-green-500"
                        : "bg-gray-400"
                    }`}
                    style={{
                      width: `${Math.min(currentVolumeLevel, 100)}%`,
                      transition: "width 0.1s ease",
                    }}
                  ></div>
                </div>

                {/* Volume history visualization with thresholds */}
                <div className="mt-2 w-full h-16 bg-gray-100 rounded border border-gray-300 overflow-hidden flex items-end relative">
                  {volumeHistoryRef.current.map((level, i) => (
                    <div
                      key={i}
                      className={
                        level > thresholdValue ? "bg-green-500" : "bg-gray-300"
                      }
                      style={{
                        height: `${Math.min(level, 100)}%`,
                        width: `${100 / volumeHistoryRef.current.length}%`,
                      }}
                    />
                  ))}
                  {/* Speech threshold */}
                  <div
                    className="absolute h-[1px] bg-purple-500 w-full pointer-events-none"
                    style={{ bottom: `${Math.min(thresholdValue, 100)}%` }}
                  />
                  {/* Peak threshold line */}
                  <div
                    className="absolute h-[1px] bg-yellow-500 w-full pointer-events-none"
                    style={{
                      bottom: `${Math.min(PEAK_VOLUME_THRESHOLD, 100)}%`,
                    }}
                  />
                  {/* Low volume stop line */}
                  <div
                    className="absolute h-[1px] bg-red-500 w-full pointer-events-none"
                    style={{
                      bottom: `${Math.min(LOW_VOLUME_STOP_THRESHOLD, 100)}%`,
                    }}
                  />
                </div>
                {isRecording && recordingStartTimeRef.current && (
                  <p className="text-xs text-gray-500 mt-1">
                    Recording:{" "}
                    {(
                      (Date.now() - recordingStartTimeRef.current) /
                      1000
                    ).toFixed(1)}
                    s / {maxRecordingTime}s
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Status message */}
          <div className="mb-4 text-center text-sm font-medium text-gray-600">
            <p className="flex items-center justify-center gap-2">
              {isRecording && (
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
              {isPlaying && <Volume2 size={16} className="text-blue-500" />}
              {isListening && !isRecording && !isPlaying && (
                <Headphones size={16} className="text-green-500" />
              )}
              {statusMessage}
            </p>
          </div>

          {/* Messages display */}
          <div className="space-y-4 h-[400px] overflow-y-auto p-4 border rounded-lg">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 h-full flex flex-col items-center justify-center space-y-4">
                <p className="font-medium">
                  {autoMode
                    ? "Just start speaking and I'll listen"
                    : "Click the microphone button to start talking"}
                </p>

                <div className="max-w-md text-sm mt-4 bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-bold mb-2 text-blue-800">How to use:</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>Speak naturally when you see "Listening..."</li>
                    <li>Pause briefly when you're done speaking</li>
                    <li>Wait for the AI to process and respond</li>
                    <li>Continue the conversation naturally</li>
                    <li>The system will automatically detect when you speak</li>
                  </ol>
                  <p className="mt-3 text-xs text-gray-500">
                    Note: For best results, use a headset in a quiet
                    environment.
                  </p>
                </div>
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

          {/* Error display */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-md flex items-start">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="font-semibold">Error</p>
                <p>{error}</p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-between border-t p-4">
          <div className="flex-1 flex justify-center">
            <Button
              variant={
                isListening
                  ? isRecording
                    ? "destructive"
                    : "default"
                  : "outline"
              }
              size="lg"
              className={`rounded-full h-16 w-16 shadow-lg hover:shadow-xl transition-all ${
                autoMode ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onClick={toggleRecording}
              disabled={autoMode || isPlaying}
              title={
                autoMode
                  ? "Auto mode is enabled - speech is detected automatically"
                  : "Click to start/stop recording manually"
              }
            >
              {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
            </Button>
          </div>

          {isRecording && (
            <div className="absolute left-1/2 transform -translate-x-1/2 bottom-4 bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-medium animate-pulse">
              Recording...
            </div>
          )}

          {isPlaying && (
            <div className="absolute right-8 bottom-8 animate-pulse">
              <Volume2 className="text-blue-500" size={24} />
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
