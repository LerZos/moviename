export const UNKNOWN_MOVIE_RATING_TEXT = "Уточняется";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as JsonRecord;
}

function getRatingNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeRating(value: number) {
  return Math.max(0, Math.min(10, Math.round(value * 10) / 10));
}

export function parseManualRatingInput(value: unknown) {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string" && !value.trim()) return undefined;

  if (typeof value === "string" && !/^\d+(?:[.,]\d+)?$/.test(value.trim())) {
    throw new RangeError("Рейтинг должен быть числом от 0 до 10");
  }
  const parsed = getRatingNumber(value);

  if (parsed === null || parsed < 0 || parsed > 10) {
    throw new RangeError("Рейтинг должен быть числом от 0 до 10");
  }

  return normalizeRating(parsed);
}

export function getManualRatingFromRawJson(rawJson: unknown) {
  const kinoluma = asRecord(asRecord(rawJson).kinoluma);

  for (const value of [
    kinoluma.manual_rating,
    kinoluma.manual_movie_rating,
    kinoluma.movie_rating,
  ]) {
    const rating = getRatingNumber(value);
    if (rating !== null) return rating;
  }

  return null;
}

export function mergeManualRatingIntoRawJson(
  rawJson: unknown,
  rating: number | null,
) {
  const base = asRecord(rawJson);
  const kinoluma = asRecord(base.kinoluma);
  const nextKinoluma = { ...kinoluma };
  for (const key of ["manual_rating", "manual_movie_rating", "movie_rating"]) {
    delete nextKinoluma[key];
  }
  const parsed = parseManualRatingInput(rating);
  if (parsed !== undefined && parsed > 0) {
    nextKinoluma.manual_rating = parsed;
    nextKinoluma.manual_movie_rating = parsed;
  }

  return {
    ...base,
    kinoluma: {
      ...nextKinoluma,
      manual_rating_updated_at: new Date().toISOString(),
    },
  };
}

export type RatingSource = "override" | "draft_manual" | "kinopoisk" | "imdb" | "tmdb" | "catalog" | "unknown";
export type MovieRatingState = { effectiveRating: number; manualRating: number | null; source: RatingSource };

export const RATING_SOURCE_LABELS: Record<RatingSource, string> = {
  override: "Ручной рейтинг карточки",
  draft_manual: "Ручной рейтинг Import Admin",
  kinopoisk: "Кинопоиск", imdb: "IMDb", tmdb: "TMDB",
  catalog: "Каталог", unknown: "Рейтинг не указан",
};

// Keep the existing KP → IMDb → TMDB (with votes) precedence in all readers.
export function getDraftRatingState(rawJson: unknown): MovieRatingState {
  // Provider parsing retains the historical treatment of blank numeric fields.
  const providerNumber = (value: unknown) => {
    const number = typeof value === "string" ? Number(value.replace(",", ".").trim()) : value;
    return typeof number === "number" && Number.isFinite(number) ? number : null;
  };
  const raw = asRecord(rawJson);
  const tmdb = asRecord(raw.tmdb);
  const candidate = asRecord(raw.candidate);
  const kp = asRecord(asRecord(raw.kinopoisk).rating);
  const manual = getManualRatingFromRawJson(rawJson);
  if (manual !== null && manual > 0) {
    return { effectiveRating: normalizeRating(manual), manualRating: normalizeRating(manual), source: "draft_manual" };
  }
  const tmdbRating = providerNumber(tmdb.vote_average) ?? providerNumber(candidate.vote_average);
  const votes = providerNumber(tmdb.vote_count) ?? providerNumber(candidate.vote_count) ?? 0;
  for (const [value, source] of [[kp.kp, "kinopoisk"], [kp.imdb, "imdb"], [votes > 0 ? tmdbRating : 0, "tmdb"]] as const) {
    const n = providerNumber(value);
    if (n !== null && n > 0) return { effectiveRating: normalizeRating(n), manualRating: null, source };
  }
  return { effectiveRating: 0, manualRating: null, source: "unknown" };
}

export function assertSavedDraftRating(rawJson: unknown, requested: unknown) {
  if (!rawJson || typeof rawJson !== "object" || Array.isArray(rawJson)) {
    throw new Error("Сохранение ручного рейтинга не подтверждено");
  }
  const expected = parseManualRatingInput(requested) || null;
  const saved = asRecord(asRecord(rawJson).kinoluma);
  const keys = ["manual_rating", "manual_movie_rating", "movie_rating"];
  if (expected === null ? keys.some(key => Object.hasOwn(saved, key)) :
    saved.manual_rating !== expected || saved.manual_movie_rating !== expected || Object.hasOwn(saved, "movie_rating")) {
    throw new Error("Сохранение ручного рейтинга не подтверждено");
  }
}

export function mergeMovieOverrideData(
  currentOverride: unknown,
  overridePatch: unknown,
  fieldsToClear: readonly string[] = [],
) {
  const merged: JsonRecord = {
    ...asRecord(currentOverride),
    ...asRecord(overridePatch),
  };

  for (const field of fieldsToClear) {
    delete merged[field];
  }

  return merged;
}

export function resolveManualMovieRating(
  automaticRating: unknown,
  manualRating: unknown,
) {
  const manual = getRatingNumber(manualRating);
  if (manual !== null && manual > 0) return normalizeRating(manual);

  const automatic = getRatingNumber(automaticRating);
  if (automatic !== null && automatic > 0) return normalizeRating(automatic);

  return 0;
}

export function formatMovieRating(rating: unknown) {
  const normalized = getRatingNumber(rating);

  if (normalized === null || normalized <= 0) {
    return UNKNOWN_MOVIE_RATING_TEXT;
  }

  const safeRating = normalizeRating(normalized);
  return `★ ${Number.isInteger(safeRating) ? safeRating.toString() : safeRating.toFixed(1)}`;
}
