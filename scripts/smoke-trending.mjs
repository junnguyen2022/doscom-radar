// Smoke test: fetch + parse GitHub trending without DB.
// Usage: node scripts/smoke-trending.mjs [daily|weekly|monthly]

import * as cheerio from "cheerio";

const timeframe = process.argv[2] || "daily";
const since = timeframe === "daily" ? "" : `?since=${timeframe}`;
const url = `https://github.com/trending${since}`;

console.log(`fetching ${url} ...`);
const res = await fetch(url, {
  headers: {
    "User-Agent": "agent-trending-tracker/0.1",
    Accept: "text/html",
  },
});
console.log(`status: ${res.status}`);
if (!res.ok) process.exit(1);

const html = await res.text();
const $ = cheerio.load(html);

const items = [];
$("article.Box-row").each((i, el) => {
  const $el = $(el);
  const href = ($el.find("h2 a").first().attr("href") || "").trim();
  const parts = href.replace(/^\//, "").split("/");
  if (parts.length < 2) return;
  const lang =
    $el.find('[itemprop="programmingLanguage"]').first().text().trim() || null;
  const desc = $el.find("p").first().text().trim() || null;
  const starsToday = $el.find(".float-sm-right").first().text().trim();
  const totalStars = $el.find('a[href$="/stargazers"]').first().text().trim();
  items.push({
    rank: i + 1,
    owner: parts[0],
    repo: parts[1],
    lang,
    starsToday,
    totalStars,
    descSnippet: desc?.slice(0, 60),
  });
});

console.log(`\nparsed ${items.length} repos for "${timeframe}"`);
console.log("\nfirst 5:");
console.table(items.slice(0, 5));
