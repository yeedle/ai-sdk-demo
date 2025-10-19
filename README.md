# AI SDK Demo - Jewish Calendar Assistant

A TypeScript Express API that provides Jewish calendar information and date conversion using AI.

## Features

- **Jewish Holiday Information**: Find specific holidays with candle lighting times and zmanim
- **Date Conversion**: Convert between Gregorian and Hebrew calendars
- **Holiday Listings**: Get all Jewish holidays for a given year
- **AI-Powered Chat**: Natural language interface for calendar queries

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file with your Google AI API key:

   ```
   GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
   ```

3. Build the TypeScript:

   ```bash
   npm run build
   ```

4. Start the server:

   ```bash
   npm start
   ```

   Or for development with auto-reload:

   ```bash
   npm run dev
   ```

## API Endpoints

### POST /chat

Send messages to the AI assistant for Jewish calendar queries.

**Request Body:**

```json
{
  "messages": [
    {
      "role": "user",
      "content": "When is Rosh Hashana this year?"
    }
  ]
}
```

**Response:**
Streaming text response with holiday information, dates, and times.

### GET /health

Health check endpoint.

**Response:**

```json
{
  "status": "OK"
}
```

## Example Usage

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "When is Passover 2024?"
      }
    ]
  }'
```

## Available Tools

The AI assistant has access to these tools:

- `findJewishHoliday`: Find specific holidays with detailed information
- `listJewishHolidays`: List all holidays for a given year
- `convertDate`: Convert between Gregorian and Hebrew calendars
- `todaysDate`: Get the current date

## Architecture

- `index.ts`: Main Express server with `/chat` endpoint
- `tools.ts`: Jewish calendar functions and AI tool definitions
- `ai.ts`: Original CLI version (kept for reference)
