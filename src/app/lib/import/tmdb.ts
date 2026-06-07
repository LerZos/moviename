import { IMAGE_SOURCE_LINKS, buildTmdbImageUrl } from '../imageLinks';

const TMDB_BASE_URL = IMAGE_SOURCE_LINKS.tmdbApiBase;

export function tmdbImage(path: string | null | undefined, size: 'w500' | 'w780' | 'original' = 'w500'): string | null {
  if (!path) return null;
  return buildTmdbImageUrl(path, size);
}

export async function tmdbFetch<T>(path: string): Promise<T> {
  const token = process.env.TMDB_ACCESS_TOKEN;

  if (!token) {
    throw new Error('Missing TMDB_ACCESS_TOKEN');
  }

  const url = path.startsWith('http') ? path : `${TMDB_BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      accept: 'application/json',
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`TMDB request failed: ${response.status} ${text}`);
  }

  return response.json() as Promise<T>;
}
