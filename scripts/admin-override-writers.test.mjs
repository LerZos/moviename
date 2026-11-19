import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

// Every writer of movie_overrides must go through the field-level
// patch_movie_override RPC; a full JSON upsert can roll back a concurrent
// rating or poster edit made by another admin.
const root = new URL("../src/", import.meta.url);

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : /\.(?:ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

const sources = walk(root.pathname.replace(/^\/([A-Za-z]:)/, "$1")).map((file) => ({
  file: file.replaceAll("\\", "/").replace(/^.*\/src\//, "src/"),
  text: readFileSync(file, "utf8"),
}));

test("no direct table writes to movie_overrides remain", () => {
  for (const { file, text } of sources) {
    for (const match of text.matchAll(/from\(\s*["']movie_overrides["']\s*\)([\s\S]{0,200})/g)) {
      assert.doesNotMatch(match[1].split(/\n\s*\n/)[0], /^\s*\.(?:upsert|insert|update|delete)\(/, `${file} writes movie_overrides directly`);
    }
  }
});

test("legacy full-document saveMovieOverride helper is gone", () => {
  for (const { file, text } of sources) assert.doesNotMatch(text, /\bsaveMovieOverride\b/, file);
});

test("bulk player sync routes patch only the players key with the read state as expectation", () => {
  for (const file of ["src/app/api/admin/import/players/sync-all/route.ts", "src/app/api/admin/import/vibix/sync-site/route.ts"]) {
    const text = sources.find((source) => source.file === file)?.text;
    assert.ok(text, file);
    const calls = [...text.matchAll(/patchMovieOverride\(([^;]*)\);/g)].map((match) => match[1]);
    assert.equal(calls.length, 1, file);
    assert.match(calls[0], /^movie\.slug, \{ players(?:: nextPlayers)? \}, \[\], updatedBy, overrideData$/, file);
    assert.doesNotMatch(text, /\.\.\.overrideData/, file);
  }
});
