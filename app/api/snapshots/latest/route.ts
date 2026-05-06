import { allRowsForLatestDate } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { rows, capturedAt } = await allRowsForLatestDate("daily");
  return Response.json({ capturedAt, rows });
}
