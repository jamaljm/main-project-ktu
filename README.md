# Kerala Government Certificate Helper

A voice-enabled AI assistant that helps citizens of Kerala navigate government certificate application processes.

## Overview

This application provides an interactive voice assistant designed to guide users through the complex process of applying for various government certificates in Kerala. It uses OpenAI's API to enable natural conversations, helping users understand requirements, fill out forms correctly, and navigate the application process efficiently.

## Detailed Features

- **Voice-Enabled AI Assistant**:

  - Natural language processing for conversational interactions
  - Real-time voice input and audio response capabilities
  - Understands both English and basic Malayalam phrases
  - Adjusts communication style based on user preference

- **Multi-Agent System Architecture**:

  - Intelligent agent routing based on user needs
  - Seamless handoffs between specialized certificate agents
  - Background processing for complex decisions
  - State-maintained conversations across agent transfers

- **Automatic Form Filling**:

  - Proactive extraction of user information during conversation
  - Intelligent parsing of personal details (name, DOB, address, etc.)
  - Automatic date and number formatting
  - Real-time form field validation
  - Progress tracking for application completion

- **Certificate Requirement Guidance**:

  - Comprehensive database of document requirements for each certificate type
  - Detailed information about fees, processing times, and validity periods
  - Explanation of eligibility criteria and verification processes
  - Common issue resolution for application problems
  - Clear instructions for document submission

- **Website Navigation Assistance**:
  - Step-by-step guidance through the application website
  - Contextual help for different pages and form sections
  - Assistance with finding relevant information
  - Support for form submission and verification

## Typical User Flows

The system is designed to handle several common user scenarios:

### 1. Certificate Information Inquiry

A user can ask about any of the supported certificate types to get detailed information about requirements, fees, processing times, and procedures. For example:

- "What documents do I need for a birth certificate?"
- "How much does an income certificate cost?"
- "How long does it take to get a marriage certificate?"

### 2. Guided Certificate Application

The system can walk users through the entire application process for any certificate:

1. **Initial Assessment**: The main agent identifies the certificate type needed
2. **Specialist Consultation**: Transfer to the relevant certificate specialist agent
3. **Requirement Explanation**: Detailed breakdown of required documents and eligibility
4. **Form Navigation**: Transfer to form helper agent to begin application
5. **Automated Form Filling**: Intelligent extraction of user details during conversation
6. **Form Submission**: Guidance through the final submission steps
7. **Follow-up Information**: Instructions on tracking application status

### 3. Problem Resolution

For users facing specific issues with their applications:

- "My birth certificate application was rejected"
- "I don't have all the required documents for caste certificate"
- "There's a spelling mistake in my marriage certificate"

### 4. Specialized Scenarios

The system handles complex situations requiring specialized knowledge:

- **Late Registrations**: Detailed guidance for delayed birth/death registrations
- **Inter-religious Marriages**: Navigation through the Special Marriage Act requirements
- **Address Proof Issues**: Alternative document suggestions for domicile certificates
- **Caste Certificate Updates**: Process for updating or changing caste certificates

## Agent System Architecture

The application uses a sophisticated multi-agent architecture designed to provide specialized assistance throughout the certificate application process:

### 1. Main Helper Agent (`keralaGovHelper`)

- **Primary Role**: Entry point for all user interactions
- **Capabilities**:
  - Initial assessment of user needs
  - General information about certificate services
  - Intelligent routing to specialized agents
  - Website navigation guidance
  - Handling of general queries
- **Interaction Style**: Warm, friendly tone with simple language accessible to all citizens

### 2. Certificate Specialist Agents

Each certificate type has a dedicated specialist agent with deep domain knowledge:

- **Caste Certificate Agent (`casteAgent`)**:

  - Expertise in caste verification processes
  - Knowledge of SC/ST/OBC categories in Kerala
  - Guidance on caste-specific documentation
  - Sensitivity to social aspects of caste certificates

- **Income Certificate Agent (`incomeAgent`)**:

  - Expertise in income verification procedures
  - Knowledge of income brackets and thresholds
  - Guidance on financial documentation requirements
  - Understanding of income assessment methods

- **Domicile Certificate Agent (`domicileAgent`)**:

  - Expertise in residency requirements
  - Knowledge of acceptable address proofs
  - Guidance on residency verification processes
  - Help with continuous residence documentation

- **Birth Certificate Agent (`birthAgent`)**:

  - Expertise in birth registration processes
  - Knowledge of timeline requirements (normal vs. delayed registration)
  - Guidance on name addition and correction procedures
  - Help with different scenarios (hospital vs. home births)

- **Death Certificate Agent (`deathAgent`)**:

  - Expertise in death registration processes
  - Sensitive handling of death-related documentation
  - Knowledge of medical certificate requirements
  - Guidance on unnatural death documentation

- **Marriage Certificate Agent (`marriageAgent`)**:
  - Expertise in various marriage acts (Hindu, Special, Christian)
  - Knowledge of witness and documentation requirements
  - Guidance on religious-specific procedures
  - Help with special cases (inter-religious, widow/divorcee)

### 3. Form Helper Agent (`formHelper`)

- **Primary Role**: Assists with application form completion
- **Capabilities**:
  - Automatic extraction of personal information from conversation
  - Real-time form field population
  - Intelligent formatting of dates, numbers, and text
  - Form validation and error correction
  - Step-by-step form navigation
  - Submission preparation and confirmation
- **Tools**:
  - `autofillFormField`: Populates form fields automatically
  - `navigateTo`: Handles website navigation
  - `submitApplicationForm`: Processes form submission

### 4. Voice Recognition Agent (`voiceRecognitionAgent`)

- **Primary Role**: Handles voice input processing and output generation
- **Capabilities**:
  - Natural language understanding
  - Speech-to-text conversion
  - Text-to-speech generation
  - Language detection and adaptation
  - Voice tone and pace adjustment

### Agent Communication Protocol

Agents communicate and transfer control using a sophisticated protocol:

1. **Agent Transfer Mechanism**:

   - Intelligent routing based on conversation context
   - Context preservation during transfers
   - Seamless user experience across agent transitions
   - Transfer logic handled by the `transferAgents` tool

2. **State Management**:
   - Persistent form data across agent transfers
   - Conversation history maintenance
   - Context preservation for personalized interactions
   - User preference tracking

## Implementation Challenges and Solutions

Developing this system required addressing several key challenges:

### 1. Multilingual Support

- **Challenge**: Supporting both English and Malayalam interactions
- **Solution**: Custom voice recognition with language detection and bilingual agent instructions

### 2. Information Extraction

- **Challenge**: Automatically extracting personal information during natural conversations
- **Solution**: Advanced pattern recognition algorithms for identifying names, dates, phone numbers, and addresses within conversational text

### 3. Context Preservation

- **Challenge**: Maintaining conversation context across agent transfers
- **Solution**: Shared state management system that preserves user details, conversation history, and form progress

### 4. Certificate-Specific Knowledge

- **Challenge**: Maintaining accurate and comprehensive information about different certificate types
- **Solution**: Structured certificate requirements database with regular updates from government sources

### 5. Form Validation

- **Challenge**: Ensuring accurate form completion
- **Solution**: Real-time validation rules implemented at both conversation and form submission levels

## Future Enhancements

Planned improvements for the system include:

1. **Document Upload Assistance**: Guide users through scanning and uploading supporting documents
2. **Application Status Tracking**: Integration with government systems for real-time status updates
3. **Appointment Scheduling**: Booking facilities for in-person verification appointments
4. **Document Template Generation**: Creating draft affidavits and declarations for common requirements
5. **Regional Dialect Support**: Expanding Malayalam support to include regional dialects
6. **SMS Verification Integration**: OTP verification for secure form submission
7. **Payment Processing**: Integration with payment gateways for application fees

## Technical Implementation

The project is built using a modern web stack:

- **Frontend**: Next.js, React, TypeScript, TailwindCSS
- **AI Integration**:
  - OpenAI API for natural language processing
  - Custom prompt engineering for specialized agent behavior
  - Context-aware conversation management
  - Tool-augmented agents for functional capabilities
- **Voice Processing**:
  - Web Speech API for voice input/output
  - Real-time transcription and audio generation
  - Voice activity detection
- **State Management**:
  - React Context API for global state
  - Persistent form data storage
  - Session management for conversation continuity

## Development Architecture

The project follows a modular architecture for easy maintenance and extension:

- **Agent Configuration System**:
  - Located in `src/app/agentConfigs/keralaGovCertHelper/`
  - Agent definitions with specialized instructions and tools
  - Tool logic implementation for functional capabilities
  - Agent transfer mechanism via `injectTransferTools` utility
- **Certificate Data Management**:

  - Comprehensive certificate requirements database
  - Structured information for each certificate type
  - Common issues and resolution guidance
  - Authority and verification process details

- **Form Processing System**:

  - Form field definitions and validation rules
  - Automatic information extraction algorithms
  - Form state management and persistence
  - Submission handling and verification

- **Voice Processing Pipeline**:
  - Voice input capture and processing
  - Text-to-speech generation with natural intonation
  - Language detection and adaptation
  - Voice activity detection for natural conversation flow


## Setup

- This is a Next.js typescript app
- Install dependencies with `npm i`
- Add your `OPENAI_API_KEY` to your `.env` file
- Start the server with `npm run dev`
- Open your browser to [http://localhost:3000](http://localhost:3000)

