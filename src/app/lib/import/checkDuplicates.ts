import { movies } from '../../data/movies';
import { supabaseAdmin } from '../supabase/admin';

type DuplicateInput = {
  tmdbId?: number | null;
  kinopoiskId?: number | null;
  imdbId?: string | null;
  slug?: string | null;
};

export type DuplicateResult = {
  isDuplicate: boolean;
  reason: string | null;
  draftId: string | null;
};

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isDuplicateInStaticMovies(input: DuplicateInput) {
  const slug = normalizeString(input.slug);
  const imdbId = normalizeString(input.imdbId);

  return movies.some((movie) => {
    const movieRecord = movie as typeof movie & { tmdbId?: number; imdbId?: string };

    if (slug && normalizeString(movie.slug) === slug) return true;
    if (input.kinopoiskId && movie.kinopoiskId === input.kinopoiskId) return true;
    if (input.tmdbId && movieRecord.tmdbId === input.tmdbId) return true;
    if (imdbId && normalizeString(movieRecord.imdbId) === imdbId) return true;

    return false;
  });
}

export async function checkDuplicates(input: DuplicateInput): Promise<DuplicateResult> {
  if (isDuplicateInStaticMovies(input)) {
    return {
      isDuplicate: true,
      reason: 'Duplicate in src/app/data/movies.ts',
      draftId: null,
    };
  }

  const checks: Array<{ column: string; value: string | number | null | undefined; label: string }> = [
    { column: 'tmdb_id', value: input.tmdbId, label: 'tmdb_id' },
    { column: 'kinopoisk_id', value: input.kinopoiskId, label: 'kinopoisk_id' },
    { column: 'imdb_id', value: input.imdbId, label: 'imdb_id' },
    { column: 'slug', value: input.slug, label: 'slug' },
  ];

  for (const check of checks) {
    if (check.value === null || check.value === undefined || check.value === '') continue;

    const { data, error } = await supabaseAdmin
      .from('movie_drafts')
      .select('id,title,status')
      .eq(check.column, check.value)
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      return {
        isDuplicate: true,
        reason: `Duplicate by ${check.label}`,
        draftId: data.id as string,
      };
    }
  }

  return { isDuplicate: false, reason: null, draftId: null };
}
