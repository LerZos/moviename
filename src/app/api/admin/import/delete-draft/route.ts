import { revalidatePath } from 'next/cache';

import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { assertAdminSecret } from '../../../../lib/import/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type DraftRow = {
  id: string;
  title: string | null;
  slug: string | null;
  type: string | null;
  status: string | null;
};

function getCatalogSlug(type: string | null) {
  const catalogSlugByDraftType: Record<string, string> = {
    film: 'films',
    movie: 'films',
    series: 'series',
    tv: 'series',
    anime: 'anime',
    cartoon: 'cartoons',
    documentary: 'documentaries',
  };

  return catalogSlugByDraftType[type || 'film'] || 'films';
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
      .select('id, title, slug, type, status')
      .eq('id', draftId)
      .single();

    if (draftError) throw draftError;

    const beforeDraft = draft as DraftRow;
    const now = new Date().toISOString();

    const { data: updatedDraft, error: updateError } = await supabaseAdmin
      .from('movie_drafts')
      .update({
        status: 'deleted',
        moderation_notes: 'Удалено вручную из админки импорта',
        updated_at: now,
      })
      .eq('id', draftId)
      .select('*')
      .single();

    if (updateError) throw updateError;

    await supabaseAdmin.from('agent_feedback').insert({
      draft_id: draftId,
      agent_name: 'admin_dashboard',
      decision: 'delete_draft',
      reason: 'Фильм скрыт с сайта и из вкладок импорта через ручной редактор.',
      before_value: beforeDraft,
      after_value: { status: 'deleted', updated_at: now },
    });

    revalidatePath('/');
    revalidatePath(`/catalog/${getCatalogSlug(beforeDraft.type)}`);
    revalidatePath('/sitemap.xml');

    if (beforeDraft.slug) {
      revalidatePath(`/movie/${beforeDraft.slug}`);
    }

    return Response.json({
      ok: true,
      draft: updatedDraft,
      message: beforeDraft.status === 'published'
        ? 'Фильм удалён с публичного сайта и скрыт из импорта.'
        : 'Фильм скрыт из вкладок импорта.',
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown draft delete error',
      },
      { status: 500 },
    );
  }
}
