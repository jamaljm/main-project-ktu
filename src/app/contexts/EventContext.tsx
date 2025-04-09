"use client";

import React, {
  createContext,
  useContext,
  useState,
  FC,
  PropsWithChildren,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { LoggedEvent } from "@/app/types";

type EventContextValue = {
  loggedEvents: LoggedEvent[];
  logClientEvent: (
    eventObj: Record<string, any>,
    eventNameSuffix?: string
  ) => void;
  logServerEvent: (
    eventObj: Record<string, any>,
    eventNameSuffix?: string
  ) => void;
  toggleExpand: (id: number | string) => void;
};

const EventContext = createContext<EventContextValue | undefined>(undefined);

export const EventProvider: FC<PropsWithChildren> = ({ children }) => {
  const [loggedEvents, setLoggedEvents] = useState<LoggedEvent[]>([]);

  // Function to check and update localStorage
  const checkAndUpdateLocalStorage = (eventData: Record<string, any>) => {
    try {
      // Check if this is a form-related event
      if (
        eventData.type?.includes("form") ||
        eventData.tool?.name?.includes("form")
      ) {
        const storedFormData = localStorage.getItem(
          "kerala_gov_cert_form_data"
        );
        if (storedFormData) {
          const parsedData = JSON.parse(storedFormData);

          // If this is a form submission event
          if (
            eventData.type === "tool_execution" &&
            eventData.tool?.name === "submitApplicationForm"
          ) {
            parsedData.isComplete = true;
            localStorage.setItem(
              "kerala_gov_cert_form_data",
              JSON.stringify(parsedData)
            );
            console.log("Updated form completion status in localStorage");
          }

          // If this is a form field update event
          if (
            eventData.type === "tool_execution" &&
            eventData.tool?.name === "autofillFormField"
          ) {
            const { fieldName, fieldValue } = eventData.tool.parameters;
            if (fieldName && fieldValue) {
              parsedData.formData[fieldName] = fieldValue;
              localStorage.setItem(
                "kerala_gov_cert_form_data",
                JSON.stringify(parsedData)
              );
              console.log(
                "Updated form field in localStorage:",
                fieldName,
                fieldValue
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("Error updating localStorage:", error);
    }
  };

  function addLoggedEvent(
    direction: "client" | "server",
    eventName: string,
    eventData: Record<string, any>
  ) {
    const id = eventData.event_id || uuidv4();
    setLoggedEvents((prev) => [
      ...prev,
      {
        id,
        direction,
        eventName,
        eventData,
        timestamp: new Date().toLocaleTimeString(),
        expanded: false,
      },
    ]);

    // Check and update localStorage when an event is logged
    checkAndUpdateLocalStorage(eventData);

    console.log(`Logged ${direction} event: ${eventName}`, eventData);
  }

  const logClientEvent: EventContextValue["logClientEvent"] = (
    eventObj,
    eventNameSuffix = ""
  ) => {
    const name = `${eventObj.type || ""} ${eventNameSuffix || ""}`.trim();
    addLoggedEvent("client", name, eventObj);
  };

  const logServerEvent: EventContextValue["logServerEvent"] = (
    eventObj,
    eventNameSuffix = ""
  ) => {
    const name = `${eventObj.type || ""} ${eventNameSuffix || ""}`.trim();
    addLoggedEvent("server", name, eventObj);
  };

  const toggleExpand: EventContextValue["toggleExpand"] = (id) => {
    setLoggedEvents((prev) =>
      prev.map((log) => {
        if (log.id === id) {
          return { ...log, expanded: !log.expanded };
        }
        return log;
      })
    );
  };

  return (
    <EventContext.Provider
      value={{ loggedEvents, logClientEvent, logServerEvent, toggleExpand }}
    >
      {children}
    </EventContext.Provider>
  );
};

export function useEvent() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error("useEvent must be used within an EventProvider");
  }
  return context;
}
