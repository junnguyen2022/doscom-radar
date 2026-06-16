// Weekly digest cron — gửi Brand Spotlight (DOSCOM/NOMA) qua webhook (Lark/Slack).
// Lịch: Thứ 2 hằng tuần 01:00 UTC (xem vercel.json).
// Kích hoạt: đặt env DIGEST_WEBHOOK_URL (Lark custom bot hoặc Slack incoming webhook).

import type { NextRequest } from "next/server";
import { allRowsForLatestDate } from "@/lib/storage";
import { generateBrandDigestText } from "@/lib/digest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function authorize(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET) return false;
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

// Lark dùng {msg_type,text}; Slack/generic dùng {text}. Tự nhận theo host URL.
function buildPayload(url: string, text: string): unknown {
  const isLark = /larksuite\.com|feishu\.cn|larkoffice\.com/.test(url);
  if (isLark) return { msg_type: "text", content: { text } };
  return { text };
}

async function send(): Promise<{ sent: boolean; reason?: string; chars?: number }> {
  const url = process.env.DIGEST_WEBHOOK_URL;
  if (!url) return { sent: false, reason: "DIGEST_WEBHOOK_URL chưa cấu hình" };

  const { rows: weekly, capturedAt } = await allRowsForLatestDate("weekly");
  const rows = weekly.length > 0 ? weekly : (await allRowsForLatestDate("daily")).rows;
  const text = generateBrandDigestText(rows, capturedAt ?? "—");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildPayload(url, text)),
    cache: "no-store",
  });
  if (!res.ok) {
    return { sent: false, reason: `Webhook HTTP ${res.status}: ${await res.text()}` };
  }
  return { sent: true, chars: text.length };
}

export async function GET(req: NextRequest): Promise<Response> {
  if (!authorize(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await send();
    return Response.json(result);
  } catch (e) {
    return Response.json(
      { sent: false, reason: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
