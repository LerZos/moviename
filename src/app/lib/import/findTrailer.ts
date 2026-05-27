import type { MovieFacts, TrailerResult } from './types';

type TmdbVideo = {
  key?: string;
  name?: string;
  site?: string;
  type?: string;
  official?: boolean;
  iso_639_1?: string;
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, ' ').trim();
}

function scoreTmdbVideo(video: TmdbVideo, facts: MovieFacts): number {
  let score = 0;
  const name = normalize(video.name ?? '');
  const title = normalize(facts.title);
  const originalTitle = facts.originalTitle ? normalize(facts.originalTitle) : '';

  if (video.site === 'YouTube') score += 35;
  if (video.type === 'Trailer') score += 30;
  if (video.official === true) score += 20;
  if (video.iso_639_1 === 'ru' || video.iso_639_1 === 'en') score += 5;
  if (title && name.includes(title)) score += 10;
  if (originalTitle && name.includes(originalTitle)) score += 10;

  return Math.min(score, 100);
}

export function findTrailer(facts: MovieFacts): TrailerResult {
  const tmdbVideos = ((facts.rawJson.tmdb as { videos?: { results?: TmdbVideo[] } } | undefined)?.videos?.results ?? [])
    .filter((video) => video.site === 'YouTube' && video.key)
    .filter((video) => video.type === 'Trailer');

  const ranked = tmdbVideos
    .map((video) => ({ video, score: scoreTmdbVideo(video, facts) }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];

  if (!best?.video.key) {
    return {
      provider: null,
      key: null,
      url: null,
      embedUrl: null,
      source: null,
      confidence: 0,
      status: 'missing',
    };
  }

  const confidence = best.score;

  return {
    provider: 'youtube',
    key: best.video.key,
    url: `https://www.youtube.com/watch?v=${best.video.key}`,
    embedUrl: `https://www.youtube.com/embed/${best.video.key}`,
    source: 'tmdb_videos',
    confidence,
    status: confidence >= 80 ? 'accepted' : 'needs_review',
  };
}
