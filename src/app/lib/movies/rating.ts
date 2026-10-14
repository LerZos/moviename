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

  return {
    ...base,
    kinoluma: {
      ...kinoluma,
      manual_rating: rating,
      manual_movie_rating: rating,
      manual_rating_updated_at: new Date().toISOString(),
    },
  };
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
