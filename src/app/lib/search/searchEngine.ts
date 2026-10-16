export type SearchCatalogItem = {
  id: number;
  canonicalMovieId?: string;
  slug: string;
  title: string;
  originalTitle: string;
  searchTitles: readonly string[];
  type: string;
  year: string;
  rating: number;
  genres: readonly string[];
  tmdbId?: number;
  imdbId?: string;
  kinopoiskId?: number;
};

type SearchOptions = {
  limit?: number;
};

type QueryVariant = {
  value: string;
  penalty: number;
};

type SearchGroup<T extends SearchCatalogItem> = {
  identityKey: string;
  representative: T;
  aliases: Set<string>;
};

// Search-only aliases for reviewed legacy duplicates. The canonical registry and
// public URLs remain unchanged; this map only prevents two cards for one known
// identity from appearing in search results.
export const searchCanonicalMovieIdAliases: Readonly<Record<string, string>> = {
  // Joker (2019): legacy Kinopoisk card -> current TMDB/IMDb card.
  "67a3ab42-c257-4cc3-a2d5-b5cb79f6c2d3":
    "7c422d8c-d13a-4cf1-84c5-49792df53267",
};

export function resolveSearchCanonicalMovieId(canonicalMovieId: string) {
  let resolved = canonicalMovieId;
  const seen = new Set<string>();

  while (searchCanonicalMovieIdAliases[resolved] && !seen.has(resolved)) {
    seen.add(resolved);
    resolved = searchCanonicalMovieIdAliases[resolved];
  }

  return resolved;
}

const ENGLISH_TO_RUSSIAN_LAYOUT: Readonly<Record<string, string>> = {
  q: "й", w: "ц", e: "у", r: "к", t: "е", y: "н", u: "г", i: "ш", o: "щ", p: "з",
  "[": "х", "]": "ъ", a: "ф", s: "ы", d: "в", f: "а", g: "п", h: "р", j: "о",
  k: "л", l: "д", ";": "ж", "'": "э", z: "я", x: "ч", c: "с", v: "м", b: "и",
  n: "т", m: "ь", ",": "б", ".": "ю",
};

const RUSSIAN_TO_ENGLISH_LAYOUT = Object.fromEntries(
  Object.entries(ENGLISH_TO_RUSSIAN_LAYOUT).map(([english, russian]) => [russian, english]),
) as Readonly<Record<string, string>>;

const CYRILLIC_TO_LATIN: Readonly<Record<string, string>> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z", и: "i",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s",
  т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch",
  ы: "y", э: "e", ю: "yu", я: "ya", ь: "", ъ: "",
};

const LATIN_TO_CYRILLIC: readonly [string, string][] = [
  ["shch", "щ"], ["sch", "щ"], ["yo", "е"], ["zh", "ж"], ["kh", "х"],
  ["ts", "ц"], ["ch", "ч"], ["sh", "ш"], ["yu", "ю"], ["ya", "я"],
  ["a", "а"], ["b", "б"], ["v", "в"], ["g", "г"], ["d", "д"], ["e", "е"],
  ["z", "з"], ["i", "и"], ["y", "й"], ["k", "к"], ["l", "л"], ["m", "м"],
  ["n", "н"], ["o", "о"], ["p", "п"], ["r", "р"], ["s", "с"], ["t", "т"],
  ["u", "у"], ["f", "ф"], ["h", "х"], ["c", "к"], ["j", "дж"], ["q", "к"],
  ["w", "в"], ["x", "кс"],
];

export function normalizeSearchText(text: string) {
  return text
    .toLowerCase()
    .replaceAll("й", "\uE000")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("\uE000", "й")
    .replaceAll("ё", "е")
    .replace(/[^a-zа-я0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function correctKeyboardLayout(text: string) {
  const hasCyrillic = /[а-яё]/i.test(text);
  const layout = hasCyrillic ? RUSSIAN_TO_ENGLISH_LAYOUT : ENGLISH_TO_RUSSIAN_LAYOUT;
  return Array.from(text.toLowerCase(), (character) => layout[character] ?? character).join("");
}

function transliterateCyrillic(text: string) {
  return Array.from(text, (character) => CYRILLIC_TO_LATIN[character] ?? character).join("");
}

function transliterateLatin(text: string) {
  let result = "";
  let offset = 0;

  while (offset < text.length) {
    const match = LATIN_TO_CYRILLIC.find(([latin]) => text.startsWith(latin, offset));
    if (match) {
      result += match[1];
      offset += match[0].length;
      continue;
    }
    result += text[offset];
    offset += 1;
  }

  return result;
}

function createQueryVariants(query: string) {
  const normalized = normalizeSearchText(query);
  const variants = new Map<string, number>();

  const add = (value: string, penalty: number) => {
    const candidate = normalizeSearchText(value);
    if (!candidate) return;
    const currentPenalty = variants.get(candidate);
    if (currentPenalty === undefined || penalty < currentPenalty) variants.set(candidate, penalty);
  };

  add(normalized, 0);
  add(correctKeyboardLayout(query), 240);
  if (/[а-яё]/i.test(query)) add(transliterateCyrillic(normalized), 290);
  if (/[a-z]/i.test(query)) add(transliterateLatin(normalized), 290);

  return Array.from(variants, ([value, penalty]): QueryVariant => ({ value, penalty }));
}

function providerIdentityCount(item: SearchCatalogItem) {
  return Number(Boolean(item.tmdbId)) + Number(Boolean(item.imdbId)) + Number(Boolean(item.kinopoiskId));
}

function preferRepresentative<T extends SearchCatalogItem>(current: T, candidate: T, identityKey: string) {
  const currentIsCanonicalTarget = current.canonicalMovieId === identityKey;
  const candidateIsCanonicalTarget = candidate.canonicalMovieId === identityKey;
  if (currentIsCanonicalTarget !== candidateIsCanonicalTarget) return candidateIsCanonicalTarget;

  const currentProviderCount = providerIdentityCount(current);
  const candidateProviderCount = providerIdentityCount(candidate);
  if (currentProviderCount !== candidateProviderCount) return candidateProviderCount > currentProviderCount;

  if (current.rating !== candidate.rating) return candidate.rating > current.rating;
  return candidate.id < current.id;
}

function identityKeyFor(item: SearchCatalogItem) {
  if (item.canonicalMovieId) {
    return `canonical:${resolveSearchCanonicalMovieId(String(item.canonicalMovieId))}`;
  }

  // Missing canonical identity is deliberately unique. Similar titles must not
  // collapse into one result without a confirmed identity.
  return `unresolved:${item.id}:${item.slug}`;
}

export function dedupeSearchCatalog<T extends SearchCatalogItem>(items: readonly T[]) {
  const groups = new Map<string, SearchGroup<T>>();

  for (const item of items) {
    const identityKey = identityKeyFor(item);
    const resolvedCanonicalId = identityKey.startsWith("canonical:")
      ? identityKey.slice("canonical:".length)
      : identityKey;
    const aliases = [item.title, item.originalTitle, ...item.searchTitles, item.slug];
    const current = groups.get(identityKey);

    if (!current) {
      groups.set(identityKey, {
        identityKey,
        representative: item,
        aliases: new Set(aliases),
      });
      continue;
    }

    aliases.forEach((alias) => current.aliases.add(alias));
    if (preferRepresentative(current.representative, item, resolvedCanonicalId)) {
      current.representative = item;
    }
  }

  return Array.from(groups.values());
}

function levenshteinDistance(first: string, second: string, maxDistance: number) {
  if (Math.abs(first.length - second.length) > maxDistance) return maxDistance + 1;
  let previous = Array.from({ length: second.length + 1 }, (_, index) => index);

  for (let firstIndex = 1; firstIndex <= first.length; firstIndex += 1) {
    const current = [firstIndex];
    let rowMinimum = current[0];
    for (let secondIndex = 1; secondIndex <= second.length; secondIndex += 1) {
      const substitution = previous[secondIndex - 1] + Number(first[firstIndex - 1] !== second[secondIndex - 1]);
      current[secondIndex] = Math.min(
        previous[secondIndex] + 1,
        current[secondIndex - 1] + 1,
        substitution,
      );
      rowMinimum = Math.min(rowMinimum, current[secondIndex]);
    }
    if (rowMinimum > maxDistance) return maxDistance + 1;
    previous = current;
  }

  return previous[second.length];
}

function fuzzyDistance(query: string, candidate: string) {
  if (query.length < 4) return null;
  const maxDistance = query.length <= 6 ? 1 : 2;
  const candidates = query.includes(" ") ? [candidate] : [candidate, ...candidate.split(" ")];
  let best = maxDistance + 1;

  for (const value of candidates) {
    if (value.length < 4) continue;
    best = Math.min(best, levenshteinDistance(query, value, maxDistance));
  }

  return best <= maxDistance ? best : null;
}

function scoreName(candidate: string, query: QueryVariant, namePenalty: number) {
  const value = normalizeSearchText(candidate);
  if (!value) return 0;
  const penalty = query.penalty + namePenalty;

  if (value === query.value) return 1000 - penalty;
  if (value.startsWith(query.value) || value.split(" ").some((word) => word.startsWith(query.value))) {
    return 850 - penalty;
  }
  if (value.includes(query.value)) return 720 - penalty;

  const distance = fuzzyDistance(query.value, value);
  return distance === null ? 0 : 560 - penalty - distance * 45;
}

function scoreGroup<T extends SearchCatalogItem>(group: SearchGroup<T>, variants: QueryVariant[]) {
  const item = group.representative;
  const primaryNames = [item.title];
  const alternativeNames = [item.originalTitle, ...group.aliases];
  const keywordNames = [item.type, item.year, ...item.genres];
  let best = 0;

  for (const variant of variants) {
    primaryNames.forEach((name) => { best = Math.max(best, scoreName(name, variant, 0)); });
    alternativeNames.forEach((name) => { best = Math.max(best, scoreName(name, variant, 30)); });
    keywordNames.forEach((name) => {
      const value = normalizeSearchText(name);
      if (value === variant.value) best = Math.max(best, 620 - variant.penalty);
      else if (value.startsWith(variant.value)) best = Math.max(best, 540 - variant.penalty);
    });
  }

  return best;
}

export function searchCatalog<T extends SearchCatalogItem>(
  items: readonly T[],
  query: string,
  options: SearchOptions = {},
) {
  const variants = createQueryVariants(query);
  if (variants.length === 0) return [];

  return dedupeSearchCatalog(items)
    .map((group) => ({ item: group.representative, score: scoreGroup(group, variants) }))
    .filter(({ score }) => score > 0)
    .sort((first, second) => {
      if (first.score !== second.score) return second.score - first.score;
      if (first.item.rating !== second.item.rating) return second.item.rating - first.item.rating;
      return first.item.title.localeCompare(second.item.title, "ru");
    })
    .slice(0, options.limit ?? 24)
    .map(({ item }) => item);
}
