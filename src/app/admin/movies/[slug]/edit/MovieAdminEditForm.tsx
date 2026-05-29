'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';

import { supabase } from '../../../../lib/supabase';
import type { Movie } from '../../../../data/movies';
import { buildPlayerTextFromIds, extractRendexVideoId, parsePlayerText, playersToText } from '../../../../lib/players';

type MovieAdminEditFormProps = {
  slug: string;
  movie: Movie & Record<string, unknown>;
};

type SaveState = 'idle' | 'saving' | 'deleting' | 'saved' | 'error';

function valueToString(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}

function arrayToText(value: unknown) {
  if (!Array.isArray(value)) {
    return '';
  }

  return value.filter((item) => typeof item === 'string' && item.trim()).join(', ');
}

function parseCsv(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumber(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function parseRendexVideoId(value: FormDataEntryValue | null) {
  const id = extractRendexVideoId(value);
  return id ? Number(id) : undefined;
}

function parsePlayers(value: FormDataEntryValue | null) {
  return parsePlayerText(typeof value === 'string' ? value : '');
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value ?? [], null, 2);
  } catch {
    return '[]';
  }
}

function parseJsonArray(value: FormDataEntryValue | null, fieldName: string) {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  const parsed = JSON.parse(value);

  if (!Array.isArray(parsed)) {
    throw new Error(`${fieldName} должен быть JSON-массивом`);
  }

  return parsed;
}

function parseExtraJson(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value.trim()) {
    return {};
  }

  const parsed = JSON.parse(value);

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Дополнительные данные должны быть JSON-объектом');
  }

  return parsed as Record<string, unknown>;
}

function FieldHint({ children }: { children: ReactNode }) {
  return <p className="field-hint">{children}</p>;
}

export default function MovieAdminEditForm({ slug, movie }: MovieAdminEditFormProps) {
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [message, setMessage] = useState('');
  const [titlePreview, setTitlePreview] = useState(valueToString(movie.title));
  const [originalTitlePreview, setOriginalTitlePreview] = useState(valueToString(movie.originalTitle));
  const [posterPreview, setPosterPreview] = useState(valueToString(movie.poster));
  const [backdropPreview, setBackdropPreview] = useState(valueToString(movie.backdrop));
  const [yearPreview, setYearPreview] = useState(valueToString(movie.year));
  const [ratingPreview, setRatingPreview] = useState(valueToString(movie.rating));
  const [typePreview, setTypePreview] = useState(valueToString(movie.type));
  const [kinopoiskIdPreview, setKinopoiskIdPreview] = useState(valueToString(movie.kinopoiskId));
  const [rendexVideoIdPreview, setRendexVideoIdPreview] = useState(valueToString(movie.rendexVideoId || movie.rendex_video_id || movie.iframeVideoId || movie.iframe_video_id));
  const [playersText, setPlayersText] = useState(playersToText(movie.players));

  const factsJson = useMemo(() => safeJson(movie.facts), [movie.facts]);
  const castJson = useMemo(() => safeJson(movie.cast), [movie.cast]);

  function generatePlayerLinks() {
    const generated = buildPlayerTextFromIds({
      kinopoiskId: kinopoiskIdPreview,
      rendexVideoId: rendexVideoIdPreview,
      movieType: typePreview,
    });

    if (!generated) {
      setSaveState('error');
      setMessage('Для автогенерации нужен Rendex video ID и/или Кинопоиск ID.');
      return;
    }

    setPlayersText(generated);
    setSaveState('idle');
    setMessage('Плееры сгенерированы. Основной — Rendex, запасной — Factorios. Не забудь сохранить правки.');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveState('saving');
    setMessage('');

    try {
      const formData = new FormData(event.currentTarget);
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        throw new Error('Сначала войди в профиль под админским email');
      }

      const extraJson = parseExtraJson(formData.get('extraJson'));
      const players = parsePlayers(formData.get('players'));
      const facts = parseJsonArray(formData.get('factsJson'), 'Факты');
      const cast = parseJsonArray(formData.get('castJson'), 'Актёры');
      const posterFallbacks = parseCsv(formData.get('posterFallbacks'));

      const payload: Record<string, unknown> = {
        ...extraJson,
        title: valueToString(formData.get('title')).trim(),
        originalTitle: valueToString(formData.get('originalTitle')).trim(),
        type: valueToString(formData.get('type')).trim(),
        year: parseNumber(formData.get('year')),
        rating: parseNumber(formData.get('rating')),
        description: valueToString(formData.get('description')).trim(),
        longDescription: valueToString(formData.get('longDescription')).trim(),
        poster: valueToString(formData.get('poster')).trim(),
        backdrop: valueToString(formData.get('backdrop')).trim(),
        trailerUrl: valueToString(formData.get('trailerUrl')).trim(),
        kinopoiskId: parseNumber(formData.get('kinopoiskId')),
        rendexVideoId: parseRendexVideoId(formData.get('rendexVideoId')),
        tmdbId: parseNumber(formData.get('tmdbId')),
        imdbId: valueToString(formData.get('imdbId')).trim(),
        genres: parseCsv(formData.get('genres')),
        countries: parseCsv(formData.get('countries')),
      };

      if (players.length > 0) payload.players = players;
      if (facts) payload.facts = facts;
      if (cast) payload.cast = cast;
      if (posterFallbacks.length > 0) payload.posterFallbacks = posterFallbacks;

      const response = await fetch(`/api/admin/movies/${slug}/override`, {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || 'Не удалось сохранить правки');
      }

      setSaveState('saved');
      setMessage('Сохранено. Страница фильма обновлена, можно открыть карточку и проверить правки.');
    } catch (error) {
      setSaveState('error');
      setMessage(error instanceof Error ? error.message : 'Неизвестная ошибка сохранения');
    }
  }

  async function handleDeleteMovie() {
    const title = titlePreview || movie.title || slug;
    const confirmed = window.confirm(
      `Удалить «${title}» с сайта?\n\nФильм будет скрыт через Supabase override. Файл movies.ts не изменится, поэтому восстановление можно будет сделать через базу.`,
    );

    if (!confirmed) return;

    setSaveState('deleting');
    setMessage('');

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        throw new Error('Сначала войди в профиль под админским email');
      }

      const response = await fetch(`/api/admin/movies/${slug}/override`, {
        method: 'DELETE',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || 'Не удалось удалить фильм');
      }

      setSaveState('saved');
      setMessage('Фильм скрыт с сайта. Сейчас верну тебя в админку.');
      window.setTimeout(() => {
        window.location.href = '/admin/import';
      }, 700);
    } catch (error) {
      setSaveState('error');
      setMessage(error instanceof Error ? error.message : 'Неизвестная ошибка удаления');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="edit-layout">
      <section className="edit-main-card">
        <div className="form-section form-section-first">
          <div className="section-title-row">
            <div>
              <span className="section-index">01</span>
              <h2>Основное</h2>
              <p>Название, тип, год и рейтинги. Только факты — без сценарного фанфика.</p>
            </div>
          </div>

          <div className="form-grid two-cols">
            <label className="field field-wide-sm">
              <span>Название</span>
              <input
                name="title"
                value={titlePreview}
                onChange={(event) => setTitlePreview(event.target.value)}
                className="edit-input"
              />
            </label>

            <label className="field field-wide-sm">
              <span>Оригинальное название</span>
              <input
                name="originalTitle"
                value={originalTitlePreview}
                onChange={(event) => setOriginalTitlePreview(event.target.value)}
                className="edit-input"
              />
            </label>

            <label className="field">
              <span>Тип</span>
              <input
                name="type"
                value={typePreview}
                onChange={(event) => setTypePreview(event.target.value)}
                className="edit-input"
              />
            </label>

            <label className="field">
              <span>Год</span>
              <input
                name="year"
                value={yearPreview}
                onChange={(event) => setYearPreview(event.target.value)}
                className="edit-input"
              />
            </label>

            <label className="field">
              <span>Рейтинг</span>
              <input
                name="rating"
                value={ratingPreview}
                onChange={(event) => setRatingPreview(event.target.value)}
                className="edit-input"
              />
            </label>

            <label className="field">
              <span>Kinopoisk ID</span>
              <input
                name="kinopoiskId"
                value={kinopoiskIdPreview}
                onChange={(event) => setKinopoiskIdPreview(event.target.value)}
                className="edit-input"
              />
            </label>

            <label className="field">
              <span>TMDB ID</span>
              <input name="tmdbId" defaultValue={valueToString(movie.tmdbId)} className="edit-input" />
            </label>

            <label className="field">
              <span>IMDB ID</span>
              <input name="imdbId" defaultValue={valueToString(movie.imdbId)} className="edit-input" />
            </label>
          </div>
        </div>

        <div className="form-section">
          <div className="section-title-row">
            <div>
              <span className="section-index">02</span>
              <h2>Каталог</h2>
              <p>Жанры, страны и визуальные материалы для карточек и страницы фильма.</p>
            </div>
          </div>

          <div className="form-grid">
            <label className="field full">
              <span>Жанры через запятую</span>
              <input name="genres" defaultValue={arrayToText(movie.genres)} className="edit-input" />
              <FieldHint>Например: драма, фантастика, приключения</FieldHint>
            </label>

            <label className="field full">
              <span>Страны через запятую</span>
              <input name="countries" defaultValue={arrayToText(movie.countries)} className="edit-input" />
            </label>

            <label className="field full">
              <span>Постер</span>
              <input
                name="poster"
                value={posterPreview}
                onChange={(event) => setPosterPreview(event.target.value)}
                className="edit-input"
                placeholder="https://..."
              />
            </label>

            <label className="field full">
              <span>Backdrop / фон</span>
              <input
                name="backdrop"
                value={backdropPreview}
                onChange={(event) => setBackdropPreview(event.target.value)}
                className="edit-input"
                placeholder="https://..."
              />
            </label>

            <label className="field full">
              <span>Fallback-постеры через запятую</span>
              <input name="posterFallbacks" defaultValue={arrayToText(movie.posterFallbacks)} className="edit-input" />
            </label>
          </div>
        </div>

        <div className="form-section">
          <div className="section-title-row">
            <div>
              <span className="section-index">03</span>
              <h2>Видео</h2>
              <p>Трейлер и плееры. Основной плеер можно собрать по Rendex video ID, запасной — по Кинопоиск ID.</p>
            </div>
          </div>

          <div className="form-grid">
            <label className="field full">
              <span>Трейлер</span>
              <input name="trailerUrl" defaultValue={valueToString(movie.trailerUrl)} className="edit-input" placeholder="https://..." />
            </label>

            <label className="field full">
              <span>Rendex video ID</span>
              <input
                name="rendexVideoId"
                value={rendexVideoIdPreview}
                onChange={(event) => setRendexVideoIdPreview(event.target.value)}
                className="edit-input"
                placeholder={'150669 или <ins data-publisher-id="678053396" data-type="movie" data-id="150669"></ins>'}
              />
              <FieldHint>Можно вставить только ID или весь код &lt;ins&gt; — KinoLuma сам возьмёт data-id.</FieldHint>
            </label>

            <div className="field full player-generator-panel">
              <div>
                <span>Автогенерация</span>
                <p>Собирает основной Rendex-плеер и запасной Factorios-плеер.</p>
              </div>
              <button type="button" onClick={generatePlayerLinks} className="mini-action-button">
                Сгенерировать плееры
              </button>
            </div>

            <label className="field full">
              <span>Плееры</span>
              <textarea
                name="players"
                value={playersText}
                onChange={(event) => setPlayersText(event.target.value)}
                rows={5}
                className="edit-input edit-textarea"
                placeholder={'Основной | rendex | 150669\nОсновной | rendex | <ins data-publisher-id="678053396" data-type="movie" data-id="150669"></ins>\nЗапасной | iframe | https://tarantino.factorios.live/show/kinopoisk/1219177'}
              />
              <FieldHint>Одна строка — один плеер. Для Rendex можно указать videoId или вставить весь &lt;ins&gt;-код: data-id будет извлечён автоматически.</FieldHint>
            </label>
          </div>
        </div>

        <div className="form-section">
          <div className="section-title-row">
            <div>
              <span className="section-index">04</span>
              <h2>Описание</h2>
              <p>Короткое описание оставляем для hero/карточек, длинное — для блока “О фильме”.</p>
            </div>
          </div>

          <div className="form-grid">
            <label className="field full">
              <span>Короткое описание / hero</span>
              <textarea name="description" defaultValue={valueToString(movie.description)} rows={4} className="edit-input edit-textarea" />
            </label>

            <label className="field full">
              <span>Long description / блок “О фильме”</span>
              <textarea name="longDescription" defaultValue={valueToString(movie.longDescription)} rows={7} className="edit-input edit-textarea tall" />
            </label>
          </div>
        </div>

        <details className="advanced-card">
          <summary>
            <span>Дополнительно: JSON-поля</span>
            <small>Факты, актёры и редкие SEO/служебные поля</small>
          </summary>

          <div className="advanced-grid">
            <label className="field full">
              <span>Факты JSON</span>
              <textarea name="factsJson" defaultValue={factsJson} rows={8} className="edit-input edit-textarea code" />
            </label>

            <label className="field full">
              <span>Актёры JSON</span>
              <textarea name="castJson" defaultValue={castJson} rows={8} className="edit-input edit-textarea code" />
            </label>

            <label className="field full">
              <span>Дополнительные данные JSON</span>
              <textarea
                name="extraJson"
                defaultValue="{}"
                rows={8}
                className="edit-input edit-textarea code"
                placeholder='Например: { "seoTitle": "...", "faq": [] }'
              />
            </label>
          </div>
        </details>
      </section>

      <aside className="edit-sidebar">
        <div className="preview-card">
          <div className="preview-backdrop" style={{ backgroundImage: backdropPreview ? `url(${backdropPreview})` : undefined }} />

          <div className="preview-content">
            <div className="poster-frame">
              {posterPreview ? (
                <img
                  src={posterPreview}
                  alt={titlePreview || 'Постер'}
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="poster-empty">Нет постера</div>
              )}
            </div>

            <div className="preview-info">
              <span className="preview-type">{typePreview || 'Материал'}</span>
              <h3>{titlePreview || 'Без названия'}</h3>
              <p>{originalTitlePreview || 'Оригинальное название не указано'}</p>

              <div className="preview-pills">
                <span>{yearPreview || 'год —'}</span>
                <span>★ {ratingPreview || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="save-card">
          <p className="save-kicker">Сохранение</p>
          <h2>Проверь и обнови фильм</h2>
          <p>
            Сохраняем только override в Supabase. Если что-то не понравится, можно поправить снова без пуша в GitHub.
          </p>

          {message && (
            <div className={saveState === 'error' ? 'save-message error' : 'save-message success'}>
              {message}
            </div>
          )}

          <div className="save-actions">
            <button type="submit" disabled={saveState === 'saving'} className="save-button">
              {saveState === 'saving' ? 'Сохраняю…' : 'Сохранить правки'}
            </button>

            <button type="button" onClick={() => void handleDeleteMovie()} disabled={saveState === 'saving' || saveState === 'deleting'} className="delete-button">
              {saveState === 'deleting' ? 'Удаляю…' : 'Удалить фильм'}
            </button>

            <Link href={`/movie/${slug}`} className="side-link">
              Открыть фильм
            </Link>

            <Link href="/admin/import" className="side-link">
              Вернуться в админку
            </Link>
          </div>
        </div>
      </aside>

      <style jsx>{`
        .edit-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 390px;
          gap: 22px;
          align-items: start;
        }

        .edit-main-card,
        .preview-card,
        .save-card {
          border: 1px solid rgba(255,255,255,0.10);
          background:
            linear-gradient(145deg, rgba(24,24,24,0.76), rgba(5,5,5,0.94)),
            rgba(255,255,255,0.035);
          box-shadow: 0 30px 90px rgba(0,0,0,0.42);
          backdrop-filter: blur(24px);
        }

        .edit-main-card {
          overflow: hidden;
          border-radius: 34px;
        }

        .form-section {
          padding: 28px;
          border-top: 1px solid rgba(255,255,255,0.08);
        }

        .form-section-first {
          border-top: 0;
        }

        .section-title-row {
          margin-bottom: 22px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 18px;
        }

        .section-index {
          display: inline-flex;
          height: 28px;
          min-width: 42px;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.62);
          font-size: 11px;
          font-weight: 1000;
        }

        .section-title-row h2 {
          margin: 12px 0 0;
          font-size: 26px;
          line-height: 1;
          font-weight: 1000;
          letter-spacing: -0.06em;
        }

        .section-title-row p {
          margin: 9px 0 0;
          max-width: 660px;
          color: rgba(255,255,255,0.52);
          font-size: 13px;
          line-height: 1.6;
          font-weight: 650;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        .two-cols {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .field {
          display: grid;
          gap: 8px;
        }

        .field.full {
          grid-column: 1 / -1;
        }

        .field span {
          color: rgba(255,255,255,0.76);
          font-size: 13px;
          font-weight: 950;
        }

        .field-hint {
          margin: 0;
          color: rgba(255,255,255,0.40);
          font-size: 12px;
          line-height: 1.5;
          font-weight: 650;
        }

        .player-generator-panel {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 16px;
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 22px;
          background: rgba(255,255,255,0.045);
        }

        .player-generator-panel p {
          margin: 6px 0 0;
          color: rgba(255,255,255,0.52);
          font-size: 12px;
          line-height: 1.5;
          font-weight: 650;
        }

        .mini-action-button {
          border: 0;
          min-height: 42px;
          padding: 0 16px;
          border-radius: 999px;
          background: #ffffff;
          color: #000000;
          font: inherit;
          font-size: 12px;
          font-weight: 1000;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 18px 34px rgba(255,255,255,0.10);
        }

        .edit-input {
          width: 100%;
          min-height: 48px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.40);
          padding: 13px 15px;
          color: #ffffff;
          outline: none;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
          transition: transform 160ms ease, border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
        }

        .edit-input::placeholder {
          color: rgba(255,255,255,0.30);
        }

        .edit-input:focus {
          transform: translateY(-1px);
          border-color: rgba(255,255,255,0.34);
          background: rgba(0,0,0,0.58);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.07),
            0 0 0 4px rgba(255,255,255,0.045);
        }

        .edit-textarea {
          min-height: 132px;
          resize: vertical;
          line-height: 1.65;
        }

        .edit-textarea.tall {
          min-height: 210px;
        }

        .edit-textarea.code {
          min-height: 230px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.55;
        }

        .advanced-card {
          border-top: 1px solid rgba(255,255,255,0.08);
          padding: 0;
        }

        .advanced-card summary {
          list-style: none;
          cursor: pointer;
          padding: 24px 28px;
          display: grid;
          gap: 6px;
          transition: background 160ms ease;
        }

        .advanced-card summary::-webkit-details-marker {
          display: none;
        }

        .advanced-card summary:hover {
          background: rgba(255,255,255,0.04);
        }

        .advanced-card summary span {
          font-size: 18px;
          font-weight: 1000;
          letter-spacing: -0.04em;
        }

        .advanced-card summary small {
          color: rgba(255,255,255,0.46);
          font-size: 12px;
          font-weight: 750;
        }

        .advanced-grid {
          display: grid;
          gap: 16px;
          padding: 0 28px 28px;
        }

        .edit-sidebar {
          position: sticky;
          top: 96px;
          display: grid;
          gap: 18px;
        }

        .preview-card {
          position: relative;
          overflow: hidden;
          min-height: 520px;
          border-radius: 34px;
          background: #050505;
        }

        .preview-backdrop {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 30% 0%, rgba(255,255,255,0.16), transparent 34%),
            linear-gradient(160deg, #1a1a1a, #050505 62%);
          background-size: cover;
          background-position: center;
          opacity: 0.46;
          filter: saturate(0.8);
          transform: scale(1.04);
        }

        .preview-card::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(to bottom, rgba(0,0,0,0.12), rgba(0,0,0,0.78)),
            radial-gradient(circle at 50% 100%, rgba(255,255,255,0.08), transparent 42%);
        }

        .preview-content {
          position: relative;
          z-index: 1;
          min-height: 520px;
          display: grid;
          align-content: end;
          padding: 22px;
        }

        .poster-frame {
          width: 190px;
          aspect-ratio: 2 / 3;
          overflow: hidden;
          border-radius: 26px;
          border: 1px solid rgba(255,255,255,0.16);
          background: rgba(255,255,255,0.06);
          box-shadow: 0 28px 80px rgba(0,0,0,0.62);
        }

        .poster-frame img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .poster-empty {
          height: 100%;
          display: grid;
          place-items: center;
          color: rgba(255,255,255,0.45);
          font-size: 13px;
          font-weight: 900;
          text-align: center;
        }

        .preview-info {
          margin-top: 20px;
        }

        .preview-type {
          display: inline-flex;
          min-height: 30px;
          align-items: center;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.08);
          padding: 0 12px;
          color: rgba(255,255,255,0.78);
          font-size: 11px;
          font-weight: 1000;
          text-transform: uppercase;
          letter-spacing: 0.16em;
        }

        .preview-info h3 {
          margin: 14px 0 0;
          font-size: 32px;
          line-height: 0.98;
          font-weight: 1000;
          letter-spacing: -0.07em;
        }

        .preview-info p {
          margin: 9px 0 0;
          color: rgba(255,255,255,0.56);
          font-size: 14px;
          font-weight: 800;
        }

        .preview-pills {
          margin-top: 16px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .preview-pills span {
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          background: #ffffff;
          padding: 0 12px;
          color: #000000;
          font-size: 12px;
          font-weight: 1000;
        }

        .save-card {
          border-radius: 30px;
          padding: 22px;
        }

        .save-kicker {
          margin: 0;
          color: rgba(255,255,255,0.45);
          font-size: 11px;
          font-weight: 1000;
          text-transform: uppercase;
          letter-spacing: 0.28em;
        }

        .save-card h2 {
          margin: 10px 0 0;
          font-size: 24px;
          line-height: 1;
          font-weight: 1000;
          letter-spacing: -0.06em;
        }

        .save-card p:not(.save-kicker) {
          margin: 12px 0 0;
          color: rgba(255,255,255,0.55);
          font-size: 13px;
          line-height: 1.65;
          font-weight: 650;
        }

        .save-message {
          margin-top: 16px;
          border-radius: 20px;
          padding: 14px;
          font-size: 13px;
          line-height: 1.55;
          font-weight: 800;
        }

        .save-message.success {
          border: 1px solid rgba(52, 211, 153, 0.34);
          background: rgba(16, 185, 129, 0.10);
          color: #d1fae5;
        }

        .save-message.error {
          border: 1px solid rgba(248, 113, 113, 0.36);
          background: rgba(239, 68, 68, 0.11);
          color: #fee2e2;
        }

        .save-actions {
          margin-top: 18px;
          display: grid;
          gap: 10px;
        }

        .save-button,
        .delete-button,
        .side-link {
          min-height: 50px;
          border: 0;
          border-radius: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 18px;
          color: inherit;
          font: inherit;
          font-size: 14px;
          font-weight: 1000;
          text-decoration: none;
          cursor: pointer;
          transition: transform 160ms ease, background 160ms ease, border-color 160ms ease, color 160ms ease;
        }

        .save-button {
          background: #ffffff;
          color: #000000;
        }

        .save-button:hover:not(:disabled) {
          transform: translateY(-1px);
          background: rgba(255,255,255,0.88);
        }

        .save-button:disabled,
        .delete-button:disabled {
          cursor: not-allowed;
          opacity: 0.62;
        }

        .delete-button {
          border: 1px solid rgba(248,113,113,0.34);
          background: rgba(248,113,113,0.10);
          color: #fecaca;
        }

        .delete-button:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color: rgba(248,113,113,0.58);
          background: rgba(248,113,113,0.16);
          color: #ffffff;
        }

        .side-link {
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.055);
          color: rgba(255,255,255,0.84);
        }

        .side-link:hover {
          transform: translateY(-1px);
          border-color: rgba(255,255,255,0.28);
          background: rgba(255,255,255,0.10);
          color: #ffffff;
        }

        @media (max-width: 1120px) {
          .edit-layout {
            grid-template-columns: 1fr;
          }

          .edit-sidebar {
            position: static;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          }

          .preview-card,
          .preview-content {
            min-height: 430px;
          }
        }

        @media (max-width: 760px) {
          .edit-sidebar {
            grid-template-columns: 1fr;
          }

          .two-cols {
            grid-template-columns: 1fr;
          }

          .form-section,
          .advanced-card summary,
          .advanced-grid {
            padding-left: 18px;
            padding-right: 18px;
          }

          .advanced-grid {
            padding-bottom: 18px;
          }
        }
      `}</style>
    </form>
  );
}
