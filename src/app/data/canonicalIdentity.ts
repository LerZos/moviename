import {
  canonicalMovieRegistry,
  type CanonicalContentType,
  type CanonicalMovieId,
  type TmdbNamespace,
} from "./generatedCanonicalMovieRegistry";

export type CanonicalMovieIdentity = {
  canonicalMovieId: CanonicalMovieId;
  slug: string;
  legacyNumericId: number;
  contentType: CanonicalContentType;
  tmdbNamespace: TmdbNamespace;
  tmdbId: number | null;
  imdbId: string | null;
  kinopoiskId: number | null;
};

export type CanonicalIdentityResolution =
  | { status: "resolved"; identity: CanonicalMovieIdentity; matchedBy: string }
  | {
      status: "ambiguous";
      candidates: CanonicalMovieIdentity[];
      matchedBy: string;
    }
  | { status: "not_found"; matchedBy: string };

const identities: CanonicalMovieIdentity[] = canonicalMovieRegistry.map(
  ([
    canonicalMovieId,
    slug,
    legacyNumericId,
    contentType,
    tmdbNamespace,
    tmdbId,
    imdbId,
    kinopoiskId,
  ]) => ({
    canonicalMovieId,
    slug,
    legacyNumericId,
    contentType,
    tmdbNamespace,
    tmdbId,
    imdbId,
    kinopoiskId,
  }),
);

function groupBy<T>(items: T[], keyOf: (item: T) => string | null) {
  const result = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    if (!key) continue;
    const group = result.get(key) ?? [];
    group.push(item);
    result.set(key, group);
  }
  return result;
}

const byCanonicalMovieId = new Map(
  identities.map((identity) => [identity.canonicalMovieId, identity]),
);
const bySlug = new Map(identities.map((identity) => [identity.slug, identity]));
const byLegacyNumericId = groupBy(identities, (identity) =>
  String(identity.legacyNumericId),
);
const byExternalAlias = groupBy(identities, (identity) => {
  if (identity.tmdbId) {
    return `tmdb:${identity.tmdbNamespace}:${identity.tmdbId}`;
  }
  return null;
});

for (const identity of identities) {
  if (identity.imdbId) {
    const key = `imdb:${identity.imdbId.toLowerCase()}`;
    const group = byExternalAlias.get(key) ?? [];
    group.push(identity);
    byExternalAlias.set(key, group);
  }
  if (identity.kinopoiskId) {
    const key = `kinopoisk:${identity.kinopoiskId}`;
    const group = byExternalAlias.get(key) ?? [];
    group.push(identity);
    byExternalAlias.set(key, group);
  }
}

function resolveCandidates(
  candidates: CanonicalMovieIdentity[] | undefined,
  matchedBy: string,
  contextSlug?: string,
): CanonicalIdentityResolution {
  if (!candidates?.length) return { status: "not_found", matchedBy };
  if (candidates.length === 1) {
    return { status: "resolved", identity: candidates[0], matchedBy };
  }
  if (contextSlug) {
    const contextualCandidate = candidates.find(
      (candidate) => candidate.slug === contextSlug,
    );
    if (contextualCandidate) {
      return {
        status: "resolved",
        identity: contextualCandidate,
        matchedBy: `${matchedBy}+slug`,
      };
    }
  }
  return { status: "ambiguous", candidates, matchedBy };
}

export function getCanonicalIdentityById(canonicalMovieId: CanonicalMovieId) {
  return byCanonicalMovieId.get(canonicalMovieId) ?? null;
}

export function getCanonicalIdentityBySlug(slug: string) {
  return bySlug.get(slug) ?? null;
}

export function requireCanonicalMovieIdBySlug(slug: string): CanonicalMovieId {
  const identity = getCanonicalIdentityBySlug(slug);
  if (!identity) throw new Error(`Canonical identity is missing for slug: ${slug}`);
  return identity.canonicalMovieId;
}

export function resolveCanonicalIdentityFromLegacyId(
  legacyNumericId: number,
  contextSlug?: string,
): CanonicalIdentityResolution {
  return resolveCandidates(
    byLegacyNumericId.get(String(legacyNumericId)),
    `legacy:${legacyNumericId}`,
    contextSlug,
  );
}

export function resolveCanonicalIdentityFromTmdb(
  namespace: TmdbNamespace,
  tmdbId: number,
  contextSlug?: string,
): CanonicalIdentityResolution {
  return resolveCandidates(
    byExternalAlias.get(`tmdb:${namespace}:${tmdbId}`),
    `tmdb:${namespace}:${tmdbId}`,
    contextSlug,
  );
}

export function resolveCanonicalIdentityFromImdb(
  imdbId: string,
  contextSlug?: string,
): CanonicalIdentityResolution {
  const normalized = imdbId.trim().toLowerCase();
  return resolveCandidates(
    byExternalAlias.get(`imdb:${normalized}`),
    `imdb:${normalized}`,
    contextSlug,
  );
}

export function resolveCanonicalIdentityFromKinopoisk(
  kinopoiskId: number,
  contextSlug?: string,
): CanonicalIdentityResolution {
  return resolveCandidates(
    byExternalAlias.get(`kinopoisk:${kinopoiskId}`),
    `kinopoisk:${kinopoiskId}`,
    contextSlug,
  );
}

export function getCanonicalMovieRegistry() {
  return identities;
}

export type { CanonicalMovieId, TmdbNamespace };
