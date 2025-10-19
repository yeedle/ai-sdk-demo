import { google } from "@ai-sdk/google";
import { type ModelMessage, stepCountIs, streamText } from "ai";
import "dotenv/config";
import * as readline from "node:readline/promises";
import { z } from "zod";
import { HebrewCalendar, HDate, Event, Location } from "@hebcal/core";

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const messages: ModelMessage[] = [];

function findJewishHoliday(year: number, holidayName: string) {
  try {
    // Get comprehensive calendar with candle lighting and zmanim
    // Using New York as default location - in a real app, this could be configurable
    const location = Location.lookup("New York");
    const events = HebrewCalendar.calendar({
      year,
      isHebrewYear: false,
      candlelighting: true,
      location: location,
      havdalahMins: 42, // Standard havdalah time
      sedrot: true, // Include Torah readings
      omer: true, // Include counting of the Omer
      molad: true, // Include molad times
      ashkenazi: true, // Use Ashkenazi transliterations
    });

    // Filter for holidays that match the name (case-insensitive partial match)
    const matchingHolidays = events.filter((event: Event) => {
      const eventDesc = event.render("en").toLowerCase();
      const searchName = holidayName.toLowerCase();
      return eventDesc.includes(searchName) || searchName.includes(eventDesc);
    });

    if (matchingHolidays.length === 0) {
      return {
        found: false,
        message: `No holiday found matching "${holidayName}" in ${year}. Try using the listJewishHolidays tool to see all available holidays.`,
      };
    }

    // Return detailed information for all matching holidays
    const holidayDetails = matchingHolidays.map((event: Event) => {
      const hd = event.getDate();
      const gregorianDate = hd.greg();

      // Get additional event details
      const eventDetails: any = {
        name: event.render("en"),
        gregorianDate: gregorianDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        hebrewDate: hd.toString(),
        hebrewYear: hd.getFullYear(),
        category: event.getCategories().join(", "),
        description: event.getDesc(),
        url: event.url() || null,
        memo: event.memo || null,
      };

      // Add comprehensive zmanim information (using type assertion for runtime properties)
      const eventAny = event as any;
      if (eventAny.eventTime) {
        eventDetails.eventTime = eventAny.eventTime.toLocaleTimeString(
          "en-US",
          {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }
        );
        eventDetails.eventTimeStr = eventAny.eventTimeStr || null;
        eventDetails.fmtTime = eventAny.fmtTime || null;
      }

      // Add specific zmanim based on event type
      if (event.getDesc().includes("Candle lighting")) {
        eventDetails.candleLightingTime =
          eventAny.fmtTime || eventAny.eventTimeStr;
      } else if (event.getDesc().includes("Havdalah")) {
        eventDetails.havdalahTime = eventAny.fmtTime || eventAny.eventTimeStr;
        eventDetails.havdalahMins = eventAny.havdalahMins || null;
      } else if (event.getDesc().includes("Fast begins")) {
        eventDetails.fastBeginTime = eventAny.fmtTime || eventAny.eventTimeStr;
      } else if (event.getDesc().includes("Fast ends")) {
        eventDetails.fastEndTime = eventAny.fmtTime || eventAny.eventTimeStr;
      }

      // Add location information for zmanim
      if (location) {
        eventDetails.location = {
          name: location.getName(),
          latitude: location.getLatitude(),
          longitude: location.getLongitude(),
          timezone: location.getTzid(),
        };
      }

      // Check if this is a candle lighting event
      if (event.getDesc().includes("Candle lighting")) {
        eventDetails.eventType = "candle_lighting";
      } else if (event.getDesc().includes("Havdalah")) {
        eventDetails.eventType = "havdalah";
      } else if (event.getCategories().includes("holiday")) {
        eventDetails.eventType = "holiday";
      }

      // Add flags for holiday characteristics
      eventDetails.flags = {
        isHoliday: event.getCategories().includes("holiday"),
        isCandleLighting: event.getDesc().includes("Candle lighting"),
        isHavdalah: event.getDesc().includes("Havdalah"),
        isRoshChodesh: event.getCategories().includes("roshchodesh"),
        isModernHoliday: event.getCategories().includes("modern"),
        isMinorHoliday: event.getCategories().includes("minor"),
        isMajorHoliday: event.getCategories().includes("major"),
        isFast: event.getCategories().includes("fast"),
      };

      return eventDetails;
    });

    // Find related zmanim events (candle lighting, havdalah, etc.) for the holiday dates
    const holidayDates = matchingHolidays.map((event) => event.getDate().abs());
    const relatedZmanim = events
      .filter((event) => {
        const eventDate = event.getDate().abs();
        const isZmanimEvent =
          event.getCategories().includes("candles") ||
          event.getCategories().includes("havdalah") ||
          event.getCategories().includes("zmanim");

        // Include zmanim events within 2 days of any holiday date
        return (
          isZmanimEvent &&
          holidayDates.some((hDate) => Math.abs(eventDate - hDate) <= 2)
        );
      })
      .map((event) => {
        const hd = event.getDate();
        const gregorianDate = hd.greg();

        const zmanimDetails: any = {
          name: event.render("en"),
          gregorianDate: gregorianDate.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          hebrewDate: hd.toString(),
          category: event.getCategories().join(", "),
          description: event.getDesc(),
        };

        // Add time information (using type assertion for runtime properties)
        const eventAny = event as any;
        if (eventAny.eventTime) {
          zmanimDetails.time = eventAny.fmtTime || eventAny.eventTimeStr;
          zmanimDetails.eventTime = eventAny.eventTime.toLocaleTimeString(
            "en-US",
            {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            }
          );
        }

        // Add specific zmanim properties
        if (eventAny.havdalahMins) {
          zmanimDetails.havdalahMins = eventAny.havdalahMins;
        }

        return zmanimDetails;
      });

    return {
      found: true,
      year,
      searchTerm: holidayName,
      holidays: holidayDetails,
      relatedZmanim: relatedZmanim,
      zmanimCount: relatedZmanim.length,
      locationNote:
        "Times calculated for New York. Actual times may vary by location.",
    };
  } catch (error) {
    return {
      found: false,
      error: `Error finding holiday: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

function convertDate(inputDate: string, fromCalendar: "gregorian" | "hebrew") {
  try {
    let hDate: HDate;

    if (fromCalendar === "gregorian") {
      // Convert from Gregorian to Hebrew
      const gregorianDate = new Date(inputDate);
      if (isNaN(gregorianDate.getTime())) {
        return {
          success: false,
          error: `Invalid Gregorian date format: ${inputDate}. Please use YYYY-MM-DD format.`,
        };
      }
      hDate = new HDate(gregorianDate);

      return {
        success: true,
        inputDate,
        inputCalendar: "gregorian",
        outputCalendar: "hebrew",
        gregorianDate: {
          formatted: gregorianDate.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          iso: gregorianDate.toISOString().split("T")[0],
          dayOfWeek: gregorianDate.toLocaleDateString("en-US", {
            weekday: "long",
          }),
        },
        hebrewDate: {
          formatted: hDate.toString(),
          hebrewYear: hDate.getFullYear(),
          hebrewMonth: hDate.getMonthName(),
          hebrewDay: hDate.getDate(),
          dayOfWeek: hDate
            .greg()
            .toLocaleDateString("en-US", { weekday: "long" }),
          isLeapYear: hDate.isLeapYear(),
          daysInMonth: hDate.daysInMonth(),
        },
        additionalInfo: {
          julianDay: hDate.abs(),
          isRoshChodesh:
            hDate.getDate() === 1 ||
            (hDate.getDate() === 30 && hDate.daysInMonth() === 30),
          season: getJewishSeason(hDate),
          parsha: getWeeklyParsha(hDate),
        },
      };
    } else {
      // Convert from Hebrew to Gregorian
      // Parse Hebrew date string (e.g., "15 Tishrei 5785" or "15/1/5785")
      const hebrewParts = parseHebrewDate(inputDate);
      if (!hebrewParts) {
        return {
          success: false,
          error: `Invalid Hebrew date format: ${inputDate}. Please use formats like "15 Tishrei 5785" or "15/1/5785".`,
        };
      }

      hDate = new HDate(hebrewParts.day, hebrewParts.month, hebrewParts.year);
      const gregorianDate = hDate.greg();

      return {
        success: true,
        inputDate,
        inputCalendar: "hebrew",
        outputCalendar: "gregorian",
        hebrewDate: {
          formatted: hDate.toString(),
          hebrewYear: hDate.getFullYear(),
          hebrewMonth: hDate.getMonthName(),
          hebrewDay: hDate.getDate(),
          dayOfWeek: gregorianDate.toLocaleDateString("en-US", {
            weekday: "long",
          }),
          isLeapYear: hDate.isLeapYear(),
          daysInMonth: hDate.daysInMonth(),
        },
        gregorianDate: {
          formatted: gregorianDate.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          iso: gregorianDate.toISOString().split("T")[0],
          dayOfWeek: gregorianDate.toLocaleDateString("en-US", {
            weekday: "long",
          }),
        },
        additionalInfo: {
          julianDay: hDate.abs(),
          isRoshChodesh:
            hDate.getDate() === 1 ||
            (hDate.getDate() === 30 && hDate.daysInMonth() === 30),
          season: getJewishSeason(hDate),
        },
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Error converting date: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

function parseHebrewDate(
  dateStr: string
): { day: number; month: number | string; year: number } | null {
  try {
    // Handle numeric format like "15/1/5785" or "15-1-5785"
    const numericMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (numericMatch) {
      return {
        day: parseInt(numericMatch[1]),
        month: parseInt(numericMatch[2]),
        year: parseInt(numericMatch[3]),
      };
    }

    // Handle text format like "15 Tishrei 5785" or "15th of Tishrei 5785"
    const textMatch = dateStr.match(
      /(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([A-Za-z]+)\s+(\d{4})/
    );
    if (textMatch) {
      return {
        day: parseInt(textMatch[1]),
        month: textMatch[2], // Month name
        year: parseInt(textMatch[3]),
      };
    }

    return null;
  } catch {
    return null;
  }
}

function getJewishSeason(hDate: HDate): string {
  const month = hDate.getMonth();
  if (month >= 1 && month <= 3) return "Winter";
  if (month >= 4 && month <= 6) return "Spring";
  if (month >= 7 && month <= 9) return "Summer";
  return "Fall";
}

function getWeeklyParsha(hDate: HDate): string | null {
  try {
    // Get the Saturday of this week for parsha calculation
    const saturday = hDate.onOrAfter(7); // 7 = Saturday
    const events = HebrewCalendar.calendar({
      start: saturday,
      end: saturday,
      sedrot: true,
      isHebrewYear: false,
    });

    const parshaEvent = events.find((event) =>
      event.getCategories().includes("parashat")
    );
    return parshaEvent ? parshaEvent.render("en") : null;
  } catch {
    return null;
  }
}

function listJewishHolidays(year: number) {
  try {
    // Get all holidays for the year
    const events = HebrewCalendar.calendar({ year, isHebrewYear: false });

    // Filter for actual holidays (not just calendar events)
    const holidays = events
      .map((event: Event) => {
        const hd = event.getDate();
        const gregorianDate = hd.greg();

        return {
          name: event.render("en"),
          gregorianDate: gregorianDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          hebrewDate: hd.toString(),
          category: event.getCategories().join(", "),
        };
      })
      .sort((a, b) => {
        // Sort by date
        const dateA = new Date(a.gregorianDate + `, ${year}`);
        const dateB = new Date(b.gregorianDate + `, ${year}`);
        return dateA.getTime() - dateB.getTime();
      });

    return {
      year,
      totalHolidays: holidays.length,
      holidays,
    };
  } catch (error) {
    return {
      error: `Error listing holidays: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

async function main() {
  while (true) {
    const userInput = await terminal.question("You: ");

    messages.push({ role: "user", content: userInput });

    const result = streamText({
      model: google("gemini-2.5-flash"),
      system: `You are a helpful assistant that can help with answering questions about the Jewish calendar and date conversion.
      when the user uses a relative date such as "this year", "last year", use the todaysDate tool to find out the current date, and 
      convertDate tool to convert the date to the hebrew date so that you know what is the current year on the Hebrew calendar.
      You can use the listJewishHolidays tool to list all the Jewish holidays for a given year, returns all the information about the holidays including date and name
      You can use the findJewishHoliday tool to find a specific Jewish holiday by name and year, returns all the information about the holiday including candle lighting time and zmanim.
      If you're unsure how a holiday is spelled, use the listJewishHolidays tool to list all the Jewish holidays for a given year, and then use the findJewishHoliday tool to find the holiday by name.
      `,
      messages,
      stopWhen: stepCountIs(10),
      tools: {
        findJewishHoliday: {
          description:
            "Find a specific Jewish holiday by name and year, returns all the information about the holiday including candle lighting time and zmanim",
          inputSchema: z.object({
            year: z
              .number()
              .describe("The year to search for the holiday (Gregorian year)"),
            holidayName: z
              .string()
              .describe(
                "The name of the Jewish holiday to find (e.g., 'Rosh Hashana', 'Yom Kippur', 'Passover')"
              ),
          }),
          execute: async ({ year, holidayName }) => {
            return findJewishHoliday(year, holidayName);
          },
        },
        todaysDate: {
          description: "Find out what date is right now",
          inputSchema: z.object({}),
          execute: async () => {
            return new Date().toISOString();
          },
        },
        listJewishHolidays: {
          description: "List all Jewish holidays for a given year",
          inputSchema: z.object({
            year: z
              .number()
              .describe("The year to get holidays for (Gregorian year)"),
          }),
          execute: async ({ year }) => {
            return listJewishHolidays(year);
          },
        },
        convertDate: {
          description:
            "Convert dates between Gregorian and Hebrew calendars. Supports both directions with comprehensive date information including parsha, seasons, and Jewish calendar details.",
          inputSchema: z.object({
            inputDate: z
              .string()
              .describe(
                "The date to convert. For Gregorian: use YYYY-MM-DD format (e.g., '2024-10-03'). For Hebrew: use formats like '15 Tishrei 5785' or '15/1/5785'"
              ),
            fromCalendar: z
              .enum(["gregorian", "hebrew"])
              .describe(
                "The source calendar system - 'gregorian' to convert from Gregorian to Hebrew, 'hebrew' to convert from Hebrew to Gregorian"
              ),
          }),
          execute: async ({ inputDate, fromCalendar }) => {
            return convertDate(inputDate, fromCalendar);
          },
        },
      },
    });

    let fullResponse = "";
    process.stdout.write("\nAssistant: ");
    for await (const delta of result.textStream) {
      fullResponse += delta;
      process.stdout.write(JSON.stringify(delta, null, 2));
    }
    process.stdout.write("\n\n");

    messages.push({ role: "assistant", content: fullResponse });
  }
}

main().catch(console.error);
