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
    update: {},
    decision: 'publish_safe_click',
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
          ? reason || 'Клик по публикации в безопасном режиме. Публичная публикация ещё не подключена.'
          : reason,
      before_value: null,
      after_value: update,
    });

    if (feedbackError) throw feedbackError;

    return Response.json({
      ok: true,
      draft: updatedDraft,
      message:
        action === 'publish_safe_click'
          ? 'Безопасный режим: публичная публикация ещё не подключена. Решение сохранено в feedback.'
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
