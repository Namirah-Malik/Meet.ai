import { inngest } from "./client";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { db } from "@/db";
import { meetings, user } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

// ── Types ─────────────────────────────────────────────────────────────────────

interface StreamTranscriptItem {
  type: string;
  speaker_id: string;
  user_id: string;
  text: string;
  start_time: string;
  stop_time: string;
  duration?: string;
  call_cid?: string;
}

interface TranscriptEntry {
  speaker: string;
  text: string;
  startTime: string;
  stopTime: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parse JSONL: one JSON object per line, only keep speech lines with text */
function parseJSONL(raw: string): StreamTranscriptItem[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try { return JSON.parse(line) as StreamTranscriptItem; }
      catch { return null; }
    })
    .filter((item): item is StreamTranscriptItem =>
      item !== null &&
      item.type === "speech.user.stopped" &&
      Boolean(item.text?.trim())
    );
}

// ── Inngest function ──────────────────────────────────────────────────────────

export const meetingsProcessing = inngest.createFunction(
  {
    id: "meetings/processing",
    retries: 2,
  },
  { event: "meetings/processing" },
  async ({ event, step }) => {
    const { meetingId, transcriptUrl } = event.data as {
      meetingId: string;
      transcriptUrl: string;
    };

    // 1. Fetch raw JSONL transcript from Stream CDN
    const rawText = await step.run("fetch-transcript", async () => {
      const res = await fetch(transcriptUrl);
      if (!res.ok) throw new Error(`Transcript fetch failed: ${res.status}`);
      return res.text();
    });

    // 2. Parse JSONL into typed items
    const items = await step.run("parse-transcript", async () => {
      return parseJSONL(rawText);
    });

    // Edge case: no speech detected
    if (items.length === 0) {
      await step.run("mark-completed-empty", async () => {
        await db
          .update(meetings)
          .set({ status: "completed", summary: "No transcript available." })
          .where(eq(meetings.id, meetingId));
      });
      return { summary: null, transcriptEntries: 0 };
    }

    // 3. Resolve speaker user_ids → real names from user table
    const transcript = await step.run("resolve-speakers", async () => {
      const speakerIds = [...new Set(items.map((i) => i.user_id).filter(Boolean))];

      const users =
        speakerIds.length > 0
          ? await db
              .select({ id: user.id, name: user.name })
              .from(user)
              .where(inArray(user.id, speakerIds))
          : [];

      const nameMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

      return items.map((item): TranscriptEntry => ({
        speaker: nameMap[item.user_id] ?? item.speaker_id ?? "Unknown",
        text: item.text.trim(),
        startTime: item.start_time,
        stopTime: item.stop_time,
      }));
    });

    // 4. Generate AI summary
    const summary = await step.run("generate-summary", async () => {
      const transcriptText = transcript
        .map((e) => `[${e.speaker}]: ${e.text}`)
        .join("\n");

      const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        system: `You are an expert meeting summarizer. Given a transcript, produce a concise structured summary with these sections:

**Overview**
2-3 sentences on what the meeting was about.

**Key Topics**
- Bullet list of main discussion points

**Action Items**
- Any tasks, decisions, or next steps mentioned (write "None identified" if none)

**Sentiment**
Overall tone of the meeting (positive / neutral / mixed / negative)

Be factual, professional, and concise. Use the exact section headers above.`,
        prompt: `Summarize this meeting transcript:\n\n${transcriptText}`,
      });

      return text;
    });

    // 5. Save summary + transcript JSON, mark as completed
    await step.run("save-to-db", async () => {
      await db
        .update(meetings)
        .set({
          status: "completed",
          summary,
          // Transcript stored as JSON in notes field
          // TODO: add a dedicated `transcriptData text` column in next migration
          notes: JSON.stringify(transcript),
          updatedAt: new Date(),
        })
        .where(eq(meetings.id, meetingId));
    });

    return {
      meetingId,
      summaryLength: summary.length,
      transcriptEntries: transcript.length,
    };
  }
);