import type { CanonicalMovieRegistryTuple } from "./generatedCanonicalMovieRegistry";

// Manually curated identities extend the generated registry without editing its snapshot.
export const manualCanonicalMovieAdditions = [
  ["67e2e79f-51f9-417a-8a1f-04e4e926ebd4", "the-100-2014", 950001, "series", "tv", 48866, "tt2661044", 733493],
] as const satisfies readonly CanonicalMovieRegistryTuple[];
