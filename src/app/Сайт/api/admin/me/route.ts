import { getAdminUserFromRequest } from '../../../lib/import/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const adminUser = await getAdminUserFromRequest(request);

  if (!adminUser) {
    return Response.json(
      { ok: false, isAdmin: false },
      { status: 403 },
    );
  }

  return Response.json({
    ok: true,
    isAdmin: true,
    user: {
      id: adminUser.id,
      email: adminUser.email,
    },
  });
}
