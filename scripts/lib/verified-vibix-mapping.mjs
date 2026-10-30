import { readFileSync } from "node:fs";

const mappings = JSON.parse(readFileSync(new URL("../../src/app/data/verifiedVibixMappings.json", import.meta.url), "utf8"));

// Generation must not overwrite a cabinet-verified correction with a stale API ID.
export function verifiedVibixForDocument(doc, type) {
  const mapping = mappings.find((item) => item.kinopoiskId === Number(doc.id));
  if (!mapping) return null;
  if (String(doc.year) !== mapping.year || doc.externalId?.imdb !== mapping.imdbId ||
    Number(doc.externalId?.tmdb) !== mapping.tmdbId || type !== "Фильм" ||
    mapping.tmdbNamespace !== "movie") {
    throw new Error("Verified Vibix mapping identity conflict; generation stopped");
  }
  return mapping;
}
