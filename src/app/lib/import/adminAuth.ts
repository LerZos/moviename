import { supabaseAdmin } from '../supabase/admin';

export type AdminAccessUser = {
  id: string;
  email: string;
};

function getBearerToken(request: Request) {
  const authorization = request.headers.get('authorization');
  const bearerToken = authorization?.replace(/^Bearer\s+/i, '').trim();
  const headerToken = request.headers.get('x-supabase-access-token')?.trim();

  return bearerToken || headerToken || null;
}

export function getAdminEmails() {
  const rawEmails = process.env.ADMIN_EMAILS || 'mone4ok.zxc@gmail.com';

  return rawEmails
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  return getAdminEmails().includes(email.toLowerCase());
}

export async function getAdminUserFromRequest(
  request: Request,
): Promise<AdminAccessUser | null> {
  const token = getBearerToken(request);

  if (!token) {
    return null;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user?.email) {
    return null;
  }

  if (!isAdminEmail(data.user.email)) {
    return null;
  }

  return {
    id: data.user.id,
    email: data.user.email,
  };
}

export async function assertAdminAccess(request: Request): Promise<Response | null> {
  const adminUser = await getAdminUserFromRequest(request);

  if (!adminUser) {
    return Response.json(
      { ok: false, error: 'Forbidden' },
      { status: 403 },
    );
  }

  return null;
}

// Старый способ оставлен только как fallback для роутов, которые ты ещё не перевёл.
// Новый безопасный режим для админки: assertAdminAccess(request).
export function assertAdminSecret(request: Request): Response | null {
  const expectedSecret = process.env.KINOLUMA_ADMIN_SECRET;

  if (!expectedSecret) {
    return Response.json(
      { ok: false, error: 'Missing KINOLUMA_ADMIN_SECRET on server' },
      { status: 500 },
    );
  }

  const headerSecret = request.headers.get('x-kinoluma-admin-secret');
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const providedSecret = headerSecret || bearer;

  if (providedSecret !== expectedSecret) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}

export function assertCronSecret(request: Request): Response | null {
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    if (process.env.NODE_ENV !== 'production') return null;

    return Response.json(
      { ok: false, error: 'Missing CRON_SECRET on server' },
      { status: 500 },
    );
  }

  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const headerSecret = request.headers.get('x-cron-secret');
  const providedSecret = bearer || headerSecret;

  if (providedSecret !== expectedSecret) {
    return Response.json({ ok: false, error: 'Unauthorized cron request' }, { status: 401 });
  }

  return null;
}
