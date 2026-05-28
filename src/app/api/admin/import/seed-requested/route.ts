export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  return Response.json(
    {
      ok: false,
      error: 'Этот старый ручной endpoint отключён. Для автоматического ежедневного импорта используй /api/cron/import-daily, а 4 нужных фильма уже добавлены в data/movies.ts.',
    },
    { status: 410 },
  );
}
