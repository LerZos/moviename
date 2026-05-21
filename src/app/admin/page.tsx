"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Check,
  Clock,
  Copy,
  Database,
  Film,
  Image,
  LogOut,
  Play,
  RefreshCcw,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import MobileBottomNav from "../components/MobileBottomNav";
import { movies, type ContentType } from "../data/movies";
import { supabase } from "../lib/supabase";

type AuthState = "loading" | "allowed" | "denied" | "guest";
type AdminTab = "main" | "media" | "details" | "result";

type KeyValueRow = {
  label: string;
  value: string;
};

type CastRow = {
  name: string;
  role: string;
};

type PlayerRow = {
  id: string;
  name: string;
  embedUrl: string;
};

const ADMIN_EMAILS = ["mone4ok.zxc@gmail.com"];

const contentTypes: ContentType[] = [
  "Фильм",
  "Сериал",
  "Аниме",
  "Мультфильм",
  "Документальный",
];

const translitMap: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

function normalizeEmail(email?: string | null) {
  return String(email || "").trim().toLowerCase();
}

function isAdminEmail(email?: string | null) {
  return ADMIN_EMAILS.includes(normalizeEmail(email));
}

function getInitials(email: string) {
  const name = email.split("@")[0] || "admin";

  return name
    .split(/[.\-_]+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function createSlug(text: string) {
  const transliterated = text
    .trim()
    .toLowerCase()
    .replaceAll("ё", "е")
    .split("")
    .map((letter) => translitMap[letter] ?? letter)
    .join("");

  return transliterated
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function splitCommaSeparated(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseKeyValueRows(value: string): KeyValueRow[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.indexOf(":");

      if (separatorIndex === -1) {
        return {
          label: line,
          value: "",
        };
      }

      return {
        label: line.slice(0, separatorIndex).trim(),
        value: line.slice(separatorIndex + 1).trim(),
      };
    })
    .filter((row) => row.label || row.value);
}

function parseCastRows(value: string): CastRow[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.indexOf("|");

      if (separatorIndex === -1) {
        return {
          name: line,
          role: "",
        };
      }

      return {
        name: line.slice(0, separatorIndex).trim(),
        role: line.slice(separatorIndex + 1).trim(),
      };
    })
    .filter((row) => row.name || row.role);
}

function parsePlayerRows(value: string): PlayerRow[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parts = line.split("|").map((part) => part.trim());

      return {
        id: `player-${index + 1}`,
        name: parts[0] || `Плеер ${index + 1}`,
        embedUrl: parts[1] || "",
      };
    });
}

function q(value: string | number) {
  if (typeof value === "number") {
    return String(value);
  }

  return JSON.stringify(value);
}

function formatStringArray(values: string[]) {
  if (values.length === 0) {
    return "[]";
  }

  if (values.length <= 3) {
    return `[${values.map((value) => q(value)).join(", ")}]`;
  }

  return `[
${values.map((value) => `        ${q(value)},`).join("\n")}
      ]`;
}

function formatFacts(values: KeyValueRow[]) {
  if (values.length === 0) {
    return "[]";
  }

  return `[
${values
  .map((item) => `        { label: ${q(item.label)}, value: ${q(item.value)} },`)
  .join("\n")}
      ]`;
}

function formatCast(values: CastRow[]) {
  if (values.length === 0) {
    return "[]";
  }

  return `[
${values
  .map((item) => `        { name: ${q(item.name)}, role: ${q(item.role)} },`)
  .join("\n")}
      ]`;
}

function formatPlayers(values: PlayerRow[]) {
  if (values.length === 0) {
    return `[
        { id: "player-1", name: "Плеер 1", embedUrl: "" },
        { id: "player-2", name: "Плеер 2", embedUrl: "" },
        { id: "player-3", name: "Плеер 3", embedUrl: "" },
      ]`;
  }

  return `[
${values
  .map(
    (item) =>
      `        { id: ${q(item.id)}, name: ${q(item.name)}, embedUrl: ${q(
        item.embedUrl,
      )} },`,
  )
  .join("\n")}
      ]`;
}

function getNextMovieId() {
  if (movies.length === 0) {
    return 1;
  }

  return Math.max(...movies.map((movie) => movie.id)) + 1;
}

function isValidRating(value: string) {
  const rating = Number(value.replace(",", "."));

  return Number.isFinite(rating) && rating >= 0 && rating <= 10;
}

function FieldLabel({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <label className="admin-label">
      <span>{title}</span>
      {hint && <small>{hint}</small>}
    </label>
  );
}

function InputField({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      type={type}
      className="admin-input"
    />
  );
}

function TextAreaField({
  value,
  onChange,
  placeholder,
  rows = 5,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="admin-textarea"
    />
  );
}

function StatCard({
  icon,
  title,
  value,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  text: string;
}) {
  return (
    <article className="stat-card">
      <div className="stat-icon">{icon}</div>
      <p className="stat-title">{title}</p>
      <strong>{value}</strong>
      <span>{text}</span>
    </article>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tab-button ${active ? "tab-button-active" : ""}`}
    >
      {children}
    </button>
  );
}

export default function AdminPage() {
  const nextMovieId = useMemo(() => getNextMovieId(), []);

  const [authState, setAuthState] = useState<AuthState>("loading");
  const [userEmail, setUserEmail] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("main");

  const [id, setId] = useState(String(nextMovieId));
  const [title, setTitle] = useState("");
  const [originalTitle, setOriginalTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState<ContentType>("Фильм");
  const [year, setYear] = useState("");
  const [rating, setRating] = useState("7.0");
  const [genres, setGenres] = useState("");
  const [searchTitles, setSearchTitles] = useState("");
  const [poster, setPoster] = useState("");
  const [posterFallbacks, setPosterFallbacks] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [description, setDescription] = useState("");
  const [trailerUrl, setTrailerUrl] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [factsText, setFactsText] = useState(
    "Год: \nТип: \nСтрана: \nДлительность: \nСтудия: \nРежиссёр: ",
  );
  const [castText, setCastText] = useState("Имя актёра | Роль\nИмя актёра | Роль");
  const [playersText, setPlayersText] = useState("Плеер 1 |\nПлеер 2 |\nПлеер 3 |");
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function checkAdminAccess() {
      const { data, error } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (error || !data.user) {
        setAuthState("guest");
        return;
      }

      const email = normalizeEmail(data.user.email);

      setUserEmail(email);
      setAuthState(isAdminEmail(email) ? "allowed" : "denied");
    }

    void checkAdminAccess();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!title.trim()) {
      return;
    }

    if (slug.trim()) {
      return;
    }

    setSlug(createSlug(originalTitle || title));
  }, [title, originalTitle, slug]);

  useEffect(() => {
    setFactsText((currentFacts) => {
      const lines = currentFacts.split("\n");

      return lines
        .map((line) => {
          if (line.startsWith("Год:")) {
            return `Год: ${year}`;
          }

          if (line.startsWith("Тип:")) {
            return `Тип: ${type}`;
          }

          return line;
        })
        .join("\n");
    });
  }, [year, type]);

  const normalizedSlug = slug.trim();
  const idNumber = Number(id);
  const movieId = Number.isFinite(idNumber) ? idNumber : nextMovieId;

  const slugAlreadyExists = Boolean(
    normalizedSlug &&
      movies.some((movie) => movie.slug === normalizedSlug && movie.id !== movieId),
  );

  const idAlreadyExists = movies.some((movie) => movie.id === movieId);

  const generatedMovieCode = useMemo(() => {
    const cleanTitle = title.trim();
    const cleanOriginalTitle = originalTitle.trim();
    const cleanSlug = normalizedSlug || createSlug(cleanOriginalTitle || cleanTitle);
    const cleanYear = year.trim();
    const cleanPoster = poster.trim();
    const cleanDescription = description.trim();
    const cleanTrailerUrl = trailerUrl.trim();
    const cleanLongDescription = longDescription.trim();
    const cleanRating = Number(rating.replace(",", "."));

    const genresList = splitCommaSeparated(genres);
    const searchTitleList = splitCommaSeparated(searchTitles);
    const fallbackList = splitCommaSeparated(posterFallbacks);
    const facts = parseKeyValueRows(factsText);
    const cast = parseCastRows(castText);
    const players = parsePlayerRows(playersText);

    return `  {
      id: ${movieId},
      slug: ${q(cleanSlug)},
      title: ${q(cleanTitle)},
      originalTitle: ${q(cleanOriginalTitle)},
      searchTitles: ${formatStringArray(searchTitleList)},
      type: ${q(type)},
      year: ${q(cleanYear)},
      rating: ${Number.isFinite(cleanRating) ? cleanRating : 0},
      genres: ${formatStringArray(genresList)},
      poster: ${q(cleanPoster)},
      posterFallbacks: ${formatStringArray(fallbackList)},
      description: ${q(cleanDescription)},
      trailerUrl: ${q(cleanTrailerUrl)},
      longDescription: ${q(cleanLongDescription)},
      facts: ${formatFacts(facts)},
      cast: ${formatCast(cast)},
      players: ${formatPlayers(players)},
    },`;
  }, [
    title,
    originalTitle,
    normalizedSlug,
    year,
    poster,
    description,
    trailerUrl,
    longDescription,
    rating,
    genres,
    searchTitles,
    posterFallbacks,
    factsText,
    castText,
    playersText,
    movieId,
    type,
  ]);

  const featuredBackdropLine = useMemo(() => {
    const cleanFeaturedImage = featuredImage.trim();

    if (!cleanFeaturedImage) {
      return "";
    }

    return `  ${movieId}: ${q(cleanFeaturedImage)},`;
  }, [featuredImage, movieId]);

  const formWarnings = [
    !title.trim() ? "Название фильма не заполнено." : "",
    !normalizedSlug ? "Slug не заполнен." : "",
    slugAlreadyExists ? "Такой slug уже есть в movies.ts." : "",
    idAlreadyExists ? "Такой id уже есть в movies.ts." : "",
    !isValidRating(rating) ? "Рейтинг должен быть числом от 0 до 10." : "",
    !genres.trim() ? "Жанры не заполнены." : "",
    !poster.trim() ? "Постер не заполнен." : "",
    !description.trim() ? "Короткое описание не заполнено." : "",
  ].filter(Boolean);

  const completedFields = [
    title,
    originalTitle,
    normalizedSlug,
    year,
    rating,
    genres,
    searchTitles,
    poster,
    description,
    trailerUrl,
    longDescription,
    factsText,
    castText,
  ].filter((value) => value.trim()).length;

  const progressWidth = Math.min(100, Math.round((completedFields / 13) * 100));

  async function copyText(value: string, message: string) {
    setCopyStatus("");

    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus(message);
    } catch {
      setCopyStatus("Не получилось скопировать автоматически. Выдели код вручную.");
    }

    window.setTimeout(() => {
      setCopyStatus("");
    }, 2600);
  }

  function resetForm() {
    setId(String(nextMovieId));
    setTitle("");
    setOriginalTitle("");
    setSlug("");
    setType("Фильм");
    setYear("");
    setRating("7.0");
    setGenres("");
    setSearchTitles("");
    setPoster("");
    setPosterFallbacks("");
    setFeaturedImage("");
    setDescription("");
    setTrailerUrl("");
    setLongDescription("");
    setFactsText("Год: \nТип: \nСтрана: \nДлительность: \nСтудия: \nРежиссёр: ");
    setCastText("Имя актёра | Роль\nИмя актёра | Роль");
    setPlayersText("Плеер 1 |\nПлеер 2 |\nПлеер 3 |");
    setCopyStatus("");
    setActiveTab("main");
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (authState === "loading") {
    return (
      <main className="profile-page profile-page-with-mobile-nav">
        <style>{adminStyles}</style>

        <div className="loading-screen">
          <div className="loading-card">
            <img src="/kinoluma-icon.png" alt="KinoLuma" className="loading-logo" />
            <p>Проверяем доступ к админке...</p>
          </div>
        </div>

        <MobileBottomNav />
      </main>
    );
  }

  if (authState === "guest") {
    return (
      <main className="profile-page profile-page-with-mobile-nav">
        <style>{adminStyles}</style>

        <div className="ambient-bg" />

        <section className="auth-screen">
          <div className="auth-card">
            <div className="logo-row">
              <img src="/kinoluma-icon.png" alt="KinoLuma" className="logo-mark" />

              <div>
                <p className="logo-title">KinoLuma</p>
                <p className="logo-subtitle">Админка</p>
              </div>
            </div>

            <p className="eyebrow">Доступ</p>

            <h1>Нужно войти в аккаунт</h1>

            <p className="auth-text">
              Админка доступна только после входа в KinoLuma под админским email.
            </p>

            <a href="/" className="primary-button">
              <ArrowLeft size={18} strokeWidth={2.4} aria-hidden="true" />
              Вернуться на главную
            </a>
          </div>
        </section>

        <MobileBottomNav />
      </main>
    );
  }

  if (authState === "denied") {
    return (
      <main className="profile-page profile-page-with-mobile-nav">
        <style>{adminStyles}</style>

        <div className="ambient-bg" />

        <section className="auth-screen">
          <div className="auth-card danger-card">
            <div className="logo-row">
              <img src="/kinoluma-icon.png" alt="KinoLuma" className="logo-mark" />

              <div>
                <p className="logo-title">KinoLuma</p>
                <p className="logo-subtitle">Админка</p>
              </div>
            </div>

            <p className="eyebrow">Доступ закрыт</p>

            <h1>Этот аккаунт не админ</h1>

            <p className="auth-text">
              Сейчас ты вошёл как <strong>{userEmail}</strong>. Для админки нужен email
              из списка администраторов.
            </p>

            <a href="/" className="primary-button">
              <ArrowLeft size={18} strokeWidth={2.4} aria-hidden="true" />
              Вернуться на главную
            </a>
          </div>
        </section>

        <MobileBottomNav />
      </main>
    );
  }

  return (
    <main className="profile-page profile-page-with-mobile-nav">
      <style>{adminStyles}</style>

      <div className="ambient-bg" />

      <header className="topbar">
        <div className="topbar-inner">
          <a href="/" className="brand">
            <img src="/kinoluma-icon.png" alt="KinoLuma" className="logo-mark" />

            <div>
              <p className="logo-title">KinoLuma</p>
              <p className="logo-subtitle">Админка</p>
            </div>
          </a>

          <div className="top-actions">
            <a href="/" className="ghost-button">
              <Film size={17} strokeWidth={2.4} aria-hidden="true" />
              В каталог
            </a>

            <button type="button" onClick={logout} className="ghost-button">
              <LogOut size={17} strokeWidth={2.4} aria-hidden="true" />
              Выйти
            </button>
          </div>
        </div>
      </header>

      <div className="page-shell">
        <section className="hero-grid">
          <aside className="identity-card animate-in">
            <div className="avatar-row">
              <div className="avatar">{getInitials(userEmail)}</div>

              <div className="user-meta">
                <p className="eyebrow">Админ</p>
                <h1>Панель</h1>
                <p>{userEmail}</p>
              </div>
            </div>

            <div className="level-card">
              <div className="level-top">
                <div>
                  <p>Заполнение шаблона</p>
                  <strong>{progressWidth}%</strong>
                </div>

                <span>{formWarnings.length === 0 ? "Готово к вставке" : "Есть проверки"}</span>
              </div>

              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progressWidth}%` }} />
              </div>
            </div>

            <div className="mini-stats">
              <div>
                <strong>{movies.length}</strong>
                <span>в каталоге</span>
              </div>

              <div>
                <strong>{nextMovieId}</strong>
                <span>след. ID</span>
              </div>

              <div>
                <strong>{formWarnings.length}</strong>
                <span>ошибок</span>
              </div>
            </div>
          </aside>

          <section className="dashboard-card animate-in delay-1">
            <div className="dashboard-content">
              <p className="eyebrow">Generator</p>

              <h2>Добавление фильма без боли в TypeScript</h2>

              <p>
                Заполни шаблон, скопируй готовый объект и вставь его в movies.ts.
                Это безопасная версия админки до полного переезда каталога в Supabase.
              </p>

              <div className="dashboard-actions">
                <button
                  type="button"
                  onClick={() => setActiveTab("main")}
                  className="primary-button"
                >
                  <Play size={18} strokeWidth={2.4} aria-hidden="true" />
                  Заполнить фильм
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("result")}
                  className="secondary-button"
                >
                  <Copy size={18} strokeWidth={2.4} aria-hidden="true" />
                  Код объекта
                </button>

                <button type="button" onClick={resetForm} className="secondary-button">
                  <Trash2 size={18} strokeWidth={2.4} aria-hidden="true" />
                  Очистить
                </button>
              </div>
            </div>

            <div className="featured-preview">
              {poster.trim() ? (
                <img
                  src={poster.trim()}
                  alt={title || "Постер"}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = "/kinoluma-icon.png";
                  }}
                />
              ) : (
                <div className="poster-placeholder">
                  <Image size={44} strokeWidth={2.2} aria-hidden="true" />
                </div>
              )}

              <div>
                <span>Предпросмотр</span>
                <strong>{title || "Название фильма"}</strong>
                <p>{originalTitle || "Original title"}</p>
              </div>
            </div>
          </section>
        </section>

        <section className="stats-grid">
          <StatCard
            icon={<Database size={21} strokeWidth={2.4} aria-hidden="true" />}
            title="Каталог"
            value={movies.length}
            text="Фильмов сейчас в movies.ts."
          />

          <StatCard
            icon={<ShieldCheck size={21} strokeWidth={2.4} aria-hidden="true" />}
            title="Доступ"
            value="Admin"
            text="Проверка по email."
          />

          <StatCard
            icon={<Clock size={21} strokeWidth={2.4} aria-hidden="true" />}
            title="Slug"
            value={normalizedSlug ? "OK" : "—"}
            text="Адрес будущей страницы."
          />

          <StatCard
            icon={<Activity size={21} strokeWidth={2.4} aria-hidden="true" />}
            title="Проверки"
            value={formWarnings.length}
            text="Что нужно поправить."
          />
        </section>

        <nav className="tabs-card">
          <TabButton active={activeTab === "main"} onClick={() => setActiveTab("main")}>
            <Film size={17} strokeWidth={2.4} aria-hidden="true" />
            Основное
          </TabButton>

          <TabButton active={activeTab === "media"} onClick={() => setActiveTab("media")}>
            <Image size={17} strokeWidth={2.4} aria-hidden="true" />
            Медиа
          </TabButton>

          <TabButton active={activeTab === "details"} onClick={() => setActiveTab("details")}>
            <Database size={17} strokeWidth={2.4} aria-hidden="true" />
            Детали
          </TabButton>

          <TabButton active={activeTab === "result"} onClick={() => setActiveTab("result")}>
            <Copy size={17} strokeWidth={2.4} aria-hidden="true" />
            Готовый код
          </TabButton>
        </nav>

        {formWarnings.length > 0 && (
          <section className="warning-card animate-in">
            <div className="warning-top">
              <Check size={18} strokeWidth={2.4} aria-hidden="true" />
              <strong>Проверка перед вставкой</strong>
            </div>

            <ul>
              {formWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </section>
        )}

        {activeTab === "main" && (
          <section className="section-card animate-in">
            <div className="section-head">
              <div>
                <p className="eyebrow">Step 01</p>
                <h2>Основная информация</h2>
              </div>

              <button
                type="button"
                onClick={() => setSlug(createSlug(originalTitle || title))}
                className="small-link-button"
              >
                <RefreshCcw size={16} strokeWidth={2.4} aria-hidden="true" />
                Создать slug
              </button>
            </div>

            <div className="form-grid">
              <div>
                <FieldLabel title="ID" hint="Должен быть уникальным." />
                <InputField value={id} onChange={setId} placeholder="40" />
              </div>

              <div>
                <FieldLabel title="Тип контента" />
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value as ContentType)}
                  className="admin-input"
                >
                  {contentTypes.map((contentType) => (
                    <option key={contentType} value={contentType} className="select-option">
                      {contentType}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel title="Название" />
                <InputField
                  value={title}
                  onChange={setTitle}
                  placeholder="Дюна: Часть вторая"
                />
              </div>

              <div>
                <FieldLabel title="Оригинальное название" />
                <InputField
                  value={originalTitle}
                  onChange={setOriginalTitle}
                  placeholder="Dune: Part Two"
                />
              </div>

              <div>
                <FieldLabel title="Slug" hint="Адрес страницы: /movie/slug" />
                <InputField value={slug} onChange={setSlug} placeholder="dune-part-two" />
              </div>

              <div>
                <FieldLabel title="Год" />
                <InputField value={year} onChange={setYear} placeholder="2024" />
              </div>

              <div>
                <FieldLabel title="Рейтинг" hint="От 0 до 10." />
                <InputField value={rating} onChange={setRating} placeholder="8.5" />
              </div>

              <div>
                <FieldLabel title="Жанры" hint="Через запятую." />
                <InputField
                  value={genres}
                  onChange={setGenres}
                  placeholder="Фантастика, Приключения, Драма"
                />
              </div>

              <div className="form-wide">
                <FieldLabel
                  title="Поисковые названия"
                  hint="Через запятую: ошибки, альтернативные названия, русские и английские варианты."
                />
                <InputField
                  value={searchTitles}
                  onChange={setSearchTitles}
                  placeholder="дюна, дюна 2, dune, dune part two"
                />
              </div>

              <div className="form-wide">
                <FieldLabel title="Короткое описание" />
                <TextAreaField
                  value={description}
                  onChange={setDescription}
                  rows={4}
                  placeholder="Короткое описание для карточки, поиска и модального окна."
                />
              </div>
            </div>
          </section>
        )}

        {activeTab === "media" && (
          <section className="section-card animate-in">
            <div className="section-head">
              <div>
                <p className="eyebrow">Step 02</p>
                <h2>Постеры и трейлер</h2>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-wide">
                <FieldLabel title="Постер" hint="Вертикальное изображение для карточек." />
                <InputField value={poster} onChange={setPoster} placeholder="https://..." />
              </div>

              <div className="form-wide">
                <FieldLabel title="Запасные постеры" hint="Необязательно. Через запятую." />
                <InputField
                  value={posterFallbacks}
                  onChange={setPosterFallbacks}
                  placeholder="https://..., https://..."
                />
              </div>

              <div className="form-wide">
                <FieldLabel
                  title="Изображение для “Популярное сейчас”"
                  hint="Для HomeClient.tsx. Ниже будет отдельная строка."
                />
                <InputField
                  value={featuredImage}
                  onChange={setFeaturedImage}
                  placeholder="https://..."
                />
              </div>

              <div className="form-wide">
                <FieldLabel title="Трейлер embed URL" hint="Только легальная embed-ссылка." />
                <InputField
                  value={trailerUrl}
                  onChange={setTrailerUrl}
                  placeholder="https://www.youtube.com/embed/..."
                />
              </div>

              <div className="form-wide">
                <FieldLabel title="Длинное описание" />
                <TextAreaField
                  value={longDescription}
                  onChange={setLongDescription}
                  rows={6}
                  placeholder="Большое описание для страницы фильма."
                />
              </div>
            </div>
          </section>
        )}

        {activeTab === "details" && (
          <section className="section-card animate-in">
            <div className="section-head">
              <div>
                <p className="eyebrow">Step 03</p>
                <h2>Факты, актёры и плееры</h2>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-wide">
                <FieldLabel title="Факты" hint="Каждая строка в формате: Название: Значение" />
                <TextAreaField
                  value={factsText}
                  onChange={setFactsText}
                  rows={8}
                  placeholder={"Год: 2024\nТип: Фильм\nСтрана: США"}
                />
              </div>

              <div className="form-wide">
                <FieldLabel title="Актёры / герои" hint="Каждая строка: Имя | Роль" />
                <TextAreaField
                  value={castText}
                  onChange={setCastText}
                  rows={8}
                  placeholder={"Timothée Chalamet | Пол Атрейдес\nZendaya | Чани"}
                />
              </div>

              <div className="form-wide">
                <FieldLabel
                  title="Плееры"
                  hint="Каждая строка: Название | embedUrl. Можно оставить embedUrl пустым."
                />
                <TextAreaField
                  value={playersText}
                  onChange={setPlayersText}
                  rows={5}
                  placeholder={"Плеер 1 |\nПлеер 2 |\nПлеер 3 |"}
                />
              </div>
            </div>
          </section>
        )}

        {activeTab === "result" && (
          <section className="result-grid animate-in">
            <article className="section-card">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Result</p>
                  <h2>Готовый объект для movies.ts</h2>
                </div>

                <button
                  type="button"
                  onClick={() => copyText(generatedMovieCode, "Объект фильма скопирован.")}
                  className="primary-button"
                >
                  <Copy size={17} strokeWidth={2.4} aria-hidden="true" />
                  Копировать
                </button>
              </div>

              <textarea readOnly value={generatedMovieCode} rows={28} className="code-output" />
            </article>

            <aside className="side-stack">
              <article className="section-card compact-card">
                <p className="eyebrow">HomeClient</p>
                <h2>Для “Популярное сейчас”</h2>

                <p className="hint-text">
                  Если фильм должен появляться в верхнем слайдере, добавь его ID в
                  priorityIds и строку картинки в featuredBackdropImages.
                </p>

                <div className="code-mini-box">
                  <div>
                    <strong>ID для priorityIds</strong>

                    <button
                      type="button"
                      onClick={() => copyText(String(movieId), "ID скопирован.")}
                    >
                      <Copy size={15} strokeWidth={2.4} aria-hidden="true" />
                    </button>
                  </div>

                  <code>{movieId}</code>
                </div>

                <div className="code-mini-box">
                  <div>
                    <strong>Строка картинки</strong>

                    <button
                      type="button"
                      onClick={() =>
                        copyText(
                          featuredBackdropLine || "Сначала вставь ссылку на изображение.",
                          "Строка картинки скопирована.",
                        )
                      }
                    >
                      <Copy size={15} strokeWidth={2.4} aria-hidden="true" />
                    </button>
                  </div>

                  <code>
                    {featuredBackdropLine ||
                      "Сначала заполни поле “Изображение для Популярное сейчас”."}
                  </code>
                </div>
              </article>

              <article className="section-card compact-card">
                <p className="eyebrow">Path</p>
                <h2>Куда вставлять</h2>

                <ol className="path-list">
                  <li>
                    Открой{" "}
                    <span>C:\site\movie-site\src\app\data\movies.ts</span>
                  </li>

                  <li>Вставь объект внутрь массива movies перед закрывающей скобкой.</li>

                  <li>
                    Если нужен слайдер, открой{" "}
                    <span>C:\site\movie-site\src\app\HomeClient.tsx</span>
                  </li>

                  <li>Добавь ID в priorityIds и строку картинки в featuredBackdropImages.</li>
                </ol>

                {copyStatus && <div className="copy-status">{copyStatus}</div>}
              </article>
            </aside>
          </section>
        )}
      </div>

      <MobileBottomNav />
    </main>
  );
}

const adminStyles = `
  * {
    box-sizing: border-box;
  }

  .profile-page {
    min-height: 100vh;
    background: #050505;
    color: #ffffff;
    overflow-x: hidden;
  }

  .profile-page button,
  .profile-page input,
  .profile-page textarea,
  .profile-page select {
    font: inherit;
  }

  .ambient-bg {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background:
      radial-gradient(circle at 18% 8%, rgba(255,255,255,0.10), transparent 28%),
      radial-gradient(circle at 88% 18%, rgba(255,255,255,0.07), transparent 26%),
      radial-gradient(circle at 50% 100%, rgba(255,255,255,0.06), transparent 32%),
      linear-gradient(180deg, #090909 0%, #050505 45%, #000000 100%);
  }

  .ambient-bg::after {
    content: "";
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
    background-size: 54px 54px;
    mask-image: linear-gradient(to bottom, rgba(0,0,0,0.45), transparent 65%);
  }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 50;
    border-bottom: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.76);
    backdrop-filter: blur(22px);
  }

  .topbar-inner {
    width: min(1180px, calc(100% - 40px));
    margin: 0 auto;
    min-height: 76px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
  }

  .brand,
  .logo-row {
    display: flex;
    align-items: center;
    gap: 12px;
    color: inherit;
    text-decoration: none;
  }

  .logo-mark {
    width: 42px;
    height: 42px;
    display: block;
    border-radius: 14px;
    background: #050505;
    object-fit: cover;
    box-shadow: 0 0 36px rgba(255,255,255,0.16);
  }

  .logo-title {
    margin: 0;
    font-size: 20px;
    line-height: 1;
    font-weight: 1000;
    letter-spacing: -0.04em;
  }

  .logo-subtitle {
    margin: 5px 0 0;
    color: #7f7f7f;
    font-size: 12px;
    font-weight: 800;
  }

  .top-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .ghost-button,
  .primary-button,
  .secondary-button,
  .small-link-button,
  .tab-button {
    border: 0;
    font: inherit;
    text-decoration: none;
    cursor: pointer;
  }

  .ghost-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 42px;
    padding: 0 16px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.035);
    color: #e8e8e8;
    font-size: 14px;
    font-weight: 900;
    transition:
      transform 180ms ease,
      background 180ms ease,
      color 180ms ease,
      border-color 180ms ease;
  }

  .ghost-button:hover {
    transform: translateY(-1px);
    border-color: rgba(255,255,255,0.35);
    background: #ffffff;
    color: #000000;
  }

  .page-shell {
    position: relative;
    z-index: 1;
    width: min(1180px, calc(100% - 40px));
    margin: 0 auto;
    padding: 28px 0 92px;
  }

  .hero-grid {
    display: grid;
    grid-template-columns: 340px minmax(0, 1fr);
    gap: 20px;
    align-items: stretch;
  }

  .identity-card,
  .dashboard-card,
  .stat-card,
  .section-card,
  .tabs-card,
  .auth-card,
  .loading-card,
  .warning-card {
    border: 1px solid rgba(255,255,255,0.10);
    background:
      linear-gradient(145deg, rgba(28,28,28,0.82), rgba(8,8,8,0.92)),
      #0b0b0b;
    box-shadow: 0 30px 90px rgba(0,0,0,0.42);
  }

  .identity-card {
    min-height: 360px;
    padding: 22px;
    border-radius: 30px;
    backdrop-filter: blur(24px);
  }

  .avatar-row {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .avatar {
    width: 88px;
    height: 88px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 28px;
    background: linear-gradient(135deg, #ffffff 0%, #d8d8d8 100%);
    color: #000000;
    font-size: 34px;
    font-weight: 1000;
    letter-spacing: -0.08em;
    box-shadow:
      0 18px 48px rgba(255,255,255,0.10),
      inset 0 -10px 20px rgba(0,0,0,0.12);
  }

  .user-meta {
    min-width: 0;
  }

  .eyebrow {
    margin: 0;
    color: #858585;
    font-size: 12px;
    font-weight: 1000;
    letter-spacing: 0.36em;
    text-transform: uppercase;
  }

  .user-meta h1 {
    margin: 8px 0 0;
    max-width: 190px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 30px;
    line-height: 1;
    font-weight: 1000;
    letter-spacing: -0.06em;
  }

  .user-meta p:last-child {
    margin: 8px 0 0;
    max-width: 190px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #8a8a8a;
    font-size: 13px;
    font-weight: 800;
  }

  .level-card {
    margin-top: 22px;
    padding: 18px;
    border-radius: 24px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.46);
  }

  .level-top {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: flex-start;
  }

  .level-top p {
    margin: 0;
    color: #8a8a8a;
    font-size: 13px;
    font-weight: 900;
  }

  .level-top strong {
    display: block;
    margin-top: 6px;
    font-size: 32px;
    line-height: 1;
    font-weight: 1000;
    letter-spacing: -0.06em;
  }

  .level-top span {
    max-width: 130px;
    padding: 8px 10px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.04);
    color: #e5e5e5;
    font-size: 11px;
    line-height: 1.25;
    font-weight: 1000;
    text-align: center;
  }

  .progress-track {
    margin-top: 18px;
    height: 8px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(255,255,255,0.07);
  }

  .progress-fill {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #ffffff, #9e9e9e);
    box-shadow: 0 0 18px rgba(255,255,255,0.25);
  }

  .mini-stats {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .mini-stats div {
    padding: 14px 10px;
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(0,0,0,0.36);
    text-align: center;
  }

  .mini-stats strong {
    display: block;
    font-size: 24px;
    font-weight: 1000;
  }

  .mini-stats span {
    display: block;
    margin-top: 4px;
    color: #777777;
    font-size: 12px;
    font-weight: 900;
  }

  .dashboard-card {
    position: relative;
    min-height: 360px;
    overflow: hidden;
    border-radius: 30px;
    padding: 34px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 230px;
    gap: 24px;
    align-items: end;
  }

  .dashboard-card::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 18% 20%, rgba(255,255,255,0.10), transparent 28%),
      linear-gradient(135deg, rgba(255,255,255,0.06), transparent 38%);
    opacity: 0.9;
  }

  .dashboard-content,
  .featured-preview {
    position: relative;
    z-index: 1;
  }

  .dashboard-content h2 {
    margin: 18px 0 0;
    max-width: 660px;
    font-size: clamp(38px, 5vw, 68px);
    line-height: 0.94;
    font-weight: 1000;
    letter-spacing: -0.08em;
  }

  .dashboard-content p:not(.eyebrow) {
    margin: 22px 0 0;
    max-width: 640px;
    color: #b0b0b0;
    font-size: 16px;
    line-height: 1.75;
    font-weight: 650;
  }

  .dashboard-actions {
    margin-top: 26px;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .primary-button,
  .secondary-button,
  .small-link-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    min-height: 48px;
    border-radius: 16px;
    padding: 0 20px;
    font-size: 14px;
    font-weight: 1000;
    transition:
      transform 180ms ease,
      background 180ms ease,
      color 180ms ease,
      border-color 180ms ease,
      box-shadow 180ms ease;
  }

  .primary-button {
    background: #ffffff;
    color: #000000;
    border: 1px solid #ffffff;
  }

  .primary-button:hover {
    transform: translateY(-2px);
    background: #000000;
    color: #ffffff;
    box-shadow: 0 0 28px rgba(255,255,255,0.16);
  }

  .secondary-button,
  .small-link-button {
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(0,0,0,0.38);
    color: #ededed;
  }

  .secondary-button:hover,
  .small-link-button:hover {
    transform: translateY(-2px);
    border-color: rgba(255,255,255,0.32);
    background: rgba(255,255,255,0.08);
  }

  .featured-preview {
    align-self: stretch;
    text-align: left;
    color: inherit;
    border-radius: 26px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.12);
    background: #000000;
    min-height: 300px;
  }

  .featured-preview img,
  .poster-placeholder {
    width: 100%;
    height: 210px;
    object-fit: cover;
    display: grid;
    place-items: center;
    background:
      radial-gradient(circle at 40% 20%, rgba(255,255,255,0.16), transparent 30%),
      #090909;
    color: #777777;
    opacity: 0.88;
  }

  .featured-preview > div:last-child {
    padding: 16px;
  }

  .featured-preview span {
    color: #8d8d8d;
    font-size: 11px;
    font-weight: 1000;
    text-transform: uppercase;
    letter-spacing: 0.22em;
  }

  .featured-preview strong {
    display: block;
    margin-top: 8px;
    font-size: 18px;
    line-height: 1.1;
    font-weight: 1000;
  }

  .featured-preview p {
    margin: 7px 0 0;
    color: #888888;
    font-size: 13px;
    font-weight: 800;
  }

  .stats-grid {
    margin-top: 20px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
  }

  .stat-card {
    position: relative;
    overflow: hidden;
    border-radius: 26px;
    padding: 20px;
    min-height: 170px;
    transition:
      transform 220ms ease,
      border-color 220ms ease,
      background 220ms ease;
  }

  .stat-card:hover {
    transform: translateY(-4px);
    border-color: rgba(255,255,255,0.26);
    background:
      linear-gradient(145deg, rgba(36,36,36,0.92), rgba(8,8,8,0.95)),
      #0b0b0b;
  }

  .stat-icon {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 14px;
    background: rgba(255,255,255,0.08);
    color: #ffffff;
  }

  .stat-title {
    margin: 16px 0 0;
    color: #9a9a9a;
    font-size: 13px;
    font-weight: 900;
  }

  .stat-card strong {
    display: block;
    margin-top: 8px;
    font-size: 30px;
    line-height: 1;
    font-weight: 1000;
    letter-spacing: -0.05em;
  }

  .stat-card span {
    display: block;
    margin-top: 12px;
    color: #737373;
    font-size: 13px;
    line-height: 1.45;
    font-weight: 700;
  }

  .tabs-card {
    margin-top: 20px;
    padding: 8px;
    border-radius: 24px;
    display: flex;
    gap: 8px;
    overflow-x: auto;
  }

  .tab-button {
    min-height: 46px;
    flex: 1 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 17px;
    padding: 0 18px;
    background: transparent;
    color: #8d8d8d;
    font-size: 14px;
    font-weight: 1000;
    transition:
      background 180ms ease,
      color 180ms ease,
      transform 180ms ease;
  }

  .tab-button:hover {
    color: #ffffff;
    background: rgba(255,255,255,0.06);
  }

  .tab-button-active {
    background: #ffffff;
    color: #000000;
  }

  .tab-button-active:hover {
    background: #ffffff;
    color: #000000;
  }

  .warning-card {
    margin-top: 20px;
    border-radius: 26px;
    padding: 20px;
    border-color: rgba(250,204,21,0.24);
    background:
      linear-gradient(145deg, rgba(250,204,21,0.08), rgba(8,8,8,0.94)),
      #0b0b0b;
  }

  .warning-top {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #fde68a;
  }

  .warning-card ul {
    margin: 14px 0 0;
    padding-left: 19px;
    color: #fef3c7;
    font-size: 14px;
    line-height: 1.7;
  }

  .section-card {
    margin-top: 20px;
    border-radius: 30px;
    padding: 26px;
  }

  .section-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 22px;
  }

  .section-head h2,
  .compact-card h2 {
    margin: 8px 0 0;
    font-size: clamp(26px, 3vw, 42px);
    line-height: 1;
    font-weight: 1000;
    letter-spacing: -0.06em;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
  }

  .form-wide {
    grid-column: 1 / -1;
  }

  .admin-label {
    display: block;
  }

  .admin-label span {
    display: block;
    font-size: 14px;
    font-weight: 1000;
    color: #ffffff;
  }

  .admin-label small {
    display: block;
    margin-top: 6px;
    color: #777777;
    font-size: 12px;
    line-height: 1.45;
    font-weight: 750;
  }

  .admin-input,
  .admin-textarea,
  .code-output {
    width: 100%;
    margin-top: 10px;
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.42);
    color: #ffffff;
    outline: none;
    transition:
      border-color 180ms ease,
      background 180ms ease,
      box-shadow 180ms ease;
  }

  .admin-input {
    height: 52px;
    padding: 0 16px;
    font-size: 14px;
    font-weight: 800;
  }

  .admin-textarea {
    resize: vertical;
    min-height: 130px;
    padding: 15px 16px;
    font-size: 14px;
    line-height: 1.65;
    font-weight: 750;
  }

  .admin-input::placeholder,
  .admin-textarea::placeholder {
    color: #555555;
  }

  .admin-input:focus,
  .admin-textarea:focus,
  .code-output:focus {
    border-color: rgba(255,255,255,0.34);
    background: rgba(255,255,255,0.055);
    box-shadow: 0 0 0 4px rgba(255,255,255,0.04);
  }

  .select-option {
    background: #050505;
    color: #ffffff;
  }

  .result-grid {
    margin-top: 20px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 20px;
    align-items: start;
  }

  .result-grid .section-card {
    margin-top: 0;
  }

  .code-output {
    min-height: 520px;
    resize: vertical;
    padding: 18px;
    font-family:
      ui-monospace,
      SFMono-Regular,
      Menlo,
      Monaco,
      Consolas,
      "Liberation Mono",
      "Courier New",
      monospace;
    font-size: 12px;
    line-height: 1.65;
    color: #d4d4d4;
    white-space: pre;
  }

  .side-stack {
    display: grid;
    gap: 20px;
  }

  .compact-card {
    padding: 22px;
  }

  .compact-card h2 {
    font-size: 28px;
  }

  .hint-text {
    margin: 14px 0 0;
    color: #9a9a9a;
    font-size: 14px;
    line-height: 1.65;
    font-weight: 700;
  }

  .code-mini-box {
    margin-top: 16px;
    padding: 14px;
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.09);
    background: rgba(0,0,0,0.36);
  }

  .code-mini-box div {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .code-mini-box strong {
    font-size: 13px;
    font-weight: 1000;
  }

  .code-mini-box button {
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.04);
    color: #ffffff;
    cursor: pointer;
    transition:
      background 180ms ease,
      color 180ms ease,
      transform 180ms ease;
  }

  .code-mini-box button:hover {
    transform: translateY(-1px);
    background: #ffffff;
    color: #000000;
  }

  .code-mini-box code {
    display: block;
    margin-top: 12px;
    color: #d4d4d4;
    font-size: 12px;
    line-height: 1.6;
    word-break: break-word;
    white-space: pre-wrap;
  }

  .path-list {
    margin: 16px 0 0;
    padding-left: 20px;
    color: #a3a3a3;
    font-size: 14px;
    line-height: 1.75;
    font-weight: 750;
  }

  .path-list span {
    color: #ffffff;
    font-family:
      ui-monospace,
      SFMono-Regular,
      Menlo,
      Monaco,
      Consolas,
      "Liberation Mono",
      "Courier New",
      monospace;
    font-size: 12px;
  }

  .copy-status {
    margin-top: 18px;
    padding: 14px;
    border-radius: 18px;
    border: 1px solid rgba(74,222,128,0.22);
    background: rgba(74,222,128,0.08);
    color: #bbf7d0;
    font-size: 14px;
    font-weight: 850;
  }

  .loading-screen,
  .auth-screen {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 32px;
  }

  .loading-card,
  .auth-card {
    width: min(520px, 100%);
    border-radius: 34px;
    padding: 30px;
  }

  .loading-card {
    text-align: center;
  }

  .loading-logo {
    width: 58px;
    height: 58px;
    margin: 0 auto 18px;
    display: block;
    border-radius: 18px;
    box-shadow: 0 0 36px rgba(255,255,255,0.18);
  }

  .loading-card p {
    margin: 0;
    color: #d4d4d4;
    font-size: 15px;
    font-weight: 900;
  }

  .auth-card h1 {
    margin: 24px 0 0;
    font-size: clamp(34px, 8vw, 56px);
    line-height: 0.96;
    letter-spacing: -0.08em;
    font-weight: 1000;
  }

  .auth-card .eyebrow {
    margin-top: 30px;
  }

  .auth-text {
    margin: 20px 0 0;
    color: #a3a3a3;
    font-size: 16px;
    line-height: 1.7;
    font-weight: 700;
  }

  .auth-text strong {
    color: #ffffff;
  }

  .auth-card .primary-button {
    margin-top: 26px;
  }

  .danger-card {
    border-color: rgba(248,113,113,0.22);
    background:
      linear-gradient(145deg, rgba(127,29,29,0.28), rgba(8,8,8,0.94)),
      #0b0b0b;
  }

  .animate-in {
    animation: adminCardEnter 520ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .delay-1 {
    animation-delay: 90ms;
  }

  @keyframes adminCardEnter {
    from {
      opacity: 0;
      transform: translateY(18px) scale(0.985);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @media (max-width: 980px) {
    .hero-grid,
    .result-grid {
      grid-template-columns: 1fr;
    }

    .dashboard-card {
      grid-template-columns: 1fr;
    }

    .featured-preview {
      max-width: 360px;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 680px) {
    .topbar-inner,
    .page-shell {
      width: min(100% - 24px, 1180px);
    }

    .topbar-inner {
      min-height: 68px;
    }

    .top-actions {
      gap: 8px;
    }

    .ghost-button {
      min-height: 38px;
      padding: 0 12px;
      font-size: 0;
      gap: 0;
    }

    .ghost-button svg {
      margin: 0;
    }

    .hero-grid {
      gap: 14px;
    }

    .identity-card,
    .dashboard-card,
    .section-card,
    .warning-card {
      border-radius: 24px;
      padding: 18px;
    }

    .dashboard-content h2 {
      font-size: 42px;
    }

    .dashboard-content p:not(.eyebrow) {
      font-size: 14px;
    }

    .stats-grid,
    .form-grid {
      grid-template-columns: 1fr;
    }

    .tabs-card {
      border-radius: 20px;
    }

    .tab-button {
      min-height: 42px;
      padding: 0 14px;
      font-size: 13px;
    }

    .section-head {
      flex-direction: column;
      align-items: stretch;
    }

    .section-head h2 {
      font-size: 30px;
    }

    .primary-button,
    .secondary-button,
    .small-link-button {
      width: 100%;
    }

    .featured-preview {
      max-width: none;
    }

    .profile-page-with-mobile-nav {
      padding-bottom: calc(92px + env(safe-area-inset-bottom));
    }
  }
`;