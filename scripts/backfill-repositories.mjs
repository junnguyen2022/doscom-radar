// Backfill: copy unique (owner, repo) from trending_snapshots → repositories.
// Marks last_enriched_at = null so next cron daily run will fully enrich.
//
// Usage:
//   node scripts/backfill-repositories.mjs
//
// Requires .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, "..", ".env.local");

// Crude .env parser
function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim();
    }
  }
}

loadEnv(ENV_PATH);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

console.log("Loading unique (owner, repo) from trending_snapshots...");

const seen = new Set();
let page = 0;
const PAGE_SIZE = 1000;

while (true) {
  const { data, error } = await supabase
    .from("trending_snapshots")
    .select("owner, repo, url")
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  if (error) {
    console.error("Read error:", error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) break;

  for (const r of data) {
    seen.add(`${r.owner}/${r.repo}|${r.url}`);
  }

  console.log(`  page ${page}: read ${data.length}, total unique: ${seen.size}`);
  if (data.length < PAGE_SIZE) break;
  page++;
}

console.log(`\nFound ${seen.size} unique repos.`);

const rows = [];
for (const k of seen) {
  const [ownerRepo, url] = k.split("|");
  const [owner, repo] = ownerRepo.split("/");
  rows.push({
    owner,
    repo,
    url,
    last_enriched_at: null,
  });
}

console.log("Upserting to repositories table (in batches of 500)...");

let inserted = 0;
const BATCH = 500;
for (let i = 0; i < rows.length; i += BATCH) {
  const slice = rows.slice(i, i + BATCH);
  const { error } = await supabase
    .from("repositories")
    .upsert(slice, { onConflict: "owner,repo", ignoreDuplicates: true });

  if (error) {
    console.error(`Batch ${i / BATCH} error:`, error.message);
    process.exit(1);
  }
  inserted += slice.length;
  console.log(`  upserted ${inserted}/${rows.length}`);
}

console.log(`\n✅ Done. ${rows.length} repos in repositories table (last_enriched_at=null).`);
console.log(`Next cron daily run will enrich them via GraphQL.`);
