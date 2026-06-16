// On-demand enrichment — khi mở 1 repo CHƯA từng trending (vd từ Brand Discovery),
// tự enrich qua GraphQL + lưu DB để trang chi tiết có metadata + chấm điểm live.
// Điểm sẽ được cron persist + sinh AI insight ở lần chạy kế tiếp.

import { fetchRepoEnrichment } from "./github-graphql";
import { upsertEnrichedRepos, getRepository } from "./enrichment";
import type { RepositoryRow } from "./enrichment";

export async function ensureRepoEnriched(
  owner: string,
  repo: string,
): Promise<RepositoryRow | null> {
  // Đã có trong DB → khỏi enrich lại.
  const existing = await getRepository(owner, repo);
  if (existing) return existing;

  // Cần GraphQL token + Supabase service-role để ghi. Thiếu → bỏ qua an toàn.
  if (!process.env.GITHUB_TOKEN || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  try {
    const enriched = await fetchRepoEnrichment(owner, repo);
    if (!enriched) return null;
    await upsertEnrichedRepos([enriched]);
    return await getRepository(owner, repo);
  } catch {
    // Repo không tồn tại / lỗi API → giữ nguyên hành vi "chưa từng trending".
    return null;
  }
}
