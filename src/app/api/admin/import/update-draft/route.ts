import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { assertAdminSecret } from '../../../../lib/import/adminAuth';
import { buildAutoPlayers, extractRendexVideoId, parsePlayerText } from '../../../../lib/players';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ManualDraftValues = Record<string, unknown>;

type UpdatePayload = Record<string, unknown>;

const allowedStatuses = new Set([
  'draft',
  'needs_ai_seo',
  'needs_moderation',
  'needs_review',
  'ready',
  'published',
  'rejected',
]);

const allowedTypes = new Set(['film', 'series', 'anime', 'cartoon', 'documentary']);

function cleanText(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function cleanNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanRendexVideoId(value: unknown) {
  const id = extractRendexVideoId(value);
  return id ? Number(id) : null;
}

function cleanGenres(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value !== 'string') return [];

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function parsePlayerLinks(value: unknown) {
  return parsePlayerText(value);
}

function mergePlayerLinksIntoRawJson(rawJson: unknown, playerLinks: unknown, values: ManualDraftValues = {}) {
  const base = asRecord(rawJson);
  const kinoluma = asRecord(base.kinoluma);
  const rendexVideoId = cleanRendexVideoId(values.rendex_video_id);
  const kinopoiskId = cleanNumber(values.kinopoisk_id);
  const manualPlayers = parsePlayerLinks(playerLinks);
  const generatedPlayers = buildAutoPlayers({
    rendexVideoId,
    kinopoiskId,
    contentType: cleanText(values.type) === 'series' ? 'serial' : 'movie',
  });

  return {
    ...base,
    kinoluma: {
      ...kinoluma,
      ...(rendexVideoId !== null ? { rendex_video_id: String(rendexVideoId) } : {}),
      ...(kinopoiskId !== null ? { kinopoisk_id: String(kinopoiskId) } : {}),
      players: manualPlayers.length ? manualPlayers : generatedPlayers,
      players_updated_at: new Date().toISOString(),
    },
  };
}

function parseFaq(value: unknown) {
  if (Array.isArray(value)) return value;

  if (typeof value !== 'string') return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  const parsed = JSON.parse(trimmed) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error('FAQ must be a JSON array');
  }

  return parsed
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;

      const record = item as Record<string, unknown>;
      const question = cleanText(record.question);
      const answer = cleanText(record.answer);

      if (!question || !answer) return null;

      return { question, answer };
    })
    .filter(Boolean);
}

function buildUpdate(values: ManualDraftValues, beforeDraft: Record<string, unknown>): UpdatePayload {
  const update: UpdatePayload = {
    updated_at: new Date().toISOString(),
  };

  const textFields = [
    'title',
    'original_title',
    'slug',
    'description',
    'long_description',
    'seo_title',
    'seo_description',
    'trailer_url',
    'trailer_embed_url',
    'trailer_provider',
    'trailer_key',
    'trailer_status',
    'moderation_notes',
  ];

  textFields.forEach((field) => {
    if (field in values) {
      update[field] = cleanText(values[field]);
    }
  });

  if ('year' in values) {
    update.year = cleanNumber(values.year);
  }

  if ('kinopoisk_id' in values) {
    update.kinopoisk_id = cleanNumber(values.kinopoisk_id);
  }

  if ('trailer_confidence' in values) {
    const value = cleanNumber(values.trailer_confidence);
    update.trailer_confidence = value === null ? null : Math.max(0, Math.min(100, value));
  }

  if ('type' in values) {
    const type = cleanText(values.type);
    update.type = type && allowedTypes.has(type) ? type : type;
  }

  if ('status' in values) {
    const status = cleanText(values.status);
    update.status = status && allowedStatuses.has(status) ? status : status;
  }

  if ('genres' in values) {
    update.genres = cleanGenres(values.genres);
  }

  if ('faq_json' in values) {
    update.faq = parseFaq(values.faq_json);
  } else if ('faq' in values) {
    update.faq = parseFaq(values.faq);
  }

  if ('player_links' in values || 'rendex_video_id' in values) {
    update.raw_json = mergePlayerLinksIntoRawJson(beforeDraft.raw_json, values.player_links, values);
  }

  return update;
}

export async function POST(request: Request) {
  const authError = assertAdminSecret(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const draftId = typeof body.draftId === 'string' ? body.draftId : null;
    const values = body.values && typeof body.values === 'object' && !Array.isArray(body.values)
      ? (body.values as ManualDraftValues)
      : null;

    if (!draftId || !values) {
      return Response.json({ ok: false, error: 'draftId and values are required' }, { status: 400 });
    }

    const { data: beforeDraft, error: beforeError } = await supabaseAdmin
      .from('movie_drafts')
      .select('*')
      .eq('id', draftId)
      .single();

    if (beforeError) throw beforeError;

    const update = buildUpdate(values, beforeDraft as Record<string, unknown>);

    const { data: updatedDraft, error: updateError } = await supabaseAdmin
      .from('movie_drafts')
      .update(update)
      .eq('id', draftId)
      .select('*')
      .single();

    if (updateError) throw updateError;

    const { error: feedbackError } = await supabaseAdmin.from('agent_feedback').insert({
      draft_id: draftId,
      agent_name: 'admin_dashboard',
      decision: 'manual_edit',
      reason: 'Manual draft fields were edited in the import admin panel.',
      before_value: beforeDraft,
      after_value: update,
    });

    if (feedbackError) throw feedbackError;

    return Response.json({
      ok: true,
      draft: updatedDraft,
      message: 'Черновик обновлён вручную',
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown manual draft update error',
      },
      { status: 500 },
    );
  }
}
