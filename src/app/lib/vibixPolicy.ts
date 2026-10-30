import "server-only";
import type { Movie, PlayerProvider } from "../data/movies";
import { getCanonicalIdentityBySlug } from "../data/canonicalIdentity";
import verifiedMappings from "../data/verifiedVibixMappings.json";
import { isUsableSavedPlayer, isVibixPlayer, isVibixSdkPlayer, normalizeVibixKind, parseVibixId, stablePlayerKey, type VibixPlan, type VibixProvenance } from "./vibix";

// No title matching, slug-to-provider guesses, credentials or network.
export function prepareVibixPlan(movie: Movie): VibixPlan {
  const movieKey = `${movie.canonicalMovieId || movie.id}:${movie.slug}`;
  const saved = (movie.players || []).filter(isVibixPlayer).filter(isUsableSavedPlayer);
  const plan = (status: VibixPlan["status"], players: PlayerProvider[] = []): VibixPlan => ({ movieKey, status, players });
  const identity = getCanonicalIdentityBySlug(movie.slug);
  if (!identity || !movie.canonicalMovieId) return plan("unverified_identity", saved);
  const contentTypes = { film: "Фильм", series: "Сериал", anime: "Аниме", cartoon: "Мультфильм", documentary: "Документальный" };
  if (identity.canonicalMovieId !== movie.canonicalMovieId || contentTypes[identity.contentType] !== movie.type ||
    (movie.tmdbNamespace != null && movie.tmdbNamespace !== identity.tmdbNamespace) ||
    (movie.tmdbId != null && movie.tmdbId !== identity.tmdbId) ||
    (movie.kinopoiskId != null && movie.kinopoiskId !== identity.kinopoiskId) ||
    (movie.imdbId != null && movie.imdbId.toLowerCase() !== identity.imdbId?.toLowerCase())) return plan("identity_conflict");
  const kind = identity.tmdbNamespace === "tv" ? "series" : "movie";
  const verified: PlayerProvider[] = [];
  const externalSaved: PlayerProvider[] = [];
  const unknown: PlayerProvider[] = [];
  for (const player of saved) {
    const record = player as PlayerProvider & { vibixProvenance?: VibixProvenance };
    const sdkKind = normalizeVibixKind(player.contentType || kind);
    if (isVibixSdkPlayer(player) && (
      ((sdkKind === "movie" || sdkKind === "series") && sdkKind !== kind) ||
      (sdkKind === "kp" && parseVibixId("kp", player.contentId) !== String(identity.kinopoiskId)) ||
      (sdkKind === "imdb" && parseVibixId("imdb", player.contentId) !== identity.imdbId?.toLowerCase())
    )) return plan("identity_conflict");
    const proof = record.vibixProvenance;
    if (proof?.source === "manual-verified") {
      if (proof.canonicalMovieId !== movie.canonicalMovieId || proof.slug !== movie.slug ||
        proof.contentType !== kind || proof.playerKey !== stablePlayerKey(player)) return plan("identity_conflict");
      verified.push(player);
      continue;
    }
    if (isVibixSdkPlayer(player) && (sdkKind === "kp" || sdkKind === "imdb") &&
      (player.publisherId || "678053396") === "678053396") {
      externalSaved.push(player);
      continue;
    }
    const curated = verifiedMappings.some((mapping) =>
      mapping.canonicalMovieId === movie.canonicalMovieId && mapping.slug === movie.slug &&
      mapping.year === movie.year && mapping.kinopoiskId === identity.kinopoiskId &&
      mapping.imdbId === identity.imdbId && mapping.tmdbId === identity.tmdbId &&
      mapping.tmdbNamespace === identity.tmdbNamespace && isVibixSdkPlayer(player) &&
      player.contentType === mapping.contentType && player.contentId === mapping.contentId &&
      (player.publisherId || "678053396") === mapping.publisherId);
    if (curated) verified.push(player);
    else if (proof?.source !== "legacy-generated") unknown.push(player);
  }
  if (verified.length) return plan("verified", [...verified, ...externalSaved, ...unknown]);
  // Missing provenance is NOT evidence of automation or manual verification.
  // Preserve these records and defer migration to an explicit review.
  if (unknown.length) return plan("legacy_unverified", [...unknown, ...externalSaved]);
  if (externalSaved.length) return plan("external", externalSaved);
  const kp = parseVibixId("kp", identity.kinopoiskId);
  const imdb = parseVibixId("imdb", identity.imdbId);
  if (!kp && !imdb) return plan("unavailable");
  const contentType = kp ? "kp" : "imdb";
  const contentId = kp || imdb;
  return plan("external", [{
    id: `vibix-${contentType}-${contentId}`, name: "Vibix", type: "rendex", provider: "rendex",
    embedUrl: "", publisherId: "678053396", contentType, contentId,
  }]);
}
