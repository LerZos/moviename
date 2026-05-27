import { assertAdminSecret } from '../../../../lib/import/adminAuth';
import { generateMovieSeo } from '../../../../lib/ai/generateMovieSeo';
import { supabaseAdmin } from '../../../../lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


function formatSeoGenerationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes('exceeded your current quota') || lower.includes('insufficient_quota')) {
    return 'OpenAI API: превышена квота или закончились кредиты. Проверь Billing / Usage limits в OpenAI Platform. Черновик не сломан — SEO просто не было сгенерировано.';
  }

  if (lower.includes('incorrect api key') || lower.includes('invalid api key')) {
    return 'OpenAI API: ключ неверный или отключён. Проверь OPENAI_API_KEY в .env.local и перезапусти npm run dev.';
  }

  return message || 'Unknown SEO generation error';
}

function mergeRawJson(rawJson: unknown, aiSeo: unknown) {
  const base = rawJson && typeof rawJson === 'object' && !Array.isArray(rawJson) ? rawJson : {};

  return {
    ...base,
    ai_seo: aiSeo,
    ai_seo_generated_at: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  const authError = assertAdminSecret(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const draftId = typeof body.draftId === 'string' ? body.draftId : null;

    if (!draftId) {
      return Response.json({ ok: false, error: 'draftId is required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { ok: false, error: 'OPENAI_API_KEY is not configured' },
        { status: 400 },
      );
    }

    const { data: draft, error: draftError } = await supabaseAdmin
      .from('movie_drafts')
      .select('*')
      .eq('id', draftId)
      .single();

    if (draftError) throw draftError;
    if (!draft) {
      return Response.json({ ok: false, error: 'Draft not found' }, { status: 404 });
    }

    const generated = await generateMovieSeo(draft);
    const rawJson = mergeRawJson(draft.raw_json, {
      model: process.env.OPENAI_SEO_MODEL || 'gpt-4o-mini',
      internalLinkSuggestions: generated.internalLinkSuggestions,
    });

    const update = {
      long_description: generated.longDescription,
      seo_title: generated.seoTitle,
      seo_description: generated.seoDescription,
      faq: generated.faq,
      raw_json: rawJson,
      status: 'needs_moderation',
      moderation_notes: null,
      updated_at: new Date().toISOString(),
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
      agent_name: 'openai_seo_agent',
      decision: 'generated_seo',
      reason: 'Generated long_description, seo_title, seo_description and FAQ. Facts were not modified.',
      before_value: {
        long_description: draft.long_description,
        seo_title: draft.seo_title,
        seo_description: draft.seo_description,
        faq: draft.faq,
        status: draft.status,
      },
      after_value: update,
    });

    if (feedbackError) throw feedbackError;

    return Response.json({
      ok: true,
      draft: updatedDraft,
      message: 'SEO сгенерировано. Черновик отправлен на модерацию.',
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: formatSeoGenerationError(error),
      },
      { status: 500 },
    );
  }
}
