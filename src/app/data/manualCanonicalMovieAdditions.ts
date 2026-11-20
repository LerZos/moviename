import type { CanonicalMovieRegistryTuple } from "./generatedCanonicalMovieRegistry";

// Manually curated identities extend the generated registry without editing its snapshot.
export const manualCanonicalMovieAdditions = [
  ["67e2e79f-51f9-417a-8a1f-04e4e926ebd4", "the-100-2014", 950001, "series", "tv", 48866, "tt2661044", 733493],
  ["64733e2f-9605-4b4f-80de-88f3e0c374bb", "buddy-2026", 950002, "film", "movie", 1514026, "tt37281055", 8549783],
] as const satisfies readonly CanonicalMovieRegistryTuple[];
