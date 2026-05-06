// One-time converter: OSSInsight collection YAMLs → lib/collections.data.ts
// Usage: node scripts/build-collections.mjs <path-to-ossinsight>/configs/collections
// Default path: ../ossinsight-ref/configs/collections

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC =
  process.argv[2] ||
  path.join(__dirname, "..", "..", "ossinsight-ref", "configs", "collections");
const OUT = path.join(__dirname, "..", "lib", "collections.data.ts");

// Minimal YAML parser — handles only the format used by OSSInsight collections:
//   id: 12
//   name: Foo Bar
//   items:
//     - owner1/repo1
//     - owner2/repo2
function parseYaml(text) {
  const lines = text.split(/\r?\n/);
  const out = { id: 0, name: "", items: [] };
  let inItems = false;

  for (const raw of lines) {
    const line = raw.replace(/\s+#.*$/, ""); // strip inline comments
    if (!line.trim() || line.trim().startsWith("#")) continue;

    if (/^id:\s*/.test(line)) {
      out.id = parseInt(line.split(":")[1].trim(), 10) || 0;
      inItems = false;
    } else if (/^name:\s*/.test(line)) {
      out.name = line.replace(/^name:\s*/, "").trim().replace(/^["']|["']$/g, "");
      inItems = false;
    } else if (/^items:\s*$/.test(line)) {
      inItems = true;
    } else if (inItems && /^\s*-\s*/.test(line)) {
      const item = line.replace(/^\s*-\s*/, "").trim().replace(/^["']|["']$/g, "");
      if (item.includes("/")) out.items.push(item);
    } else {
      inItems = false;
    }
  }
  return out;
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const files = (await fs.readdir(SRC)).filter((f) => f.endsWith(".yml")).sort();
console.log(`Reading ${files.length} YAMLs from ${SRC}...`);

const collections = [];
for (const f of files) {
  const text = await fs.readFile(path.join(SRC, f), "utf8");
  const parsed = parseYaml(text);
  if (!parsed.name || parsed.items.length === 0) {
    console.warn(`  skip empty/invalid: ${f}`);
    continue;
  }
  collections.push({
    id: parsed.id,
    slug: slugify(parsed.name),
    name: parsed.name,
    items: parsed.items,
  });
}

// Dedupe slugs
const slugCount = new Map();
for (const c of collections) {
  const n = (slugCount.get(c.slug) ?? 0) + 1;
  slugCount.set(c.slug, n);
  if (n > 1) c.slug = `${c.slug}-${n}`;
}

const totalItems = collections.reduce((acc, c) => acc + c.items.length, 0);
console.log(`Parsed ${collections.length} collections, ${totalItems} total items`);

const ts = `// Auto-generated from OSSInsight collections by scripts/build-collections.mjs
// Source: pingcap/ossinsight (Apache 2.0). Collections curated by PingCAP.
// Do not edit by hand — re-run the script to refresh.

export type Collection = {
  id: number;
  slug: string;
  name: string;
  items: string[]; // owner/repo
};

export const COLLECTIONS: Collection[] = ${JSON.stringify(collections, null, 2)};
`;

await fs.writeFile(OUT, ts, "utf8");
console.log(`Wrote ${OUT} (${(ts.length / 1024).toFixed(1)} KB)`);
