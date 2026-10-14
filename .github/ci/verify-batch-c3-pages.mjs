import { readFile } from "node:fs/promises";

const origin = (process.argv[2] ?? "http://127.0.0.1:3100").replace(/\/$/, "");
const plan = JSON.parse(await readFile("release-plans/batch-c3-dry-run-plan.json", "utf8"));
const bySlug = new Map(plan.allowlist.map((entry) => [entry.slug, entry]));
const checks = [
  { slug: "joker", fields: ["directors", "actors"] },
  { slug: "andor", fields: ["seriesCreators"] },
  { slug: "the-gorge-2025", fields: ["directors"] },
];
const failures = [];

for (const check of checks) {
  const entry = bySlug.get(check.slug);
  if (!entry) throw new Error(`Missing approved credits entry: ${check.slug}`);
  const response = await fetch(`${origin}/movie/${check.slug}`);
  const html = await response.text();
  const canonical = `https://kinoluma.online/movie/${check.slug}`;
  if (response.status !== 200 || !html.includes(canonical)) {
    failures.push(`${check.slug}: HTTP/canonical`);
  }
  for (const field of check.fields) {
    const first = entry.fields[field]?.[0];
    const name = typeof first === "string" ? first : first?.name;
    if (!name || !html.includes(name)) failures.push(`${check.slug}: missing ${field} in SSR HTML`);
  }
  if (check.slug === "andor" && html.includes("Режиссёры")) {
    failures.push("andor: series creator rendered as director");
  }
}

const animeSlug = "steins-gate";
if (bySlug.has(animeSlug)) failures.push(`${animeSlug}: unexpectedly added to credits allowlist`);
const animeResponse = await fetch(`${origin}/movie/${animeSlug}`);
const animeHtml = await animeResponse.text();
if (animeResponse.status !== 200 || !animeHtml.includes(`https://kinoluma.online/movie/${animeSlug}`)) {
  failures.push(`${animeSlug}: HTTP/canonical`);
}
if (!animeHtml.includes("5zxePQEsUKLYDh2kpXGQAeInjUU.jpg")) {
  failures.push(`${animeSlug}: pinned poster not found in SSR HTML`);
}

const noNewCredits = "dark";
if (bySlug.has(noNewCredits)) failures.push(`${noNewCredits}: expected outside allowlist`);
const noNewResponse = await fetch(`${origin}/movie/${noNewCredits}`);
if (noNewResponse.status !== 200) failures.push(`${noNewCredits}: HTTP ${noNewResponse.status}`);

console.log(`BATCH_C3_PAGE_QA=${failures.length ? "FAIL" : "PASS"} checked=5`);
for (const failure of failures) console.error(failure);
if (failures.length) process.exitCode = 1;
