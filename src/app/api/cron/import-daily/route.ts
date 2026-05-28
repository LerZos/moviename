import { assertCronSecret } from '../../../lib/import/adminAuth';
import { createMovieDraft } from '../../../lib/import/createMovieDraft';
import { discoverMovies } from '../../../lib/import/discoverMovies';
import { moderateDraft } from '../../../lib/import/moderateDraft';
import type { ImportCandidate } from '../../../lib/import/types';
import { generateTemplateMovieSeo } from '../../../lib/seo/generateTemplateMovieSeo';
import { supabaseAdmin } from '../../../lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type DailyImportLogItem = {
  message: string;
  at: string;
  [key: string]: unknown;
};

type DailyImportDraftRow = Record<string, unknown> & {
  id: string;
  raw_json?: unknown;
};

function nowIso() {
  return new Date().toISOString();
}

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

function getCandidateReleaseDate(candidate: ImportCandidate) {
  const raw = asRecord(candidate.raw_json);

  return String(raw.release_date ?? raw.first_air_date ?? '').trim();
}

function getCandidateRating(candidate: ImportCandidate) {
  const raw = asRecord(candidate.raw_json);
  const rating = getNumber(raw.vote_average);
  const voteCount = getNumber(raw.vote_count) ?? 0;

  return { rating: rating ?? 0, voteCount };
}

function getCandidateSkipReason(candidate: ImportCandidate) {
  const releaseDate = getCandidateReleaseDate(candidate);
  const { rating, voteCount } = getCandidateRating(candidate);
  const raw = asRecord(candidate.raw_json);
  const hasPoster = Boolean(raw.poster_path || raw.backdrop_path);

  if (!releaseDate) return 'Нет даты выхода в TMDB';
  if (releaseDate > new Date().toISOString().slice(0, 10)) return 'Фильм ещё не вышел';
  if (!hasPoster) return 'Нет постера или backdrop';
  if (rating < 5 || voteCount < 50) return 'Нет нормального рейтинга TMDB';

  return null;
}

async function rejectUnsafeCandidate(candidate: ImportCandidate, reason: string) {
  const raw = asRecord(candidate.raw_json);

  await supabaseAdmin
    .from('import_candidates')
    .update({
      status: 'rejected',
      raw_json: {
        ...raw,
        kinoluma_rejected_reason: reason,
        kinoluma_rejected_at: nowIso(),
      },
      updated_at: nowIso(),
    })
    .eq('id', candidate.id);
}

function readLimit(request: Request) {
  const url = new URL(request.url);
  const fromQuery = Number(url.searchParams.get('limit'));
  const fromEnv = Number(process.env.KINOLUMA_DAILY_IMPORT_LIMIT);
  const rawLimit = Number.isFinite(fromQuery) && fromQuery > 0 ? fromQuery : fromEnv;

  return Math.max(1, Math.min(Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 5, 20));
}

function mergeTemplateSeoIntoRawJson(rawJson: unknown, templateSeo: unknown) {
  const base = asRecord(rawJson);

  return {
    ...base,
    template_seo: templateSeo,
    template_seo_generated_at: nowIso(),
  };
}

async function generateFreeTemplateSeoForDraft(draftId: string) {
  const { data: draft, error: draftError } = await supabaseAdmin
    .from('movie_drafts')
    .select('*')
    .eq('id', draftId)
    .single();

  if (draftError) throw draftError;

  const draftRow = draft as DailyImportDraftRow;
  const generated = generateTemplateMovieSeo(draftRow);
  const update = {
    long_description: generated.longDescription,
    seo_title: generated.seoTitle,
    seo_description: generated.seoDescription,
    faq: generated.faq,
    raw_json: mergeTemplateSeoIntoRawJson(draftRow.raw_json, {
      provider: 'template',
      internalLinkSuggestions: generated.internalLinkSuggestions,
      auto_daily_import: true,
    }),
    status: 'needs_moderation',
    moderation_notes: null,
    updated_at: nowIso(),
  };

  const { data: updatedDraft, error: updateError } = await supabaseAdmin
    .from('movie_drafts')
    .update(update)
    .eq('id', draftId)
    .select('*')
    .single();

  if (updateError) throw updateError;

  const { error: feedbackError } = await supabaseAdmin.from('agent_feedback').insert({
    draft_id: draftId,
    agent_name: 'daily_import_template_seo_agent',
    decision: 'generated_template_seo',
    reason: 'Daily import generated free template SEO. Facts were not invented or changed.',
    before_value: {
      long_description: draftRow.long_description,
      seo_title: draftRow.seo_title,
      seo_description: draftRow.seo_description,
      faq: draftRow.faq,
      status: draftRow.status,
    },
    after_value: update,
  });

  if (feedbackError) throw feedbackError;

  return updatedDraft;
}

async function getNewCandidates(limit: number, log: DailyImportLogItem[]) {
  const { data, error } = await supabaseAdmin
    .from('import_candidates')
    .select('*')
    .eq('status', 'new')
    .order('created_at', { ascending: true })
    .limit(Math.max(limit * 12, 60));

  if (error) throw error;

  const safeCandidates: ImportCandidate[] = [];

  for (const candidate of (data ?? []) as ImportCandidate[]) {
    const skipReason = getCandidateSkipReason(candidate);

    if (skipReason) {
      await rejectUnsafeCandidate(candidate, skipReason);
      log.push({
        message: 'Candidate rejected before daily processing',
        at: nowIso(),
        candidateId: candidate.id,
        title: candidate.title,
        reason: skipReason,
      });
      continue;
    }

    safeCandidates.push(candidate);

    if (safeCandidates.length >= limit) {
      break;
    }
  }

  return safeCandidates;
}

async function createDailyRun(limit: number) {
  const { data, error } = await supabaseAdmin
    .from('movie_import_runs')
    .insert({
      status: 'running',
      log: [
        {
          message: 'Daily auto import started',
          at: nowIso(),
          limit,
        },
      ],
    })
    .select('id')
    .single();

  if (error) throw error;

  return data.id as string;
}

async function finishDailyRun(
  runId: string,
  status: 'finished' | 'failed',
  log: DailyImportLogItem[],
  foundCount: number,
  createdDraftsCount: number,
  failedCount: number,
) {
  const { error } = await supabaseAdmin
    .from('movie_import_runs')
    .update({
      status,
      finished_at: nowIso(),
      found_count: foundCount,
      created_drafts_count: createdDraftsCount,
      failed_count: failedCount,
      log,
    })
    .eq('id', runId);

  if (error) throw error;
}

export async function GET(request: Request) {
  const authError = assertCronSecret(request);
  if (authError) return authError;

  const limit = readLimit(request);
  const log: DailyImportLogItem[] = [];
  let runId: string | null = null;
  let createdDraftsCount = 0;
  let failedCount = 0;
  let readyCount = 0;
  let reviewCount = 0;
  let foundCount = 0;

  try {
    runId = await createDailyRun(limit);

    log.push({ message: 'TMDB discovery started', at: nowIso() });
    const discoveryResult = await discoverMovies();
    foundCount = discoveryResult.foundCount ?? 0;
    log.push({ message: 'TMDB discovery finished', at: nowIso(), foundCount, discoveryRunId: discoveryResult.runId });

    const candidates = await getNewCandidates(limit, log);
    log.push({ message: 'Candidates selected for daily processing', at: nowIso(), count: candidates.length });

    for (const candidate of candidates) {
      try {
        const draftResult = await createMovieDraft(candidate);
        const draftRecord = draftResult.created && 'draft' in draftResult
          ? (draftResult.draft as { id?: string; title?: string | null } | null)
          : null;

        if (!draftRecord?.id) {
          const duplicate = 'duplicate' in draftResult ? draftResult.duplicate : null;

          log.push({
            message: 'Candidate skipped',
            at: nowIso(),
            candidateId: candidate.id,
            title: candidate.title,
            duplicate,
          });
          continue;
        }

        createdDraftsCount += 1;

        const seoDraft = await generateFreeTemplateSeoForDraft(draftRecord.id);
        const moderatedDraft = await moderateDraft(draftRecord.id);
        const finalStatus = typeof moderatedDraft?.status === 'string' ? moderatedDraft.status : seoDraft?.status;

        if (finalStatus === 'ready') readyCount += 1;
        if (finalStatus === 'needs_review') reviewCount += 1;

        log.push({
          message: 'Draft prepared by daily import',
          at: nowIso(),
          candidateId: candidate.id,
          draftId: draftRecord.id,
          title: draftRecord.title,
          status: finalStatus,
        });
      } catch (candidateError) {
        failedCount += 1;
        log.push({
          message: 'Candidate processing failed',
          at: nowIso(),
          candidateId: candidate.id,
          title: candidate.title,
          error: candidateError instanceof Error ? candidateError.message : 'Unknown candidate error',
        });
      }
    }

    if (runId) {
      await finishDailyRun(runId, 'finished', log, foundCount, createdDraftsCount, failedCount);
    }

    return Response.json({
      ok: true,
      runId,
      foundCount,
      processedCandidates: candidates.length,
      createdDraftsCount,
      readyCount,
      reviewCount,
      failedCount,
      message: 'Ежедневный автоимпорт завершён. Новые карточки подготовлены как черновики, публикация остаётся ручной.',
      log,
    });
  } catch (error) {
    failedCount += 1;

    log.push({
      message: 'Daily auto import failed',
      at: nowIso(),
      error: error instanceof Error ? error.message : 'Unknown daily import error',
    });

    if (runId) {
      await finishDailyRun(runId, 'failed', log, foundCount, createdDraftsCount, failedCount).catch((finishError) => {
        console.error('[KinoLuma daily import finish error]', finishError);
      });
    }

    console.error('[KinoLuma daily import error]', error);

    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown daily import error',
        runId,
        log,
      },
      { status: 500 },
    );
  }
}
