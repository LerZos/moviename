import { revalidatePath } from 'next/cache';

import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { assertAdminSecret } from '../../../../lib/import/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type DraftAction =
  | 'reject'
  | 'wrong_trailer'
  | 'bad_description'
  | 'duplicate'
  | 'mark_ready'
  | 'publish_safe_click';

type PublishDraftCheckRow = Record<string, unknown> & {
  title?: string | null;
  year?: number | string | null;
  raw_json?: unknown;
  poster_url?: string | null;
  backdrop_url?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function getNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;

  const parsed = Number(value.replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function getMovieRatingFromRawJson(rawJson: unknown) {
  const raw = asRecord(rawJson);
  const tmdb = asRecord(raw.tmdb);
  const kinopoisk = asRecord(raw.kinopoisk);
  const candidate = asRecord(raw.candidate);
  const kinopoiskRating = asRecord(kinopoisk.rating);
  const kpRating = getNumber(kinopoiskRating.kp);
  const imdbRating = getNumber(kinopoiskRating.imdb);
  const tmdbRating = getNumber(tmdb.vote_average) ?? getNumber(candidate.vote_average);
  const tmdbVoteCount = getNumber(tmdb.vote_count) ?? getNumber(candidate.vote_count) ?? 0;

  if (kpRating && kpRating > 0) return kpRating;
  if (imdbRating && imdbRating > 0) return imdbRating;
  if (tmdbRating && tmdbRating > 0 && tmdbVoteCount > 0) return tmdbRating;

  return 0;
}

function getPublishBlockReason(draft: PublishDraftCheckRow) {
  const title = typeof draft.title === 'string' ? draft.title : 'черновик';
  const year = getNumber(draft.year);
  const currentYear = new Date().getFullYear();
  const rating = getMovieRatingFromRawJson(draft.raw_json);

  if (!draft.poster_url && !draft.backdrop_url) {
    return `Нельзя опубликовать «${title}»: нет постера или backdrop.`;
  }

  if (year && year > currentYear) {
    return `Нельзя опубликовать «${title}»: релиз ещё не вышел, поэтому рейтинга нормально нет.`;
  }

  if (!rating || rating <= 0) {
    return `Нельзя опубликовать «${title}»: нет настоящего рейтинга из TMDB/Kinopoisk. Лучше оставить на проверке, а не выпускать пустую карточку.`;
  }

  return null;
}

function buildActionUpdate(action: DraftAction, reason: string | null) {
  const note = reason?.trim() || null;

  if (action === 'reject') {
    return {
      update: {
        status: 'rejected',
        moderation_notes: note || 'Отклонено вручную в админке',
      },
      decision: 'reject',
    };
  }

  if (action === 'wrong_trailer') {
    return {
      update: {
        status: 'needs_review',
        trailer_status: 'needs_review',
        trailer_confidence: 0,
        moderation_notes: note || 'Неверный трейлер — нужна ручная проверка',
      },
      decision: 'wrong_trailer',
    };
  }

  if (action === 'bad_description') {
    return {
      update: {
        status: 'needs_review',
        moderation_notes: note || 'Плохое описание — нужна ручная правка',
      },
      decision: 'bad_description',
    };
  }

  if (action === 'duplicate') {
    return {
      update: {
        status: 'rejected',
        moderation_notes: note || 'Дубль — отклонено вручную',
      },
      decision: 'duplicate',
    };
  }

  if (action === 'mark_ready') {
    return {
      update: {
        status: 'ready',
        moderation_notes: note || 'Помечено как готовое вручную',
      },
      decision: 'mark_ready',
    };
  }

  return {
    update: {
      status: 'published',
      moderation_notes: note || 'Опубликовано вручную из админки импорта',
    },
    decision: 'publish',
  };
}

export async function POST(request: Request) {
  const authError = assertAdminSecret(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const draftId = typeof body.draftId === 'string' ? body.draftId : null;
    const action = typeof body.action === 'string' ? (body.action as DraftAction) : null;
    const reason = typeof body.reason === 'string' ? body.reason : null;

    const allowedActions: DraftAction[] = [
      'reject',
      'wrong_trailer',
      'bad_description',
      'duplicate',
      'mark_ready',
      'publish_safe_click',
    ];

    if (!draftId || !action || !allowedActions.includes(action)) {
      return Response.json(
        { ok: false, error: 'draftId and valid action are required' },
        { status: 400 },
      );
    }

    if (action === 'publish_safe_click') {
      const { data: draftForPublish, error: draftForPublishError } = await supabaseAdmin
        .from('movie_drafts')
        .select('title, year, raw_json, poster_url, backdrop_url')
        .eq('id', draftId)
        .single();

      if (draftForPublishError) throw draftForPublishError;

      const publishBlockReason = getPublishBlockReason(draftForPublish as PublishDraftCheckRow);

      if (publishBlockReason) {
        return Response.json({ ok: false, error: publishBlockReason }, { status: 400 });
      }
    }

    const { update, decision } = buildActionUpdate(action, reason);

    let updatedDraft = null;

    if (Object.keys(update).length > 0) {
      const { data, error } = await supabaseAdmin
        .from('movie_drafts')
        .update(update)
        .eq('id', draftId)
        .select('*')
        .single();

      if (error) throw error;
      updatedDraft = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('movie_drafts')
        .select('*')
        .eq('id', draftId)
        .single();

      if (error) throw error;
      updatedDraft = data;
    }

    const { error: feedbackError } = await supabaseAdmin.from('agent_feedback').insert({
      draft_id: draftId,
      agent_name: 'admin_dashboard',
      decision,
      reason:
        action === 'publish_safe_click'
          ? reason || 'Черновик опубликован вручную через админку импорта.'
          : reason,
      before_value: null,
      after_value: update,
    });

    if (feedbackError) throw feedbackError;

    if (action === 'publish_safe_click') {
      const catalogSlugByDraftType: Record<string, string> = {
        film: 'films',
        movie: 'films',
        series: 'series',
        tv: 'series',
        anime: 'anime',
        cartoon: 'cartoons',
        documentary: 'documentaries',
      };
      const draftType = typeof updatedDraft?.type === 'string' ? updatedDraft.type : 'film';
      const catalogSlug = catalogSlugByDraftType[draftType] || 'films';

      revalidatePath('/');
      revalidatePath(`/catalog/${catalogSlug}`);
      revalidatePath('/sitemap.xml');

      if (updatedDraft?.slug) {
        revalidatePath(`/movie/${updatedDraft.slug}`);
      }
    }

    return Response.json({
      ok: true,
      draft: updatedDraft,
      message:
        action === 'publish_safe_click'
          ? 'Черновик опубликован. Фильм появится на публичной странице, в каталоге и sitemap после обновления кэша.'
          : 'Действие выполнено',
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown draft action error',
      },
      { status: 500 },
    );
  }
}
