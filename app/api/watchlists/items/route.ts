// Watchlist items API — server-side, auth-required.

import { NextResponse, type NextRequest } from "next/server";
import {
  addToWatchlist,
  removeFromWatchlist,
  getMyWatchlist,
} from "@/lib/watchlist-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const items = await getMyWatchlist();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  let body: {
    owner?: string;
    repo?: string;
    status?: string;
    priority?: string;
    reason?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body.owner || !body.repo) {
    return NextResponse.json(
      { error: "owner and repo required" },
      { status: 400 },
    );
  }

  const result = await addToWatchlist({
    owner: body.owner,
    repo: body.repo,
    status: body.status as "follow" | "review" | "test" | "adopt" | "ignore" | "caution" | undefined,
    priority: body.priority as "high" | "medium" | "low" | undefined,
    reason: body.reason,
  });

  if ("error" in result) {
    const status = result.error === "unauthorized" ? 401 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ item: result });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  if (!owner || !repo) {
    return NextResponse.json(
      { error: "owner and repo query params required" },
      { status: 400 },
    );
  }
  const result = await removeFromWatchlist(owner, repo);
  if (!result.ok) {
    const status = result.error === "unauthorized" ? 401 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true });
}
