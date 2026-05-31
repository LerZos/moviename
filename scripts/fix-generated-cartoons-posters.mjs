#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FILE_PATH = path.join(ROOT, "src/app/data/generatedCartoons.ts");
const KP_BASE_URL = "https://api.kinopoisk.dev/v1.4";
const DEFAULT_MAX_AGE = 16;

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

function getArg(name, fallback) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
}

function getFlag(name) {
  return process.argv.includes(`--${name}`);
}

function toInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanInt(value) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value !== "string") return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
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
  [
    "id",
    "name",
    "year",
    "typeNumber",
    "isSeries",
    "ageRating",
    "poster",
    "backdrop",
  ].forEach((field) => url.searchParams.append("selectFields", field));

  const response = await fetch(url, {
    headers: {
      "X-API-KEY": token,
      accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Kinopoisk API ${response.status} for kp=${id}: ${body.slice(0, 300)}`);
  }

  return response.json();
}

function getPosterUrl(doc) {
  const candidates = [doc?.poster?.url, doc?.poster?.previewUrl, doc?.backdrop?.url, doc?.backdrop?.previewUrl];

  for (const value of candidates) {
    const url = cleanString(value);
    if (/^https:\/\//i.test(url) && !/themoviedb\.org/i.test(url)) return url;
  }

  return "";
}

function tsString(value) {
  return JSON.stringify(cleanString(value));
}

function splitGeneratedFile(text) {
  const marker = "export const generatedKinoLumaCartoons: Movie[] = [";
  const start = text.indexOf(marker);
  if (start < 0) return null;

  const listStart = text.indexOf("\n", start + marker.length);
  const listEnd = text.lastIndexOf("\n];");
  if (listStart < 0 || listEnd < listStart) return null;

  const head = text.slice(0, listStart + 1);
  const body = text.slice(listStart + 1, listEnd);
  const tail = text.slice(listEnd);
  const chunks = body
    .split(/,\n(?=  \{\n    id: )/g)
    .map((chunk) => chunk.trimEnd())
    .filter((chunk) => chunk.trim());

  return { head, chunks, tail };
}

function extractKinopoiskId(chunk) {
  const match = chunk.match(/\n    kinopoiskId:\s*(\d+),/);
  return match ? Number(match[1]) : null;
}

function replacePosterBlock(chunk, posterUrl) {
  const fallbackMatch = chunk.match(/\n    posterFallbacks:\s*\[[^\n]*\],/);
  const fallbackLine = fallbackMatch?.[0] || "";

  if (/\n    poster:\s*[\s\S]*?\n    description:/.test(chunk)) {
    return chunk.replace(
      /\n    poster:\s*[\s\S]*?\n    description:/,
      `\n    poster: ${tsString(posterUrl)},${fallbackLine || ""}\n    description:`,
    );
  }

  return chunk;
}

async function main() {
  if (!fs.existsSync(FILE_PATH)) {
    throw new Error(`Файл не найден: ${path.relative(ROOT, FILE_PATH)}`);
  }

  const maxAge = Math.max(0, Math.min(21, toInt(getArg("max-age", DEFAULT_MAX_AGE), DEFAULT_MAX_AGE)));
  const keepAnimatedSeries = getFlag("keep-animated-series");
  const text = fs.readFileSync(FILE_PATH, "utf8");
  const parsed = splitGeneratedFile(text);
  if (!parsed) throw new Error("Не смог разобрать generatedCartoons.ts. Проверь, что файл создан нашим генератором.");

  let fixed = 0;
  let removed = 0;
  let missed = 0;
  const output = [];

  for (const chunk of parsed.chunks) {
    const id = extractKinopoiskId(chunk);
    if (!id) {
      missed += 1;
      output.push(chunk);
      continue;
    }

    const doc = await kpFetchMovie(id);
    const age = cleanInt(doc.ageRating);
    const isAnimatedSeries = doc.isSeries || cleanInt(doc.typeNumber) === 5;

    if (!keepAnimatedSeries && isAnimatedSeries) {
      removed += 1;
      console.log(`[KinoLuma] removed animated series kp=${id} ${cleanString(doc.name)}`);
      continue;
    }

    if (maxAge && age && age > maxAge) {
      removed += 1;
      console.log(`[KinoLuma] removed age ${age}+ kp=${id} ${cleanString(doc.name)}`);
      continue;
    }

    const posterUrl = getPosterUrl(doc);
    if (!posterUrl) {
      missed += 1;
      output.push(chunk);
      continue;
    }

    fixed += 1;
    output.push(replacePosterBlock(chunk, posterUrl));
  }

  fs.writeFileSync(FILE_PATH, `${parsed.head}${output.join(",\n")}${parsed.tail}`, "utf8");

  console.log("\n[KinoLuma] Готово");
  console.log(`[KinoLuma] Исправлено постеров: ${fixed}`);
  console.log(`[KinoLuma] Удалено неподходящих карточек: ${removed}`);
  console.log(`[KinoLuma] Пропущено без изменений: ${missed}`);
  console.log(`[KinoLuma] Файл: ${path.relative(ROOT, FILE_PATH)}`);
}

main().catch((error) => {
  console.error("\n[KinoLuma] Ошибка фикса мульт-постеров:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
