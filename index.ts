import express from "express";
import type { Request, Response } from "express";
import { google } from "@ai-sdk/google";
import {
  type ModelMessage,
  stepCountIs,
  streamText,
  convertToModelMessages,
} from "ai";
import "dotenv/config";
import { aiTools } from "./tools.ts";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Basic route
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Hello World!" });
});

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "OK" });
});

// Chat endpoint
app.post("/chat", async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: "Messages array is required",
      });
    }

    // Convert UI messages to model messages
    const modelMessages = convertToModelMessages(messages);

    const result = streamText({
      model: google("gemini-2.0-flash"),
      system: `You are a helpful assistant that can help with answering questions about the Jewish calendar and date conversion.
      when the user uses a relative date such as "this year", "last year", they are referring to the HEBREW YEAR. use the todaysDate tool to find out the current date, and then use the
      convertDate tool to convert the date to the hebrew date so that you know what the current Hebrew year is.
      You can use the listJewishHolidays tool to list all the Jewish holidays for a given year, returns all the information about the holidays including date and name
      You can use the findJewishHoliday tool to find a specific Jewish holiday by name and year, returns all the information about the holiday including candle lighting time and zmanim.
      If you're unsure how a holiday is spelled, use the listJewishHolidays tool to list all the Jewish holidays for a given year, and then use the findJewishHoliday tool to find the holiday by name.

      IMPORTANT: always write your response in YIDDISH. אייביג שרייב דיין ענטפער אין א היימישע חסידישע אידיש אזויווי מ׳שרייבט אויף אייוועלט, בשום אופן נוץ נישט ייווא אידיש אדער כלל אידיש
      `,
      messages: modelMessages,
      stopWhen: stepCountIs(10),
      tools: aiTools,
    });

    // Use AI SDK's built-in streaming response handler
    result.pipeUIMessageStreamToResponse(res);
  } catch (error) {
    console.error("Chat endpoint error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
