import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getMovieWithOverrides } from '../../../../lib/movies/movieOverrides';
import MovieAdminEditForm from './MovieAdminEditForm';

type EditMoviePageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = 'force-dynamic';

export default async function EditMoviePage({ params }: EditMoviePageProps) {
  const { slug } = await params;
  const movie = await getMovieWithOverrides(slug);

  if (!movie) {
    notFound();
  }

  return (
    <main className="admin-edit-page min-h-screen bg-[#030303] text-white">
      <div className="admin-edit-bg" />
      <div className="admin-edit-grid-bg" />

      <header className="admin-edit-topbar">
        <div className="admin-edit-topbar-inner">
          <Link href="/admin/import" className="admin-edit-brand" aria-label="Открыть админку KinoLuma">
            <span className="admin-edit-brand-mark">KL</span>
            <span>
              <strong>KinoLuma</strong>
              <small>Admin editor</small>
            </span>
          </Link>

          <nav className="admin-edit-nav" aria-label="Навигация редактора">
            <Link href={`/movie/${slug}`} className="admin-edit-nav-link">
              Открыть фильм
            </Link>
            <Link href="/admin/import" className="admin-edit-nav-link admin-edit-nav-link-strong">
              Админка
            </Link>
          </nav>
        </div>
      </header>

      <div className="admin-edit-shell">
        <section className="admin-edit-hero">
          <div className="admin-edit-hero-content">
            <p className="admin-edit-kicker">Редактор карточки</p>
            <h1>Проект “{movie.title}”</h1>
            <p>
              Изменения сохраняются в Supabase как аккуратный слой правок поверх <code>movies.ts</code>.
              Публичный каталог и SEO остаются на месте, а баги не получают приглашение на премьеру.
            </p>
          </div>

          <div className="admin-edit-hero-meta" aria-label="Краткая информация">
            <div>
              <span>Slug</span>
              <strong>{slug}</strong>
            </div>
            <div>
              <span>Тип</span>
              <strong>{movie.type || '—'}</strong>
            </div>
            <div>
              <span>Год</span>
              <strong>{movie.year || '—'}</strong>
            </div>
          </div>
        </section>

        <MovieAdminEditForm slug={slug} movie={movie} />
      </div>

      <style>{`
        .admin-edit-page {
          position: relative;
          overflow-x: hidden;
          padding-bottom: 72px;
        }

        .admin-edit-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at 14% 8%, rgba(255,255,255,0.13), transparent 25%),
            radial-gradient(circle at 86% 10%, rgba(255,255,255,0.08), transparent 24%),
            radial-gradient(circle at 55% 92%, rgba(255,255,255,0.06), transparent 28%),
            linear-gradient(180deg, #090909 0%, #040404 45%, #000000 100%);
        }

        .admin-edit-grid-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          opacity: 0.22;
          background-image:
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 58px 58px;
          mask-image: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent 72%);
        }

        .admin-edit-topbar {
          position: sticky;
          top: 0;
          z-index: 30;
          border-bottom: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.72);
          backdrop-filter: blur(24px);
        }

        .admin-edit-topbar-inner {
          width: min(1380px, calc(100% - 40px));
          min-height: 74px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .admin-edit-brand,
        .admin-edit-nav-link {
          color: inherit;
          text-decoration: none;
        }

        .admin-edit-brand {
          display: inline-flex;
          align-items: center;
          gap: 12px;
        }

        .admin-edit-brand-mark {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          background: #ffffff;
          color: #000000;
          font-size: 12px;
          font-weight: 1000;
          letter-spacing: -0.08em;
          box-shadow: 0 18px 50px rgba(255,255,255,0.12);
        }

        .admin-edit-brand strong {
          display: block;
          font-size: 16px;
          line-height: 1;
          font-weight: 1000;
          letter-spacing: -0.04em;
        }

        .admin-edit-brand small {
          display: block;
          margin-top: 5px;
          color: rgba(255,255,255,0.48);
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.18em;
        }

        .admin-edit-nav {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .admin-edit-nav-link {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.045);
          padding: 0 16px;
          color: rgba(255,255,255,0.78);
          font-size: 13px;
          font-weight: 950;
          transition: transform 180ms ease, background 180ms ease, color 180ms ease, border-color 180ms ease;
        }

        .admin-edit-nav-link:hover {
          transform: translateY(-1px);
          border-color: rgba(255,255,255,0.28);
          background: rgba(255,255,255,0.09);
          color: #ffffff;
        }

        .admin-edit-nav-link-strong {
          background: #ffffff;
          border-color: #ffffff;
          color: #000000;
        }

        .admin-edit-nav-link-strong:hover {
          background: rgba(255,255,255,0.88);
          color: #000000;
        }

        .admin-edit-shell {
          position: relative;
          z-index: 1;
          width: min(1380px, calc(100% - 40px));
          margin: 0 auto;
          padding-top: 28px;
        }

        .admin-edit-hero {
          min-height: 260px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 360px;
          gap: 22px;
          align-items: stretch;
          margin-bottom: 22px;
        }

        .admin-edit-hero-content,
        .admin-edit-hero-meta {
          border: 1px solid rgba(255,255,255,0.10);
          background:
            linear-gradient(145deg, rgba(30,30,30,0.72), rgba(6,6,6,0.92)),
            rgba(255,255,255,0.04);
          box-shadow: 0 30px 90px rgba(0,0,0,0.42);
          backdrop-filter: blur(26px);
        }

        .admin-edit-hero-content {
          position: relative;
          overflow: hidden;
          border-radius: 34px;
          padding: clamp(24px, 4vw, 44px);
        }

        .admin-edit-hero-content::after {
          content: "";
          position: absolute;
          right: -80px;
          top: -120px;
          width: 300px;
          height: 300px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255,255,255,0.12), transparent 66%);
          pointer-events: none;
        }

        .admin-edit-kicker {
          margin: 0;
          color: rgba(255,255,255,0.48);
          font-size: 12px;
          font-weight: 1000;
          text-transform: uppercase;
          letter-spacing: 0.34em;
        }

        .admin-edit-hero h1 {
          position: relative;
          z-index: 1;
          margin: 18px 0 0;
          max-width: 820px;
          font-size: clamp(42px, 6vw, 78px);
          line-height: 0.92;
          font-weight: 1000;
          letter-spacing: -0.08em;
        }

        .admin-edit-hero p:not(.admin-edit-kicker) {
          position: relative;
          z-index: 1;
          margin: 22px 0 0;
          max-width: 760px;
          color: rgba(255,255,255,0.66);
          font-size: 15px;
          line-height: 1.8;
          font-weight: 650;
        }

        .admin-edit-hero code {
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px;
          background: rgba(255,255,255,0.06);
          padding: 2px 7px;
          color: #ffffff;
          font-size: 0.92em;
        }

        .admin-edit-hero-meta {
          border-radius: 34px;
          padding: 18px;
          display: grid;
          gap: 12px;
        }

        .admin-edit-hero-meta div {
          min-height: 64px;
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.32);
          padding: 14px 16px;
          display: grid;
          align-content: center;
        }

        .admin-edit-hero-meta span {
          color: rgba(255,255,255,0.45);
          font-size: 11px;
          font-weight: 1000;
          text-transform: uppercase;
          letter-spacing: 0.22em;
        }

        .admin-edit-hero-meta strong {
          display: block;
          margin-top: 6px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 15px;
          font-weight: 1000;
        }

        @media (max-width: 980px) {
          .admin-edit-hero {
            grid-template-columns: 1fr;
          }

          .admin-edit-hero-meta {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .admin-edit-topbar-inner,
          .admin-edit-shell {
            width: min(100% - 24px, 1380px);
          }

          .admin-edit-topbar-inner {
            min-height: auto;
            padding: 14px 0;
            align-items: flex-start;
            flex-direction: column;
          }

          .admin-edit-nav {
            width: 100%;
          }

          .admin-edit-nav-link {
            flex: 1;
          }

          .admin-edit-hero-meta {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
