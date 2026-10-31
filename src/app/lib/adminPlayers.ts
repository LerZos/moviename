import type { Movie, PlayerProvider } from "../data/movies";
import { parsePlayerText, playersToText } from "./players";
import { isUsableSavedPlayer, isVibixPlayer, stablePlayerKey, type VibixProvenance } from "./vibix";

// Shared with the actual editor; do not maintain a second permissive ID parser.
export function serializeAdminPlayers(players: unknown, movieType = ""): string {
  if (!Array.isArray(players)) return "";
  return playersToText(players.map((player: PlayerProvider) =>
    player.type === "rendex" && !player.contentType
      ? { ...player, contentType: movieType === "Сериал" ? "series" : "movie" }
      : player));
}

export function parseAdminPlayers(
  value: unknown, movieType = "", original: PlayerProvider[] = [],
  verification?: Pick<Movie, "canonicalMovieId" | "slug" | "type" | "tmdbNamespace">,
): PlayerProvider[] {
  if (typeof value !== "string") return [];
  if (!verification && value === serializeAdminPlayers(original, movieType)) return original;
  const parsed = value.split("\n").filter((line) => line.trim()).flatMap((line) => {
    // Keep legacy compact IDs, with the editor's explicit movie/series context.
    const parts = line.split("|").map((part) => part.trim());
    const text = parts.length === 3 && parts[1] === "rendex" && /^[1-9]\d*$/.test(parts[2])
      ? `${parts[0]} | rendex | ${movieType === "Сериал" ? "series" : "movie"} | ${parts[2]}` : line;
    const result = parsePlayerText(text);
    if (result.length !== 1 || (isVibixPlayer(result[0]) && !isUsableSavedPlayer(result[0]))) {
      throw new Error("Некорректная строка плеера. Проверьте тип, ID и URL; сохранение отменено.");
    }
    return result;
  });
  // Saved records the editor text cannot express (legacy or disabled) are kept as-is, never silently dropped,
  // unless the admin re-entered the same player, which is then restored from it below.
  const parsedKeys = new Set(parsed.map(stablePlayerKey));
  const unrepresented = original.filter((player) => !playersToText([player]) && !parsedKeys.has(stablePlayerKey(player)));
  return [...parsed.map((player) => {
    const existing = original.find((item) => stablePlayerKey(item) === stablePlayerKey(player));
    // Preserve styles, provenance and alternative providers on text round-trip.
    const restored = existing ? { ...player, ...existing, name: player.name } : player;
    if (!verification || !isVibixPlayer(restored)) return restored;
    if (!verification.canonicalMovieId) throw new Error("Для подтверждения Vibix нужна canonical identity.");
    if (!isUsableSavedPlayer(restored)) throw new Error("Отключённую привязку нельзя подтвердить автоматически.");
    const vibixProvenance: VibixProvenance = {
      source: "manual-verified", canonicalMovieId: verification.canonicalMovieId,
      slug: verification.slug,
      contentType: verification.tmdbNamespace === "tv" || verification.type === "Сериал" ? "series" : "movie",
      playerKey: stablePlayerKey(restored),
    };
    return { ...restored, vibixProvenance };
  }), ...unrepresented];
}
