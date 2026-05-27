const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export function tmdbImage(path: string | null | undefined, size: 'w500' | 'w780' | 'original' = 'w500'): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
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
