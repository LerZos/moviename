import type { Movie } from "../../data/movies";

export const DAILY_FEATURED_COUNT = 12;

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

export function getDailyFeaturedDateKey(now = new Date()) {
  const moscowDate = new Date(now.getTime() + MSK_OFFSET_MS);
  const year = moscowDate.getUTCFullYear();
  const month = padDatePart(moscowDate.getUTCMonth() + 1);
  const day = padDatePart(moscowDate.getUTCDate());

  return `${year}-${month}-${day}`;
}

function hashText(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function getYearNumber(year: string) {
  const match = year.match(/\d{4}/);
  if (!match) return 0;

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasRealPoster(item: Movie) {
  return Boolean(
    item.poster &&
      !item.poster.startsWith("data:image") &&
      !item.poster.includes("kinoluma-icon"),
  );
}

function isGoodFeaturedCandidate(item: Movie, currentYear: number) {
  if (!item.slug || !item.title) return false;
  if (!hasRealPoster(item) && !item.backdrop) return false;

  const year = getYearNumber(item.year);
  const isReleasedOrNearRelease = year === 0 || year <= currentYear + 1;
  const hasHealthyRating = item.rating >= 6.4 || item.rating === 0;

  return isReleasedOrNearRelease && hasHealthyRating;
}

function getFeaturedScore(item: Movie, dayKey: string, index: number) {
  const year = getYearNumber(item.year);
  const stableRandom = hashText(`${dayKey}:${item.slug}:${item.id}`) / 0xffffffff;
  const ratingScore = Math.max(0, item.rating) * 18;
  const modernBonus = year >= 2010 ? 16 : year >= 1990 ? 8 : 0;
  const visualBonus = item.backdrop ? 14 : hasRealPoster(item) ? 8 : 0;
  const typeBonus = item.type === "Фильм" ? 8 : item.type === "Сериал" ? 7 : item.type === "Мультфильм" ? 5 : 0;

  return stableRandom * 1000 + ratingScore + modernBonus + visualBonus + typeBonus - index * 0.002;
}

function diversifyByType(items: Movie[], count: number) {
  const result: Movie[] = [];
  const typeLimits: Record<string, number> = {
    Фильм: Math.max(6, Math.ceil(count * 0.7)),
    Сериал: Math.max(2, Math.ceil(count * 0.28)),
    Мультфильм: Math.max(2, Math.ceil(count * 0.24)),
    Аниме: 1,
    Документальный: 1,
  };
  const typeCounts = new Map<string, number>();

  for (const item of items) {
    const usedCount = typeCounts.get(item.type) ?? 0;
    const limit = typeLimits[item.type] ?? count;

    if (usedCount >= limit) {
      continue;
    }

    result.push(item);
    typeCounts.set(item.type, usedCount + 1);

    if (result.length >= count) {
      return result;
    }
  }

  for (const item of items) {
    if (result.some((existingItem) => existingItem.id === item.id)) {
      continue;
    }

    result.push(item);

    if (result.length >= count) {
      return result;
    }
  }

  return result;
}

export function getDailyFeaturedItems(
  items: Movie[],
  now = new Date(),
  count = DAILY_FEATURED_COUNT,
) {
  const dayKey = getDailyFeaturedDateKey(now);
  const currentYear = now.getFullYear();
  const uniqueItems = Array.from(
    new Map(items.map((item) => [item.slug || String(item.id), item])).values(),
  );
  const candidates = uniqueItems.filter((item) =>
    isGoodFeaturedCandidate(item, currentYear),
  );
  const source = candidates.length >= count ? candidates : uniqueItems;
  const sortedItems = source
    .map((item, index) => ({
      item,
      score: getFeaturedScore(item, dayKey, index),
    }))
    .sort((firstItem, secondItem) => secondItem.score - firstItem.score)
    .map(({ item }) => item);

  return diversifyByType(sortedItems, count);
}
