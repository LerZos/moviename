import { supabaseAdmin } from '../supabase/admin';
import { checkDuplicates } from './checkDuplicates';

type DraftRow = {
  id: string;
  title: string | null;
  slug: string | null;
  year: number | null;
  type: string | null;
  genres: string[] | null;
  poster_url: string | null;
  backdrop_url: string | null;
  tmdb_id: number | null;
  kinopoisk_id: number | null;
  imdb_id: string | null;
  long_description: string | null;
  seo_title: string | null;
  seo_description: string | null;
  faq: unknown[] | null;
  trailer_confidence: number | null;
};

function jsonArrayLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

export async function moderateDraft(draftId: string) {
  const { data: draft, error } = await supabaseAdmin
    .from('movie_drafts')
    .select('*')
    .eq('id', draftId)
    .single();

  if (error) throw error;

  const row = draft as DraftRow;
  const notes: string[] = [];
  let score = 100;

  const penalize = (points: number, message: string) => {
    score -= points;
    notes.push(message);
  };

  if (!row.title) penalize(20, 'Нет title');
  if (!row.slug) penalize(20, 'Нет slug');
  if (!row.year) penalize(10, 'Нет year');
  if (!row.type) penalize(10, 'Нет type');
  if (jsonArrayLength(row.genres) === 0) penalize(10, 'Нет genre');
  if (!row.poster_url && !row.backdrop_url) penalize(10, 'Нет poster_url или backdrop_url');

  if (!row.long_description) {
    penalize(20, 'Нет long_description');
  } else if (row.long_description.length < 700 || row.long_description.length > 1000) {
    penalize(15, 'long_description должен быть 700–1000 символов');
  }

  if (!row.seo_title) penalize(10, 'Нет seo_title');
  if (row.seo_title && row.seo_title.length > 80) penalize(5, 'seo_title слишком длинный');

  if (!row.seo_description) {
    penalize(10, 'Нет seo_description');
  } else if (row.seo_description.length < 80 || row.seo_description.length > 180) {
    penalize(5, 'seo_description лучше держать в диапазоне 80–180 символов');
  }

  if (jsonArrayLength(row.faq) === 0) penalize(10, 'FAQ пустой');

  if ((row.trailer_confidence ?? 0) < 70) {
    penalize(10, 'trailer_confidence ниже 70 — нужна ручная проверка');
  }

  const duplicate = await checkDuplicates({
    tmdbId: row.tmdb_id,
    kinopoiskId: row.kinopoisk_id,
    imdbId: row.imdb_id,
    slug: row.slug,
  });

  if (duplicate.isDuplicate && duplicate.draftId !== row.id) {
    penalize(40, duplicate.reason ?? 'Найден дубль');
  }

  const qualityScore = Math.max(0, Math.min(100, score));
  const status = qualityScore >= 90 ? 'ready' : qualityScore >= 70 ? 'needs_review' : 'rejected';

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('movie_drafts')
    .update({
      status,
      quality_score: qualityScore,
      moderation_notes: notes.length ? notes.join('\n') : 'OK',
    })
    .eq('id', draftId)
    .select('*')
    .single();

  if (updateError) throw updateError;

  return updated;
}
