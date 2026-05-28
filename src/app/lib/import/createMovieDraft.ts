import { supabaseAdmin } from '../supabase/admin';
import { checkDuplicates } from './checkDuplicates';
import { fetchMovieFacts } from './fetchMovieFacts';
import { findTrailer } from './findTrailer';
import { generateSlug } from './generateSlug';
import type { ImportCandidate } from './types';

export async function createMovieDraft(candidate: ImportCandidate) {
  await supabaseAdmin
    .from('import_candidates')
    .update({ status: 'processing' })
    .eq('id', candidate.id);

  const facts = await fetchMovieFacts(candidate);
  const slug = generateSlug(facts.title, facts.year);
  const duplicate = await checkDuplicates({
    tmdbId: facts.tmdbId,
    kinopoiskId: facts.kinopoiskId,
    imdbId: facts.imdbId,
    slug,
  });

  if (duplicate.isDuplicate) {
    await supabaseAdmin
      .from('import_candidates')
      .update({ status: 'duplicate' })
      .eq('id', candidate.id);

    return { created: false, duplicate };
  }

  const trailer = findTrailer(facts);

  const { data, error } = await supabaseAdmin
    .from('movie_drafts')
    .insert({
      title: facts.title,
      original_title: facts.originalTitle,
      slug,
      year: facts.year,
      type: facts.type,
      genres: facts.genres,
      poster_url: facts.posterUrl,
      backdrop_url: facts.backdropUrl,
      tmdb_id: facts.tmdbId,
      kinopoisk_id: facts.kinopoiskId,
      imdb_id: facts.imdbId,
      actors: facts.actors,
      directors: facts.directors,
      description: facts.description,
      long_description: null,
      seo_title: null,
      seo_description: null,
      faq: [],
      trailer_provider: trailer.provider,
      trailer_key: trailer.key,
      trailer_url: trailer.url,
      trailer_embed_url: trailer.embedUrl,
      trailer_source: trailer.source,
      trailer_confidence: trailer.confidence,
      trailer_status: trailer.status,
      similar_movie_ids: [],
      source: facts.source,
      raw_json: {
        ...facts.rawJson,
        kinoluma: {
          ...(facts.rawJson.kinoluma && typeof facts.rawJson.kinoluma === 'object' && !Array.isArray(facts.rawJson.kinoluma)
            ? facts.rawJson.kinoluma
            : {}),
          players: [],
        },
      },
      status: 'needs_ai_seo',
      quality_score: null,
      moderation_notes: null,
    })
    .select('*')
    .single();

  if (error) {
    await supabaseAdmin
      .from('import_candidates')
      .update({ status: 'failed' })
      .eq('id', candidate.id);

    throw error;
  }

  await supabaseAdmin
    .from('import_candidates')
    .update({ status: 'drafted' })
    .eq('id', candidate.id);

  return { created: true, draft: data };
}
