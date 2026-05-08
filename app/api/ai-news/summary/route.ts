// V2.5 §23.7 — optional manual AI summary for an AI news URL.
// Only available when ANTHROPIC_API_KEY is set. Cached in-memory by url+date.
// Cost-controlled: max 800 input tokens, 400 output, ≤30 calls per day per process.

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-sonnet-4-6";
const MAX_PER_DAY = 30;

type CacheEntry = { date: string; summary: string };
const cache = new Map<string, CacheEntry>();
const usage = new Map<string, number>(); // date -> count

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI summary disabled (no ANTHROPIC_API_KEY)." },
      { status: 503 },
    );
  }

  let body: { url?: string; title?: string; description?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const url = body.url?.trim();
  const title = body.title?.trim() || "";
  if (!url) {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }

  const day = today();
  const key = `${day}|${url}`;
  const hit = cache.get(key);
  if (hit && hit.date === day) {
    return NextResponse.json({ summary: hit.summary, cached: true });
  }

  const used = usage.get(day) ?? 0;
  if (used >= MAX_PER_DAY) {
    return NextResponse.json(
      { error: "Daily AI summary cap reached." },
      { status: 429 },
    );
  }

  const client = new Anthropic();
  const prompt = `You are summarising an AI news item for a Vietnamese SME called Doscom Holdings (focus: AI agents, RAG, automation, ecommerce, BI, customer support).
Item:
  Title: ${title}
  URL: ${url}
  Description: ${body.description ?? ""}

Return 3-5 short bullet points in Vietnamese covering:
  • What it is
  • Why it matters
  • Possible Doscom use case (1-2 lines, only if applicable)

No preamble. Plain text bullets prefixed with "•".`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (!text) {
      return NextResponse.json(
        { error: "Empty AI response" },
        { status: 502 },
      );
    }
    cache.set(key, { date: day, summary: text });
    usage.set(day, used + 1);
    return NextResponse.json({ summary: text, cached: false });
  } catch (err) {
    return NextResponse.json(
      {
        error: `AI request failed: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 502 },
    );
  }
}
