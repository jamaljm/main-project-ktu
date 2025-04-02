"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { v4 as uuidv4 } from "uuid";

// Types
import { AgentConfig, SessionStatus } from "@/app/types";

// Context providers & hooks
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useHandleServerEvent } from "../hooks/useHandleServerEvent";

// Utilities
import { createRealtimeConnection } from "../lib/realtimeConnection";

// Agent configs
import { allAgentSets, defaultAgentSetKey } from "@/app/agentConfigs";

interface FormData {
  fullName: string;
  dob: string;
  gender: string;
  email: string;
  phone: string;
  address: string;
  pincode: string;
  aadharNumber: string;
  certificateType: string;
}

const Button = ({
  children,
  className,
  asChild,
  type = "button",
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
  type?: "button" | "submit" | "reset";
  [key: string]: any;
}) => {
  const Component = asChild ? "div" : "button";
  return (
    <Component type={type} className={className} {...props}>
      {children}
    </Component>
  );
};

const Footer = () => (
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
);

const Navigation = () => (
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
);

export default function ApplyPageContent() {
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    dob: "",
    gender: "",
    email: "",
    phone: "",
    address: "",
    pincode: "",
    aadharNumber: "",
    certificateType: "Caste",
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [speechDetected, setSpeechDetected] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");
  const [lastFieldFilled, setLastFieldFilled] = useState<{
    fieldName: string;
    fieldValue: string;
  } | null>(null);

  // Agent connection state
  const { addTranscriptMessage, addTranscriptBreadcrumb } = useTranscript();
  const { logClientEvent, logServerEvent } = useEvent();

  const [selectedAgentName, setSelectedAgentName] = useState<string>("");
  const [selectedAgentConfigSet, setSelectedAgentConfigSet] = useState<
    AgentConfig[] | null
  >(null);

  // Add a ref to keep track of the current form auto-fill request
  const formAutoFillRef = useRef<{
    fieldName: string;
    fieldValue: string;
  } | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>("DISCONNECTED");
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] =
    useState<boolean>(true);

  // Add a ref to track if we've initialized the session
  const sessionInitializedRef = useRef(false);

  // Add new state for tracking form completion
  const [isFormComplete, setIsFormComplete] = useState(false);

  const [showSubmissionPopup, setShowSubmissionPopup] = useState(false);

  const sendClientEvent = (eventObj: any, eventNameSuffix = "") => {
    try {
      if (dcRef.current && dcRef.current.readyState === "open") {
        logClientEvent(eventObj, eventNameSuffix);
        dcRef.current.send(JSON.stringify(eventObj));
      } else {
        // Just log the event without attempting to send it through the data channel
        logClientEvent(
          { attemptedEvent: eventObj.type, status: "queued" },
          "event_queued_dc_not_ready"
        );

        // More user-friendly console message for debugging
        if (!dcRef.current) {
          console.warn(
            "Data channel not initialized, event queued:",
            eventObj.type
          );
        } else {
          console.warn(
            `Data channel not open (state: ${dcRef.current.readyState}), event queued:`,
            eventObj.type
          );
        }
      }
    } catch (error) {
      console.warn("Error sending client event:", error);
      logClientEvent(
        { attemptedEvent: eventObj.type, error: String(error) },
        "error.send_event_failed"
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

  // Enhanced handler for speech transcription
  const handleSpeechTranscription = (transcript: string) => {
    console.log("Speech transcript received:", transcript);
    setLastTranscript(transcript);

    // Show visual feedback that speech was detected
    setSpeechDetected(true);

    // Process transcript to extract form data
    const extractedData = extractFormDataFromTranscript(transcript);
    if (extractedData) {
      console.log("Extracted form data from voice:", extractedData);

      // Update all extracted fields
      Object.entries(extractedData).forEach(([fieldName, fieldValue]) => {
        if (fieldValue && fieldName in formData) {
          // Convert to string if necessary
          const valueStr =
            typeof fieldValue === "string" ? fieldValue : String(fieldValue);

          // Set the field data
          setFormData((prev) => ({
            ...prev,
            [fieldName]: valueStr,
          }));

          // Show visual feedback for the last field filled
          setLastFieldFilled({ fieldName, fieldValue: valueStr });

          // Clear feedback after 5 seconds
          setTimeout(() => {
            setLastFieldFilled(null);
          }, 5000);
        }
      });
    }

    // Hide the feedback after 3 seconds
    setTimeout(() => {
      setSpeechDetected(false);
    }, 3000);
  };

  // Function to extract form data from transcripts
  const extractFormDataFromTranscript = (
    transcript: string
  ): Partial<FormData> | null => {
    if (!transcript) return null;

    const extractedData: Partial<FormData> = {};
    const normalizedText = transcript.toLowerCase();

    // Name extraction with improved patterns
    const namePatterns = [
      /my name is ([A-Za-z\s]+)/i,
      /name is ([A-Za-z\s]+)/i,
      /i am ([A-Za-z\s]+)/i,
      /myself ([A-Za-z\s]+)/i,
      /call me ([A-Za-z\s]+)/i,
      /([A-Za-z\s]+) is my name/i,
    ];

    for (const pattern of namePatterns) {
      const match = transcript.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        // Ensure name isn't a part of a longer sentence
        if (name.split(" ").length <= 4 && name.length > 3) {
          extractedData.fullName = name;
          console.log(`Extracted name: ${name}`);
          break;
        }
      }
    }

    // Date of birth extraction with improved patterns
    // Look for different date formats and convert to YYYY-MM-DD
    if (
      normalizedText.includes("date of birth") ||
      normalizedText.includes("dob") ||
      normalizedText.includes("born")
    ) {
      const dobPatterns = [
        // DD-MM-YYYY or DD/MM/YYYY
        /(\d{1,2})[-\/\.\s](\d{1,2})[-\/\.\s](\d{4})/,
        // YYYY-MM-DD
        /(\d{4})[-\/\.\s](\d{1,2})[-\/\.\s](\d{1,2})/,
        // Text month formats
        /(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(January|February|March|April|May|June|July|August|September|October|November|December),?\s+(\d{4})/i,
        /born\s+(?:on\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(January|February|March|April|May|June|July|August|September|October|November|December),?\s+(\d{4})/i,
      ];

      for (const pattern of dobPatterns) {
        const match = transcript.match(pattern);
        if (match) {
          try {
            let day, month, year;

            if (match.length >= 4) {
              // Check if first group is year (YYYY-MM-DD format)
              if (match[1].length === 4) {
                year = match[1];
                month = parseInt(match[2]).toString().padStart(2, "0");
                day = parseInt(match[3]).toString().padStart(2, "0");
              }
              // Check if third group is year (DD-MM-YYYY format)
              else if (match[3].length === 4) {
                day = parseInt(match[1]).toString().padStart(2, "0");
                // If second group is a month name
                if (isNaN(parseInt(match[2]))) {
                  const months: Record<string, string> = {
                    january: "01",
                    february: "02",
                    march: "03",
                    april: "04",
                    may: "05",
                    june: "06",
                    july: "07",
                    august: "08",
                    september: "09",
                    october: "10",
                    november: "11",
                    december: "12",
                  };
                  month = months[match[2].toLowerCase()];
                } else {
                  month = parseInt(match[2]).toString().padStart(2, "0");
                }
                year = match[3];
              }
            }

            if (day && month && year) {
              // Validate date
              if (parseInt(day) <= 31 && parseInt(month) <= 12) {
                extractedData.dob = `${year}-${month}-${day}`;
                console.log(`Extracted DOB: ${extractedData.dob}`);
              }
            }
          } catch (e) {
            console.error("Error parsing date:", e);
          }

          if (extractedData.dob) break;
        }
      }
    }

    // Gender extraction with improved patterns
    if (normalizedText.includes("gender") || normalizedText.includes("sex")) {
      if (/\b(male|man|boy|gentleman|he|him|his)\b/i.test(transcript)) {
        extractedData.gender = "male";
        console.log("Extracted gender: male");
      } else if (
        /\b(female|woman|girl|lady|she|her|hers)\b/i.test(transcript)
      ) {
        extractedData.gender = "female";
        console.log("Extracted gender: female");
      } else if (
        /\b(other|non-binary|third gender|they|them|theirs)\b/i.test(transcript)
      ) {
        extractedData.gender = "other";
        console.log("Extracted gender: other");
      }
    }

    // Email extraction with improved pattern
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    if (normalizedText.includes("email") || normalizedText.includes("mail")) {
      const emailMatch = transcript.match(emailPattern);
      if (emailMatch) {
        extractedData.email = emailMatch[0];
        console.log(`Extracted email: ${extractedData.email}`);
      } else {
        // Try to find email with spelled out @ symbol
        const atEmailMatch = transcript.match(
          /([a-zA-Z0-9._%+-]+)\s+at\s+([a-zA-Z0-9.-]+)\s+dot\s+([a-zA-Z]{2,})/i
        );
        if (atEmailMatch) {
          extractedData.email = `${atEmailMatch[1]}@${atEmailMatch[2]}.${atEmailMatch[3]}`;
          console.log(`Extracted spelled-out email: ${extractedData.email}`);
        }
      }
    } else {
      // Check for email without explicit mention
      const emailMatch = transcript.match(emailPattern);
      if (emailMatch) {
        extractedData.email = emailMatch[0];
        console.log(`Extracted email: ${extractedData.email}`);
      }
    }

    // Phone number extraction (for Indian phone numbers) with improved patterns
    if (
      normalizedText.includes("phone") ||
      normalizedText.includes("mobile") ||
      normalizedText.includes("contact")
    ) {
      // Look for 10-digit numbers possibly with spaces or dashes
      const phonePatterns = [
        /\b(\d{10})\b/,
        /\b(\d{3})[\s.-](\d{3})[\s.-](\d{4})\b/,
        /\b(\d{5})[\s.-](\d{5})\b/,
        // Phone number with country code
        /\+91[\s.-]?(\d{10})\b/,
        /\+91[\s.-]?(\d{3})[\s.-]?(\d{3})[\s.-]?(\d{4})\b/,
      ];

      for (const pattern of phonePatterns) {
        const phoneMatch = transcript.match(pattern);
        if (phoneMatch) {
          if (phoneMatch.length === 2) {
            extractedData.phone = phoneMatch[1].replace(/\D/g, "");
          } else if (phoneMatch.length >= 4) {
            extractedData.phone = phoneMatch
              .slice(1)
              .join("")
              .replace(/\D/g, "");
          }

          if (extractedData.phone) {
            console.log(`Extracted phone: ${extractedData.phone}`);
            break;
          }
        }
      }
    }

    // Aadhar number extraction with improved patterns
    if (
      normalizedText.includes("aadhar") ||
      normalizedText.includes("aadhaar") ||
      normalizedText.includes("uid")
    ) {
      const aadharPatterns = [
        /\b(\d{12})\b/,
        /\b(\d{4})[\s.-](\d{4})[\s.-](\d{4})\b/,
        /aadhar(?:\s+number)?(?:\s+is)?\s+(\d[\d\s-]{10,14}\d)/i,
        /aadhaar(?:\s+number)?(?:\s+is)?\s+(\d[\d\s-]{10,14}\d)/i,
      ];

      for (const pattern of aadharPatterns) {
        const aadharMatch = transcript.match(pattern);
        if (aadharMatch) {
          if (aadharMatch.length === 2) {
            extractedData.aadharNumber = aadharMatch[1].replace(/\D/g, "");
          } else if (aadharMatch.length >= 4) {
            extractedData.aadharNumber = aadharMatch
              .slice(1)
              .join("")
              .replace(/\D/g, "");
          }

          if (
            extractedData.aadharNumber &&
            extractedData.aadharNumber.length === 12
          ) {
            console.log(`Extracted Aadhar: ${extractedData.aadharNumber}`);
            break;
          }
        }
      }
    } else {
      // Look for 12-digit number that might be Aadhar
      const possibleAadhar = transcript.match(/\b(\d{12})\b/);
      if (possibleAadhar && !extractedData.aadharNumber) {
        extractedData.aadharNumber = possibleAadhar[1];
        console.log(`Extracted possible Aadhar: ${extractedData.aadharNumber}`);
      }
    }

    // Pincode extraction with improved patterns
    if (
      normalizedText.includes("pin") ||
      normalizedText.includes("postal") ||
      normalizedText.includes("zip")
    ) {
      const pincodePatterns = [
        /\bpin(?:code)?\s*:?\s*(\d{6})\b/i,
        /\bpostal\s+code\s*:?\s*(\d{6})\b/i,
        /\bzip\s+code\s*:?\s*(\d{6})\b/i,
      ];

      for (const pattern of pincodePatterns) {
        const pincodeMatch = transcript.match(pattern);
        if (pincodeMatch && pincodeMatch[1]) {
          extractedData.pincode = pincodeMatch[1];
          console.log(`Extracted pincode: ${extractedData.pincode}`);
          break;
        }
      }
    } else {
      // Look for 6-digit number that might be pincode
      const possiblePincode = transcript.match(/\b(\d{6})\b/);
      if (
        possiblePincode &&
        !extractedData.pincode &&
        !normalizedText.includes("aadhar") &&
        !normalizedText.includes("aadhaar")
      ) {
        extractedData.pincode = possiblePincode[1];
        console.log(`Extracted possible pincode: ${extractedData.pincode}`);
      }
    }

    // Address extraction with improved patterns
    if (
      normalizedText.includes("address") ||
      normalizedText.includes("live at") ||
      normalizedText.includes("residing at") ||
      normalizedText.includes("stay at")
    ) {
      const addressPatterns = [
        /address\s+(?:is|:|->)?\s+([^.?!]+)/i,
        /my address\s+(?:is|:|->)?\s+([^.?!]+)/i,
        /i live at\s+([^.?!]+)/i,
        /residing at\s+([^.?!]+)/i,
        /staying at\s+([^.?!]+)/i,
        /location\s+(?:is|:|->)?\s+([^.?!]+)/i,
      ];

      for (const pattern of addressPatterns) {
        const match = transcript.match(pattern);
        if (match && match[1]) {
          extractedData.address = match[1].trim();
          console.log(`Extracted address: ${extractedData.address}`);
          break;
        }
      }
    }

    // Certificate type extraction with improved patterns
    const certificateTypes = [
      "Caste",
      "Income",
      "Domicile",
      "Birth",
      "Death",
      "Marriage",
    ];

    if (
      normalizedText.includes("certificate") ||
      normalizedText.includes("apply for")
    ) {
      for (const type of certificateTypes) {
        const lowerType = type.toLowerCase();
        if (
          normalizedText.includes(lowerType + " certificate") ||
          normalizedText.includes("certificate of " + lowerType) ||
          normalizedText.includes("apply for " + lowerType) ||
          normalizedText.includes(lowerType + " cert")
        ) {
          extractedData.certificateType = type;
          console.log(`Extracted certificate type: ${type}`);
          break;
        }
      }
    }

    // Special data conversion functions
    const convertFields = () => {
      // Capitalize names correctly
      if (extractedData.fullName) {
        extractedData.fullName = extractedData.fullName
          .split(" ")
          .map(
            (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          )
          .join(" ");
      }

      // Ensure phone number is exactly 10 digits
      if (extractedData.phone && extractedData.phone.length > 10) {
        // If longer than 10 digits (perhaps with country code), take last 10
        extractedData.phone = extractedData.phone.slice(-10);
      }
    };

    convertFields();

    // Log all extracted data for debugging
    if (Object.keys(extractedData).length > 0) {
      console.log("All extracted form data:", extractedData);
    }

    return Object.keys(extractedData).length > 0 ? extractedData : null;
  };

  // Modify handleInputChange to use event context
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updatedFormData = { ...formData, [name]: value };
    setFormData(updatedFormData);

    // Log the form field update event
    logClientEvent({
      type: "form_field_update",
      fieldName: name,
      fieldValue: value,
      formData: updatedFormData,
    });

    // Check if all required fields are filled
    const isComplete = Object.entries(updatedFormData).every(([key, value]) => {
      if (key === "certificateType") return true; // Certificate type is optional
      return value !== null && value !== "";
    });
    setIsFormComplete(isComplete);
  };

  // Modify handleSelectChange to use event context
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updatedFormData = { ...formData, [name]: value };
    setFormData(updatedFormData);

    // Log the form field update event
    logClientEvent({
      type: "form_field_update",
      fieldName: name,
      fieldValue: value,
      formData: updatedFormData,
    });

    // Check if all required fields are filled
    const isComplete = Object.entries(updatedFormData).every(([key, value]) => {
      if (key === "certificateType") return true; // Certificate type is optional
      return value !== null && value !== "";
    });
    setIsFormComplete(isComplete);
  };

  // Modify handleSubmit to use event context
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Log the form submission event
    logClientEvent({
      type: "form_submission",
      formData: formData,
      timestamp: new Date().toISOString(),
    });

    // Generate a reference number
    const refNumber = "KL" + Math.floor(Math.random() * 10000000);
    setReferenceNumber(refNumber);
    setIsSubmitted(true);
    setIsFormComplete(true);
  };

  // Modify handleAgentToolExecution to use event context
  const handleAgentToolExecution = (eventData: any) => {
    console.log(
      "Tool execution event received:",
      eventData.type,
      eventData.tool?.name
    );

    if (eventData.type === "tool_execution" && eventData.tool?.name) {
      // Handle form auto-fill
      if (
        eventData.tool.name === "autofillFormField" &&
        eventData.tool.parameters
      ) {
        const { fieldName, fieldValue } = eventData.tool.parameters;
        console.log(`Auto-filling form field: ${fieldName} = ${fieldValue}`);

        // Store the current auto-fill request
        formAutoFillRef.current = { fieldName, fieldValue };

        // Store last field filled for visual feedback
        setLastFieldFilled({ fieldName, fieldValue });

        // Clear feedback after 5 seconds
        setTimeout(() => {
          setLastFieldFilled(null);
        }, 5000);

        // Update the form data
        setFormData((prevData) => ({
          ...prevData,
          [fieldName]: fieldValue,
        }));

        // Log the form field update event
        logClientEvent({
          type: "form_field_update",
          fieldName,
          fieldValue,
          source: "ai_assistant",
        });

        // Send acknowledgment back to the agent
        sendClientEvent(
          {
            type: "tool_execution.result",
            id: eventData.id,
            result: {
              success: true,
              message: `Field '${fieldName}' filled with value '${fieldValue}'`,
            },
          },
          "form_autofill_result"
        );
      }

      // Handle form submission
      if (
        eventData.tool.name === "submitApplicationForm" &&
        eventData.tool.parameters
      ) {
        const { confirmed } = eventData.tool.parameters;

        if (confirmed) {
          // Log the form submission event
          logClientEvent({
            type: "form_submission",
            formData: formData,
            source: "ai_assistant",
            timestamp: new Date().toISOString(),
          });

          // Simulate a form submission
          handleSubmit(new Event("submit") as any);

          sendClientEvent(
            {
              type: "tool_execution.result",
              id: eventData.id,
              result: {
                success: true,
                message: "Application form submitted successfully",
              },
            },
            "form_submission_result"
          );
        } else {
          sendClientEvent(
            {
              type: "tool_execution.result",
              id: eventData.id,
              result: {
                success: false,
                message: "Form submission cancelled",
              },
            },
            "form_submission_cancelled"
          );
        }
      }
    }
  };

  // Add a function to check and update form data from localStorage
  const checkAndUpdateFormDataFromStorage = () => {
    const storedFormData = localStorage.getItem("kerala_gov_cert_form_data");
    if (storedFormData) {
      try {
        const parsedData = JSON.parse(storedFormData);
        if (parsedData.formData) {
          // Create a new form data object with current values
          const updatedFormData = { ...formData };

          // Update only the fields that have non-null values in the stored data
          Object.entries(parsedData.formData).forEach(([key, value]) => {
            if (value !== null && key in updatedFormData) {
              updatedFormData[key as keyof FormData] = value as string;
            }
          });

          // Only update if there are actual changes
          if (JSON.stringify(updatedFormData) !== JSON.stringify(formData)) {
            setFormData(updatedFormData);
            console.log(
              "Updated form data from localStorage during conversation:",
              updatedFormData
            );
          }

          // Update form completion status if different
          if (parsedData.isComplete !== isFormComplete) {
            setIsFormComplete(parsedData.isComplete || false);
          }
        }
      } catch (error) {
        console.error(
          "Error parsing stored form data during conversation:",
          error
        );
      }
    }
  };

  // Enhanced server event handler with speech transcription handling
  const handleServerEvent = (eventData: any) => {
    // Handle regular events
    handleServerEventRef.current(eventData);

    // Check localStorage for updates during conversation
    checkAndUpdateFormDataFromStorage();

    // Additionally handle tool execution events for form auto-filling
    handleAgentToolExecution(eventData);

    // Handle speech transcription events
    if (
      eventData.type ===
        "conversation.item.input_audio_transcription.completed" &&
      eventData.transcript
    ) {
      handleSpeechTranscription(eventData.transcript);
    }

    // Handle streaming transcription updates
    if (
      eventData.type === "response.audio_transcript.delta" &&
      eventData.delta
    ) {
      // Accumulate transcript delta
      const updatedTranscript = lastTranscript + eventData.delta;
      setLastTranscript(updatedTranscript);
      setSpeechDetected(true);

      // Try to extract form data from the accumulated transcript
      const extractedData = extractFormDataFromTranscript(updatedTranscript);
      if (extractedData) {
        console.log(
          "Extracted form data from streaming transcript:",
          extractedData
        );

        // Update all extracted fields
        Object.entries(extractedData).forEach(([fieldName, fieldValue]) => {
          if (fieldValue && fieldName in formData) {
            // Check if value is different from current form data
            if (formData[fieldName as keyof FormData] !== fieldValue) {
              // Set the field data
              setFormData((prev) => ({
                ...prev,
                [fieldName]: fieldValue,
              }));

              // Show visual feedback for the last field filled
              setLastFieldFilled({ fieldName, fieldValue: String(fieldValue) });

              // Clear feedback after 5 seconds
              setTimeout(() => {
                setLastFieldFilled(null);
              }, 5000);
            }
          }
        });
      }

      // Reset the speech detected flag after 3 seconds of inactivity
      setTimeout(() => {
        setSpeechDetected(false);
      }, 3000);
    }
  };

  useEffect(() => {
    // Set default agent configuration
    const finalAgentConfig = defaultAgentSetKey;
    const agents = allAgentSets[finalAgentConfig];

    // Specifically set the formHelper agent for the apply page
    const agentKeyToUse = "formHelper";

    setSelectedAgentName(agentKeyToUse);
    setSelectedAgentConfigSet(agents);
  }, []);

  useEffect(() => {
    if (selectedAgentName) {
      connectToRealtime();
    }
  }, [selectedAgentName]);

  useEffect(() => {
    if (
      !sessionInitializedRef.current &&
      sessionStatus === "CONNECTED" &&
      selectedAgentConfigSet &&
      selectedAgentName &&
      dcRef.current &&
      dcRef.current.readyState === "open"
    ) {
      const currentAgent = selectedAgentConfigSet.find(
        (a) => a.name === selectedAgentName
      );
      addTranscriptBreadcrumb(`Agent: ${selectedAgentName}`, currentAgent);
      updateSession(true);

      // Mark that we've initialized the session to prevent re-runs
      sessionInitializedRef.current = true;
    }
  }, [
    selectedAgentConfigSet,
    selectedAgentName,
    sessionStatus,
    addTranscriptBreadcrumb,
  ]);

  // Reset the initialization flag when disconnected
  useEffect(() => {
    if (sessionStatus === "DISCONNECTED") {
      sessionInitializedRef.current = false;
    }
  }, [sessionStatus]);

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

      setSessionStatus("CONNECTED");
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
    dcRef.current = null;
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

  // Add useEffect to handle localStorage on component mount
  useEffect(() => {
    const storedFormData = localStorage.getItem("kerala_gov_cert_form_data");
    if (storedFormData) {
      try {
        const parsedData = JSON.parse(storedFormData);
        if (parsedData.formData) {
          // Create a new form data object with default values
          const updatedFormData = {
            fullName: "",
            dob: "",
            gender: "",
            email: "",
            phone: "",
            address: "",
            pincode: "",
            aadharNumber: "",
            certificateType: "Caste",
          };

          // Update only the fields that have non-null values in the stored data
          Object.entries(parsedData.formData).forEach(([key, value]) => {
            if (value !== null && key in updatedFormData) {
              updatedFormData[key as keyof FormData] = value as string;
            }
          });

          // Update the form data state
          setFormData(updatedFormData);

          // Update form completion status
          setIsFormComplete(parsedData.isComplete || false);

          // Log the loaded data for debugging
          console.log("Loaded form data from localStorage:", updatedFormData);
        }
      } catch (error) {
        console.error("Error parsing stored form data:", error);
      }
    }
  }, []); // Empty dependency array means this runs once on mount

  // Add useEffect to update localStorage when form data changes
  useEffect(() => {
    // Create the data to store
    const formDataToStore = {
      formData: {
        ...formData,
        // Convert empty strings to null for consistency
        fullName: formData.fullName || null,
        dob: formData.dob || null,
        gender: formData.gender || null,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        pincode: formData.pincode || null,
        aadharNumber: formData.aadharNumber || null,
        certificateType: formData.certificateType || null,
      },
      lastUpdated: new Date().toISOString(),
      isComplete: isFormComplete,
    };

    // Store in localStorage
    localStorage.setItem(
      "kerala_gov_cert_form_data",
      JSON.stringify(formDataToStore)
    );

    // Log the stored data for debugging
    console.log("Stored form data in localStorage:", formDataToStore);
  }, [formData, isFormComplete]);

  // Modify the useEffect that checks localStorage data
  useEffect(() => {
    const storedFormData = localStorage.getItem("kerala_gov_cert_form_data");
    if (storedFormData) {
      try {
        const parsedData = JSON.parse(storedFormData);
        if (parsedData.isComplete === true) {
          // Set form data from storage
          if (parsedData.formData) {
            setFormData(parsedData.formData);
          }
          // Set submission states
          setIsSubmitted(true);
          setShowSubmissionPopup(true);
          // Generate a reference number
          const refNumber = "KL" + Math.floor(Math.random() * 10000000);
          setReferenceNumber(refNumber);
        }
      } catch (error) {
        console.error("Error parsing stored form data:", error);
      }
    }
  }, []);

  // Enhanced VoiceAssistant component with connection status
  const EnhancedVoiceAssistant = () => (
    <div className="fixed bottom-8 right-8">
      <button
        className={`w-16 h-16 rounded-full ${
          sessionStatus === "CONNECTED" ? "bg-green-700" : "bg-gray-500"
        } text-white shadow-lg flex items-center justify-center hover:${
          sessionStatus === "CONNECTED" ? "bg-green-800" : "bg-gray-600"
        } transition-colors`}
        onClick={
          sessionStatus === "CONNECTED"
            ? disconnectFromRealtime
            : connectToRealtime
        }
      >
        <span className="sr-only">Kerala Certificate Assistant</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      </button>
    </div>
  );

  // Speech Recognition Feedback component
  const SpeechFeedback = () => {
    if (!speechDetected && !lastFieldFilled) return null;

    return (
      <div className="fixed top-24 right-8 max-w-md z-50">
        {speechDetected && (
          <div className="bg-blue-100 border border-blue-300 text-blue-800 p-3 rounded-lg mb-2 shadow-md animate-pulse">
            <div className="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
              <p className="text-sm font-medium">Listening...</p>
            </div>
            {lastTranscript && (
              <p className="text-xs mt-1 italic truncate">{lastTranscript}</p>
            )}
          </div>
        )}

        {lastFieldFilled && (
          <div className="bg-green-100 border border-green-300 text-green-800 p-3 rounded-lg shadow-md transition-opacity">
            <div className="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <p className="text-sm font-medium">
                Field Filled: {lastFieldFilled.fieldName}
              </p>
            </div>
            <p className="text-xs mt-1 truncate">
              Value: {lastFieldFilled.fieldValue}
            </p>
          </div>
        )}
      </div>
    );
  };

  // Add useEffect to display JSON format of current form data for debugging
  useEffect(() => {
    if (sessionStatus === "CONNECTED" && lastTranscript) {
      // Format the form data as JSON for console output
      const formDataForDisplay = Object.entries(formData)
        .filter(([, value]) => value !== "")
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

      if (Object.keys(formDataForDisplay).length > 0) {
        console.log(
          "Current form data (JSON):",
          JSON.stringify(formDataForDisplay, null, 2)
        );
      }
    }
  }, [formData, sessionStatus, lastTranscript]);

  // Add a function to download form data as JSON
  const downloadFormDataAsJson = () => {
    const formDataJson = JSON.stringify(formData, null, 2);
    const blob = new Blob([formDataJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "form_data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Add a function to test voice form filling with sample data
  const testVoiceFormFilling = () => {
    const sampleTranscript =
      "My name is John Smith. I was born on 15th January 1990. My gender is male. " +
      "My email is john.smith@example.com. My phone number is 9876543210. " +
      "My address is 123 Main Street, Thiruvananthapuram, Kerala. " +
      "My pincode is 695001. My Aadhar number is 123456789012. " +
      "I want to apply for a Birth certificate.";

    // Process the sample transcript
    handleSpeechTranscription(sampleTranscript);
  };

  // Modify the SubmissionPopup component
  const SubmissionPopup = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg max-w-md w-full mx-4 shadow-xl">
        <div className="text-center space-y-4">
          <div className="text-5xl text-green-600 mb-4">✓</div>
          <h2 className="text-2xl font-bold text-green-900">
            Application Already Submitted!
          </h2>
          <p className="text-gray-600">
            Your application for{" "}
            <strong>{formData.certificateType} Certificate</strong> has been
            received.
          </p>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-sm text-gray-600">Reference Number</p>
            <p className="text-xl font-bold text-green-800">
              {referenceNumber}
            </p>
          </div>
          <p className="text-gray-600">
            You will receive the certificate within two days at your registered
            email address or phone number.
          </p>
          <div className="flex justify-center mt-6">
            <Button
              asChild
              className="bg-green-700 hover:bg-green-800 text-white px-6 py-2 rounded"
            >
              <Link href="/">Return to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-green-50 to-white">
        {isSubmitted && <SubmissionPopup />}
        <Navigation />

        <main className="flex-grow max-w-3xl mx-auto py-12 px-4 flex flex-col items-center justify-center">
          <div className="text-center space-y-6 p-8 border-2 border-green-500 rounded-lg bg-green-50 w-full">
            <div className="text-5xl text-green-600 mb-4">✓</div>
            <h1 className="text-3xl font-bold text-green-900">
              Application Submitted Successfully!
            </h1>
            <p className="text-lg">
              Your application for{" "}
              <strong>{formData.certificateType} Certificate</strong> has been
              received.
            </p>
            <div className="bg-white p-4 rounded-lg border border-green-200">
              <p className="text-sm text-gray-600">Reference Number</p>
              <p className="text-xl font-bold text-green-800">
                {referenceNumber}
              </p>
            </div>
            <p className="text-gray-600">
              Please save this reference number for tracking your application
              status.
            </p>
            <div className="flex gap-4 justify-center mt-6">
              <Button
                asChild
                className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded"
              >
                <Link href="/kerala-certificate-services">Return to Home</Link>
              </Button>
            </div>
          </div>
        </main>

        <Footer />
        <EnhancedVoiceAssistant />
        <SpeechFeedback />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-green-50 to-white">
      {isSubmitted && <SubmissionPopup />}
      <Navigation />

      <main className="flex-grow max-w-3xl mx-auto py-12 px-4">
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold text-green-900">
              Certificate Application Form
            </h1>
            <p className="text-gray-500">
              Please fill in your personal details to apply for the certificate
            </p>
            {sessionStatus === "CONNECTED" && (
              <p className="text-sm text-green-600 mt-2">
                Voice assistant is active. Speak to fill the form automatically.
              </p>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-8 bg-white p-8 rounded-lg shadow-sm border border-gray-200"
          >
            {/* Form fields with highlight for last filled field */}
            <div className="grid gap-6 md:grid-cols-2">
              <div
                className={`space-y-2 ${
                  lastFieldFilled?.fieldName === "fullName"
                    ? "ring-2 ring-green-500 rounded-lg p-1"
                    : ""
                }`}
              >
                <label
                  htmlFor="fullName"
                  className="text-sm font-medium text-gray-600"
                >
                  Full Name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  placeholder="Enter your full name"
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-black"
                  value={formData.fullName}
                  onChange={handleInputChange}
                />
              </div>

              <div
                className={`space-y-2 ${
                  lastFieldFilled?.fieldName === "dob"
                    ? "ring-2 ring-green-500 rounded-lg p-1"
                    : ""
                }`}
              >
                <label
                  htmlFor="dob"
                  className="text-sm font-medium text-gray-600"
                >
                  Date of Birth
                </label>
                <div className="relative">
                  <input
                    id="dob"
                    name="dob"
                    type="date"
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-black"
                    value={formData.dob}
                    onChange={handleInputChange}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-gray-400"
                    >
                      <rect
                        x="3"
                        y="4"
                        width="18"
                        height="18"
                        rx="2"
                        ry="2"
                      ></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </div>
                </div>
              </div>

              <div
                className={`space-y-2 ${
                  lastFieldFilled?.fieldName === "gender"
                    ? "ring-2 ring-green-500 rounded-lg p-1"
                    : ""
                }`}
              >
                <label
                  htmlFor="gender"
                  className="text-sm font-medium text-gray-600"
                >
                  Gender
                </label>
                <div className="relative">
                  <select
                    id="gender"
                    name="gender"
                    className="w-full p-3 border border-gray-300 rounded-lg appearance-none focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-black"
                    value={formData.gender}
                    onChange={handleSelectChange}
                    required
                  >
                    <option value="" disabled>
                      Select gender
                    </option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-gray-400"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </div>
              </div>

              <div
                className={`space-y-2 ${
                  lastFieldFilled?.fieldName === "email"
                    ? "ring-2 ring-green-500 rounded-lg p-1"
                    : ""
                }`}
              >
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-600"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-black"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>

              <div
                className={`space-y-2 ${
                  lastFieldFilled?.fieldName === "phone"
                    ? "ring-2 ring-green-500 rounded-lg p-1"
                    : ""
                }`}
              >
                <label
                  htmlFor="phone"
                  className="text-sm font-medium text-gray-600"
                >
                  Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-black"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>

              <div
                className={`space-y-2 ${
                  lastFieldFilled?.fieldName === "aadharNumber"
                    ? "ring-2 ring-green-500 rounded-lg p-1"
                    : ""
                }`}
              >
                <label
                  htmlFor="aadharNumber"
                  className="text-sm font-medium text-gray-600"
                >
                  Aadhar Number
                </label>
                <input
                  id="aadharNumber"
                  name="aadharNumber"
                  placeholder="Enter your Aadhar number"
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-black"
                  value={formData.aadharNumber}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div
              className={`space-y-2 ${
                lastFieldFilled?.fieldName === "address"
                  ? "ring-2 ring-green-500 rounded-lg p-1"
                  : ""
              }`}
            >
              <label
                htmlFor="address"
                className="text-sm font-medium text-gray-600"
              >
                Full Address
              </label>
              <textarea
                id="address"
                name="address"
                placeholder="Enter your complete address"
                required
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-black"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div
                className={`space-y-2 ${
                  lastFieldFilled?.fieldName === "pincode"
                    ? "ring-2 ring-green-500 rounded-lg p-1"
                    : ""
                }`}
              >
                <label
                  htmlFor="pincode"
                  className="text-sm font-medium text-gray-600"
                >
                  Pincode
                </label>
                <input
                  id="pincode"
                  name="pincode"
                  placeholder="Enter pincode"
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-black"
                  value={formData.pincode}
                  onChange={handleInputChange}
                />
              </div>

              <div
                className={`space-y-2 ${
                  lastFieldFilled?.fieldName === "certificateType"
                    ? "ring-2 ring-green-500 rounded-lg p-1"
                    : ""
                }`}
              >
                <label
                  htmlFor="certificateType"
                  className="text-sm font-medium text-gray-600"
                >
                  Certificate Type
                </label>
                <div className="relative">
                  <select
                    id="certificateType"
                    name="certificateType"
                    className="w-full p-3 border border-gray-300 rounded-lg appearance-none focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-black"
                    value={formData.certificateType}
                    onChange={handleSelectChange}
                  >
                    {[
                      "Caste",
                      "Income",
                      "Domicile",
                      "Birth",
                      "Death",
                      "Marriage",
                    ].map((type) => (
                      <option key={type} value={type}>
                        {type} Certificate
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-gray-400"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                className="w-full bg-green-700 text-white hover:bg-green-800 py-4 px-4 rounded-md text-lg font-semibold transition-colors"
              >
                Submit Application
              </Button>
              {sessionStatus === "CONNECTED" && (
                <div className="mt-4 text-center space-y-2">
                  <button
                    type="button"
                    onClick={downloadFormDataAsJson}
                    className="text-green-700 hover:text-green-900 underline text-sm"
                  >
                    Download form data as JSON
                  </button>
                  <div>
                    <button
                      type="button"
                      onClick={testVoiceFormFilling}
                      className="text-blue-700 hover:text-blue-900 underline text-sm"
                    >
                      Test Voice Form Filling
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      </main>

      <Footer />
      <EnhancedVoiceAssistant />
      {/* <SpeechFeedback /> */}
    </div>
  );
}
