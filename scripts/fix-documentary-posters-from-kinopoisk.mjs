#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const KP_BASE_URL = "https://api.kinopoisk.dev/v1.4";
const TARGET_FILES = [
  path.join(ROOT, "src/app/data/generatedMovies.ts"),
  path.join(ROOT, "src/app/data/movies.ts"),
];

function readEnvFile(filename) {
  const filepath = path.join(ROOT, filename);
  if (!fs.existsSync(filepath)) return;

  const lines = fs.readFileSync(filepath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

readEnvFile(".env.local");
readEnvFile(".env");

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getToken() {
  return cleanString(process.env.KINOPOISK_DEV_TOKEN) || cleanString(process.env.KINOPOISK_API_KEY);
}

async function kpFetchMovie(id) {
  const token = getToken();
  if (!token) {
    throw new Error("Не найден KINOPOISK_API_KEY или KINOPOISK_DEV_TOKEN в .env.local/.env/process.env");
  }

  const url = new URL(`${KP_BASE_URL}/movie/${id}`);
  ["id", "name", "type", "genres", "poster"].forEach((field) => url.searchParams.append("selectFields", field));

  const response = await fetch(url, {
    headers: {
      "X-API-KEY": token,
      "accept": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Kinopoisk API ${response.status} для kp=${id}: ${body.slice(0, 400)}`);
  }

  return response.json();
}

function getPosterUrl(doc) {
  const poster = doc?.poster;
  if (!poster || typeof poster !== "object") return "";
  const url = cleanString(poster.url) || cleanString(poster.previewUrl);
  if (!url || !/^https?:\/\//i.test(url)) return "";
  return url;
}

function buildBracePairs(text) {
  const stack = [];
  const pairs = [];
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1] || "";

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }

    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) quote = "";
      continue;
    }

    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "{") stack.push(index);
    if (char === "}") {
      const start = stack.pop();
      if (typeof start === "number") pairs.push({ start, end: index });
    }
  }

  return pairs;
}

function getDocumentaryBlocks(text) {
  const pairs = buildBracePairs(text);
  const matches = Array.from(text.matchAll(/type:\s*["'`]Документальный["'`]/g));
  const blocks = new Map();

  for (const match of matches) {
    const index = match.index ?? 0;
    const span = pairs
      .filter((pair) => pair.start < index && pair.end > index)
      .sort((a, b) => b.start - a.start)[0];

    if (!span) continue;
    const block = text.slice(span.start, span.end + 1);
    const idMatch = block.match(/kinopoiskId:\s*(\d+)/);
    if (!idMatch) continue;
    blocks.set(span.start, {
      ...span,
      kinopoiskId: Number(idMatch[1]),
      title: block.match(/title:\s*["'`]([^"'`]+)["'`]/)?.[1] || "без названия",
    });
  }

  return Array.from(blocks.values()).sort((a, b) => a.start - b.start);
}

function replacePosterLine(text, span, posterUrl) {
  const block = text.slice(span.start, span.end + 1);
  const lineMatch = block.match(/\n([ \t]*)poster:\s*.*(?:\r?\n)/);

  if (!lineMatch || typeof lineMatch.index !== "number") {
    const typeMatch = block.match(/\n([ \t]*)type:\s*["'`]Документальный["'`],?\s*(?:\r?\n)/);
    if (!typeMatch || typeof typeMatch.index !== "number") return { text, changed: false, reason: "не найдено место для poster" };

    const insertAt = span.start + typeMatch.index + typeMatch[0].length;
    const indent = typeMatch[1] || "    ";
    const insertion = `${indent}poster: ${JSON.stringify(posterUrl)},\n`;
    return {
      text: text.slice(0, insertAt) + insertion + text.slice(insertAt),
      changed: true,
      reason: "poster добавлен",
    };
  }

  const oldLine = lineMatch[0];
  const indent = lineMatch[1] || "    ";
  const nextLineBreak = oldLine.endsWith("\r\n") ? "\r\n" : "\n";
  const newLine = `\n${indent}poster: ${JSON.stringify(posterUrl)},${nextLineBreak}`;

  if (oldLine === newLine || oldLine.includes(JSON.stringify(posterUrl))) {
    return { text, changed: false, reason: "уже стоит постер Kinopoisk" };
  }

  const replaceStart = span.start + lineMatch.index;
  const replaceEnd = replaceStart + oldLine.length;
  return {
    text: text.slice(0, replaceStart) + newLine + text.slice(replaceEnd),
    changed: true,
    reason: "poster заменён",
  };
}

async function fixFile(filepath) {
  if (!fs.existsSync(filepath)) {
    console.log(`[KinoLuma] Пропуск: ${path.relative(ROOT, filepath)} не найден`);
    return { scanned: 0, changed: 0, skipped: 0 };
  }

  let text = fs.readFileSync(filepath, "utf8");
  const blocks = getDocumentaryBlocks(text);
  let changed = 0;
  let skipped = 0;

  console.log(`\n[KinoLuma] Файл: ${path.relative(ROOT, filepath)}`);
  console.log(`[KinoLuma] Найдено документалок: ${blocks.length}`);

  const posterById = new Map();
  const updates = [];

  for (const block of blocks) {
    try {
      let posterUrl = posterById.get(block.kinopoiskId);
      if (posterUrl === undefined) {
        const doc = await kpFetchMovie(block.kinopoiskId);
        posterUrl = getPosterUrl(doc);
        posterById.set(block.kinopoiskId, posterUrl);
      }

      if (!posterUrl) {
        skipped += 1;
        console.log(`- пропуск kp=${block.kinopoiskId}: нет постера Kinopoisk`);
        continue;
      }

      updates.push({ ...block, posterUrl });
      console.log(`- готово kp=${block.kinopoiskId}: ${block.title}`);
    } catch (error) {
      skipped += 1;
      console.warn(`- пропуск kp=${block.kinopoiskId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  for (const update of updates.sort((a, b) => b.start - a.start)) {
    const result = replacePosterLine(text, update, update.posterUrl);
    text = result.text;
    if (result.changed) changed += 1;
    else skipped += 1;
  }

  if (changed > 0) fs.writeFileSync(filepath, text, "utf8");

  console.log(`[KinoLuma] Заменено постеров: ${changed}`);
  console.log(`[KinoLuma] Пропущено: ${skipped}`);

  return { scanned: blocks.length, changed, skipped };
}

async function main() {
  let totalScanned = 0;
  let totalChanged = 0;
  let totalSkipped = 0;

  for (const filepath of TARGET_FILES) {
    const result = await fixFile(filepath);
    totalScanned += result.scanned;
    totalChanged += result.changed;
    totalSkipped += result.skipped;
  }

  console.log("\n[KinoLuma] Готово");
  console.log(`[KinoLuma] Документалок проверено: ${totalScanned}`);
  console.log(`[KinoLuma] Постеров заменено на Kinopoisk: ${totalChanged}`);
  console.log(`[KinoLuma] Пропущено: ${totalSkipped}`);
}

main().catch((error) => {
  console.error("\n[KinoLuma] Ошибка фикса постеров документалок:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
