// LLM resilience — sinh text với Anthropic làm chính, tự fallback OpenAI khi lỗi.
// OpenAI gọi qua REST (không thêm dependency). Fallback chỉ bật khi có OPENAI_API_KEY.
// Dùng cho các tác vụ text thuần (dashboard insight, ai-news). Tool-use JSON vẫn ở
// insight-generator (đã degrade an toàn — skip khi lỗi, không crash).

import Anthropic from "@anthropic-ai/sdk";

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export type GenTextInput = {
  system: string;
  user: string;
  maxTokens?: number;
};

export type GenTextResult = {
  text: string;
  provider: "anthropic" | "openai";
};

async function viaAnthropic(input: GenTextInput): Promise<string> {
  const client = new Anthropic();
  const res = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: input.maxTokens ?? 800,
    system: [
      { type: "text", text: input.system, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: input.user }],
  });
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text" || !block.text.trim()) {
    throw new Error("Anthropic trả về rỗng");
  }
  return block.text;
}

async function viaOpenAI(input: GenTextInput): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY chưa cấu hình");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens: input.maxTokens ?? 800,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
      ],
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`OpenAI HTTP ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI trả về rỗng");
  return text;
}

// Thử Anthropic trước; lỗi (hết credit/401/429/network…) → thử OpenAI nếu có key.
// Ném lỗi gộp nếu cả hai fail — caller tự degrade thông điệp cho user.
export async function generateText(
  input: GenTextInput,
): Promise<GenTextResult> {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
    throw new Error("Chưa cấu hình ANTHROPIC_API_KEY lẫn OPENAI_API_KEY");
  }

  let anthropicErr: unknown = null;
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return { text: await viaAnthropic(input), provider: "anthropic" };
    } catch (e) {
      anthropicErr = e;
    }
  }

  if (process.env.OPENAI_API_KEY) {
    return { text: await viaOpenAI(input), provider: "openai" };
  }

  throw anthropicErr instanceof Error
    ? anthropicErr
    : new Error(String(anthropicErr));
}
