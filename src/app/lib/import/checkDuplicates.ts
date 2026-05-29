import { findDuplicateMovie, type DuplicateMatch } from './duplicateGuard';

type DuplicateInput = {
  tmdbId?: number | null;
  kinopoiskId?: number | null;
  imdbId?: string | null;
  slug?: string | null;
  title?: string | null;
  originalTitle?: string | null;
  year?: number | string | null;
  excludeDraftId?: string | null;
};

export type DuplicateResult = {
  isDuplicate: boolean;
  reason: string | null;
  draftId: string | null;
  matchedSource?: DuplicateMatch['matchedSource'];
  matchedTitle?: string | null;
  matchedSlug?: string | null;
  matchedField?: string | null;
};

export async function checkDuplicates(input: DuplicateInput): Promise<DuplicateResult> {
  const duplicate = await findDuplicateMovie(input);

  if (!duplicate.isDuplicate) {
    return { isDuplicate: false, reason: null, draftId: null };
  }

  return {
    isDuplicate: true,
    reason: duplicate.reason,
    draftId: duplicate.matchedSource === 'movie_draft' && duplicate.matchedId
      ? String(duplicate.matchedId)
      : null,
    matchedSource: duplicate.matchedSource,
    matchedTitle: duplicate.matchedTitle,
    matchedSlug: duplicate.matchedSlug,
    matchedField: duplicate.matchedField,
  };
}
