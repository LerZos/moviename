import { assertAdminSecret } from '../../../../lib/import/adminAuth';
import { generateTemplateMovieSeo } from '../../../../lib/seo/generateTemplateMovieSeo';
import { supabaseAdmin } from '../../../../lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function mergeRawJson(rawJson: unknown, templateSeo: unknown) {
  const base = rawJson && typeof rawJson === 'object' && !Array.isArray(rawJson) ? rawJson : {};

  return {
    ...base,
    template_seo: templateSeo,
    template_seo_generated_at: new Date().toISOString(),
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

    const { data: draft, error: draftError } = await supabaseAdmin
      .from('movie_drafts')
      .select('*')
      .eq('id', draftId)
      .single();

    if (draftError) throw draftError;

    if (!draft) {
      return Response.json({ ok: false, error: 'Draft not found' }, { status: 404 });
    }

    const generated = generateTemplateMovieSeo(draft);
    const rawJson = mergeRawJson(draft.raw_json, {
      provider: 'template',
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
      agent_name: 'template_seo_agent',
      decision: 'generated_template_seo',
      reason: 'Generated long_description, seo_title, seo_description and FAQ using free template SEO. Facts were not modified.',
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
      message: 'SEO по шаблону создано бесплатно. Черновик отправлен на модерацию.',
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown template SEO generation error',
      },
      { status: 500 },
    );
  }
}
