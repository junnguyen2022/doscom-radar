import { NextResponse, type NextRequest } from "next/server";
import {
  logDecision,
  getMyDecisions,
  type DecisionType,
} from "@/lib/decisions-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_DECISIONS: DecisionType[] = [
  "follow",
  "review",
  "test",
  "adopt",
  "ignore",
  "caution",
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const decision = searchParams.get("decision");
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);

  const items = await getMyDecisions({
    limit,
    decision:
      decision && VALID_DECISIONS.includes(decision as DecisionType)
        ? (decision as DecisionType)
        : undefined,
  });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  let body: {
    owner?: string;
    repo?: string;
    decision?: string;
    decision_reason?: string;
    test_plan?: string;
    risk_note?: string;
    due_date?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body.owner || !body.repo) {
    return NextResponse.json({ error: "owner and repo required" }, { status: 400 });
  }
  if (!body.decision || !VALID_DECISIONS.includes(body.decision as DecisionType)) {
    return NextResponse.json(
      { error: `decision must be one of ${VALID_DECISIONS.join("/")}` },
      { status: 400 },
    );
  }
  if (!body.decision_reason || body.decision_reason.length < 5) {
    return NextResponse.json(
      { error: "decision_reason required (min 5 chars)" },
      { status: 400 },
    );
  }

  const result = await logDecision({
    owner: body.owner,
    repo: body.repo,
    decision: body.decision as DecisionType,
    decision_reason: body.decision_reason,
    test_plan: body.test_plan,
    risk_note: body.risk_note,
    due_date: body.due_date,
  });

  if ("error" in result) {
    const status = result.error === "unauthorized" ? 401 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ decision: result });
}
