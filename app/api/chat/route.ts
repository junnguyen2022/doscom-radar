import type { NextRequest } from "next/server";
import { runAgent } from "@/lib/anthropic";
import type Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { messages: Anthropic.MessageParam[] };
  if (!Array.isArray(body.messages)) {
    return new Response("messages must be an array", { status: 400 });
  }
  const stream = await runAgent(body.messages);
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
