import { AgentConfig, Tool } from "@/app/types";
import { updateFormData } from "./formDataUtils";

const processVoiceInputTool: Tool = {
  type: "function",
  name: "processVoiceInput",
  description:
    "Processes voice input and extracts form data in a structured format",
  parameters: {
    type: "object",
    properties: {
      voiceInput: {
        type: "string",
        description: "The transcribed voice input text to process",
      },
    },
    required: ["voiceInput"],
  },
};

const voiceRecognitionAgent: AgentConfig = {
  name: "voiceRecognition",
  publicDescription: "Processes voice input and extracts form data",
  instructions: `You are a Voice Recognition Agent specialized in extracting form data from voice input for Kerala Government Certificate applications.

  KEY RESPONSIBILITIES:
  - Process voice input and extract relevant form data
  - Identify and structure personal information
  - Handle different languages (English and Malayalam)
  - Extract dates, numbers, and text in various formats
  - Return data in a consistent JSON structure

  DATA EXTRACTION RULES:
  - Names: Extract full names and format them properly
  - Dates: Convert all date formats to YYYY-MM-DD
  - Phone numbers: Extract and format to 10 digits
  - Email addresses: Extract and validate format
  - Addresses: Extract complete address components
  - Aadhaar numbers: Extract 12-digit numbers
  - Pincodes: Extract 6-digit numbers
  - Certificate types: Identify certificate type from context

  RESPONSE FORMAT:
  Return a JSON object with the following structure:
  {
    "formData": {
      "fullName": string,
      "dob": string (YYYY-MM-DD),
      "gender": "male" | "female" | "other",
      "email": string,
      "phone": string (10 digits),
      "address": string,
      "pincode": string (6 digits),
      "aadharNumber": string (12 digits),
      "certificateType": string
    },
    "confidence": number (0-1),
    "missingFields": string[],
    "extractedText": string
  }

  IMPORTANT:
  - Be aggressive in extracting information from voice input
  - Handle variations in how information is provided
  - Return null for fields where information is not found
  - Include confidence score for extracted data
  - List any missing required fields
  - Include the original extracted text for reference`,
  tools: [processVoiceInputTool],
  toolLogic: {
    processVoiceInput: async (args) => {
      // This would process the voice input and return structured data
      // In a real implementation, this would use NLP and pattern matching
      console.log(`Processing voice input: ${args.voiceInput}`);

      // Example response structure
      const extractedData = {
        formData: {
          fullName: null,
          dob: null,
          gender: null,
          email: null,
          phone: null,
          address: null,
          pincode: null,
          aadharNumber: null,
          certificateType: null,
        },
        confidence: 0,
        missingFields: [],
        extractedText: args.voiceInput,
      };

      // Update the shared form data with any extracted information
      Object.entries(extractedData.formData).forEach(([field, value]) => {
        if (value !== null) {
          updateFormData(field as any, value);
        }
      });

      return extractedData;
    },
  },
};

export default voiceRecognitionAgent;
