import { movies, type Movie } from '../../data/movies';
import { supabaseAdmin } from '../supabase/admin';

export type MovieOverrideData = Partial<Movie> & Record<string, unknown>;

export function getBaseMovieBySlug(slug: string) {
  return movies.find((movie) => movie.slug === slug) || null;
}

export async function getMovieOverrideData(slug: string): Promise<MovieOverrideData | null> {
  const { data, error } = await supabaseAdmin
    .from('movie_overrides')
    .select('data')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('Не удалось загрузить movie_overrides:', error.message);
    return null;
  }

  if (!data?.data || typeof data.data !== 'object') {
    return null;
  }

  return data.data as MovieOverrideData;
}

export async function getMovieWithOverrides(slug: string): Promise<Movie | null> {
  const baseMovie = getBaseMovieBySlug(slug);

  if (!baseMovie) {
    return null;
  }

  const override = await getMovieOverrideData(slug);

  if (!override) {
    return baseMovie;
  }

  return {
    ...baseMovie,
    ...override,
    id: baseMovie.id,
    slug: baseMovie.slug,
  } as Movie;
}

export async function saveMovieOverride(
  slug: string,
  data: MovieOverrideData,
  updatedBy: string,
) {
  const { error } = await supabaseAdmin
    .from('movie_overrides')
    .upsert(
      {
        slug,
        data,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'slug' },
    );

  if (error) {
    throw error;
  }
}
