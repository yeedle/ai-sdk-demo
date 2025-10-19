# Jewish Calendar AI Assistant - Frontend

React frontend for the Jewish Calendar AI Assistant, built with Vite and TypeScript.

## Features

- **Chat Interface**: Clean, modern chat UI with streaming responses
- **Dark Theme**: Beautiful dark theme with Tailwind CSS [[memory:8781163]]
- **Responsive Design**: Mobile-friendly responsive layout
- **Real-time Streaming**: Live streaming of AI responses
- **Markdown Support**: Rich text rendering with ReactMarkdown

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Make sure the backend is running on `http://localhost:3000`

## Usage

The frontend automatically connects to the backend `/chat` endpoint via Vite's proxy configuration. Simply type your Jewish calendar questions in the chat input and get AI-powered responses with holiday information, date conversions, and more.

## Example Queries

- "When is Rosh Hashana this year?"
- "Convert October 19, 2024 to Hebrew date"
- "List all Jewish holidays in 2024"
- "What time is candle lighting for Shabbat this week?"

## Architecture

- `main.tsx`: Main app component with useChat hook
- `components.tsx`: Reusable UI components (Message, Wrapper, ChatInput)
- `tailwind.css`: Tailwind CSS configuration with dark theme
- `vite.config.ts`: Vite configuration with backend proxy
