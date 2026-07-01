"use client";

import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  CopyCheck,
  Database,
  Edit3,
  ExternalLink,
  Eye,
  Film,
  Gauge,
  KeyRound,
  Layers3,
  RefreshCcw,
  Search,
  PlayCircle,
  PlusCircle,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";

type Candidate = {
  id: string;
  source: string | null;
  source_id: string | null;
  title: string | null;
  original_title: string | null;
  year: number | null;
  type: string | null;
  status: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type Draft = {
  id: string;
  title: string | null;
  original_title: string | null;
  slug: string | null;
  year: number | null;
  type: string | null;
  genres: string[] | null;
  poster_url: string | null;
  backdrop_url: string | null;
  tmdb_id: number | null;
  kinopoisk_id: number | null;
  imdb_id: string | null;
  movie_rating: number | null;
  actors: string[] | null;
  directors: string[] | null;
  description: string | null;
  long_description: string | null;
  seo_title: string | null;
  seo_description: string | null;
  faq: unknown[] | null;
  trailer_provider: string | null;
  trailer_key: string | null;
  trailer_url: string | null;
  trailer_embed_url: string | null;
  trailer_source: string | null;
  player_links: string | null;
  rendex_video_id: string | null;
  trailer_confidence: number | null;
  trailer_status: string | null;
  similar_movie_ids: unknown[] | null;
  source: string | null;
  status: string | null;
  quality_score: number | null;
  moderation_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ManualDraftForm = {
  title: string;
  original_title: string;
  slug: string;
  year: string;
  kinopoisk_id: string;
  tmdb_id: string;
  imdb_id: string;
  rating: string;
  type: string;
  status: string;
  genres: string;
  poster_url: string;
  backdrop_url: string;
  actors: string;
  directors: string;
  description: string;
  long_description: string;
  seo_title: string;
  seo_description: string;
  faq_json: string;
  trailer_input: string;
  trailer_url: string;
  trailer_embed_url: string;
  trailer_provider: string;
  trailer_key: string;
  trailer_status: string;
  trailer_confidence: string;
  player_links: string;
  rendex_video_id: string;
  moderation_notes: string;
};

const manualTypeOptions = [
  { value: "film", label: "Фильм" },
  { value: "series", label: "Сериал" },
  { value: "cartoon", label: "Мультфильм" },
  { value: "anime", label: "Аниме" },
  { value: "documentary", label: "Документальный" },
];

const manualStatusOptions = [
  { value: "draft", label: "Черновик" },
  { value: "needs_ai_seo", label: "Нужен SEO" },
  { value: "needs_moderation", label: "Модерация" },
  { value: "needs_review", label: "Проверка" },
  { value: "ready", label: "Готово" },
  { value: "published", label: "Опубликовано" },
  { value: "rejected", label: "Отклонено" },
];

type ImportRun = {
  id: string;
  started_at: string | null;
  finished_at: string | null;
  status: string | null;
  found_count: number | null;
  created_drafts_count: number | null;
  failed_count: number | null;
  log: unknown | null;
};

type ImportListResponse = {
  ok: boolean;
  candidates: Candidate[];
  drafts: Draft[];
  runs: ImportRun[];
  counts: {
    newCandidates: number;
    drafts: { key: string; count: number }[];
  };
  config: {
    hasOpenAI: boolean;
    hasTemplateSeo: boolean;
    hasKinopoisk: boolean;
    hasTMDB: boolean;
    hasVibix: boolean;
  };
  error?: string;
};

type TabId =
  | "new_candidates"
  | "drafts"
  | "needs_review"
  | "ready"
  | "published"
  | "errors"
  | "runs";

const tabs: { id: TabId; label: string; icon: ReactNode }[] = [
  {
    id: "new_candidates",
    label: "Кандидаты",
    icon: <Search size={17} strokeWidth={2.4} aria-hidden="true" />,
  },
  {
    id: "drafts",
    label: "Черновики",
    icon: <Film size={17} strokeWidth={2.4} aria-hidden="true" />,
  },
  {
    id: "needs_review",
    label: "Проверка",
    icon: <Eye size={17} strokeWidth={2.4} aria-hidden="true" />,
  },
  {
    id: "ready",
    label: "Готово",
    icon: <CheckCircle2 size={17} strokeWidth={2.4} aria-hidden="true" />,
  },
  {
    id: "published",
    label: "Опубликовано",
    icon: <ShieldCheck size={17} strokeWidth={2.4} aria-hidden="true" />,
  },
  {
    id: "errors",
    label: "Ошибки",
    icon: <AlertTriangle size={17} strokeWidth={2.4} aria-hidden="true" />,
  },
  {
    id: "runs",
    label: "Запуски",
    icon: <Activity size={17} strokeWidth={2.4} aria-hidden="true" />,
  },
];

function formatDate(value: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatLog(value: unknown) {
  if (!value) return "";

  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function statusLabel(status: string | null) {
  if (!status) return "—";

  const labels: Record<string, string> = {
    new: "Новый",
    processed: "Обработан",
    failed: "Ошибка",
    draft: "Черновик",
    needs_ai_seo: "Нужен SEO",
    needs_moderation: "Нужна модерация",
    needs_review: "Нужна проверка",
    ready: "Готово",
    published: "Опубликовано",
    rejected: "Отклонено",
    missing: "Нет трейлера",
    accepted: "Принят",
  };

  return labels[status] ?? status;
}

function statusTone(status: string | null) {
  if (
    status === "ready" ||
    status === "published" ||
    status === "processed" ||
    status === "accepted"
  ) {
    return "good";
  }

  if (
    status === "needs_review" ||
    status === "needs_ai_seo" ||
    status === "needs_moderation" ||
    status === "missing"
  ) {
    return "warn";
  }

  if (status === "rejected" || status === "failed") {
    return "bad";
  }

  return "neutral";
}


async function readJsonResponse(response: Response) {
  const text = await response.text();

  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const shortText = text.length > 700 ? `${text.slice(0, 700)}...` : text;

    throw new Error(
      shortText.startsWith("Internal Server Error")
        ? "Сервер вернул Internal Server Error. Посмотри терминал с npm run dev и пришли полный лог ошибки route.ts — браузер получил не JSON, а текст ошибки Next.js."
        : shortText,
    );
  }
}

function shortText(value: string | null, limit = 210) {
  if (!value) return "—";
  if (value.length <= limit) return value;
  return `${value.slice(0, limit).trim()}…`;
}

function getDraftCount(data: ImportListResponse | null, status: string) {
  return data?.counts.drafts.find((item) => item.key === status)?.count ?? 0;
}

function getInitials(value: string) {
  return (
    value
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "KL"
  );
}

function escapeSvgText(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function createGeneratedPoster(
  title: string,
  originalTitle: string,
  type: string,
) {
  const safeTitle = escapeSvgText(title || "KinoLuma");
  const safeOriginalTitle = escapeSvgText(originalTitle || "Draft");
  const safeType = escapeSvgText(type || "movie");

  const svg = `
    <svg width="500" height="750" viewBox="0 0 500 750" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="500" height="750" fill="#050505"/>
      <rect x="24" y="24" width="452" height="702" rx="32" fill="#111111" stroke="#3f3f46" stroke-width="2"/>
      <circle cx="250" cy="242" r="86" fill="#18181b" stroke="#737373" stroke-width="2"/>
      <circle cx="208" cy="214" r="8" fill="#f5f5f5"/>
      <circle cx="286" cy="222" r="8" fill="#f5f5f5"/>
      <circle cx="244" cy="288" r="8" fill="#f5f5f5"/>
      <line x1="208" y1="214" x2="286" y2="222" stroke="#a3a3a3" stroke-width="3"/>
      <line x1="286" y1="222" x2="244" y2="288" stroke="#a3a3a3" stroke-width="3"/>
      <line x1="244" y1="288" x2="208" y2="214" stroke="#a3a3a3" stroke-width="3"/>
      <text x="250" y="414" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="34" font-weight="800">${safeTitle}</text>
      <text x="250" y="462" text-anchor="middle" fill="#a3a3a3" font-family="Arial" font-size="22" font-weight="600">${safeOriginalTitle}</text>
      <rect x="142" y="520" width="216" height="50" rx="25" fill="#ffffff"/>
      <text x="250" y="552" text-anchor="middle" fill="#000000" font-family="Arial" font-size="18" font-weight="800">${safeType}</text>
      <text x="250" y="650" text-anchor="middle" fill="#737373" font-family="Arial" font-size="18" font-weight="600">KinoLuma Admin</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function isFeatureReady(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return value > 0;
  return Boolean(value);
}

function getTrailerEmbedUrl(draft: Draft) {
  if (draft.trailer_embed_url) return draft.trailer_embed_url;

  if (draft.trailer_provider === "youtube" && draft.trailer_key) {
    return `https://www.youtube.com/embed/${draft.trailer_key}`;
  }

  if (draft.trailer_url?.includes("youtube.com/watch")) {
    try {
      const url = new URL(draft.trailer_url);
      const videoId = url.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    } catch {
      return null;
    }
  }

  if (draft.trailer_url?.includes("youtu.be/")) {
    try {
      const url = new URL(draft.trailer_url);
      const videoId = url.pathname.replace("/", "").trim();
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    } catch {
      return null;
    }
  }

  return null;
}

function getTrailerExternalUrl(draft: Draft) {
  if (draft.trailer_url) return draft.trailer_url;

  if (draft.trailer_provider === "youtube" && draft.trailer_key) {
    return `https://www.youtube.com/watch?v=${draft.trailer_key}`;
  }

  const embedUrl = getTrailerEmbedUrl(draft);
  if (embedUrl?.includes("/embed/")) {
    const videoId = embedUrl.split("/embed/")[1]?.split("?")[0];
    return videoId ? `https://www.youtube.com/watch?v=${videoId}` : embedUrl;
  }

  return embedUrl;
}

function hasTrailer(draft: Draft) {
  return Boolean(getTrailerEmbedUrl(draft) || getTrailerExternalUrl(draft));
}

function draftToManualForm(draft: Draft): ManualDraftForm {
  return {
    title: draft.title ?? "",
    original_title: draft.original_title ?? "",
    slug: draft.slug ?? "",
    year: draft.year?.toString() ?? "",
    kinopoisk_id: draft.kinopoisk_id?.toString() ?? "",
    tmdb_id: draft.tmdb_id?.toString() ?? "",
    imdb_id: draft.imdb_id ?? "",
    rating: draft.movie_rating?.toString() ?? "",
    type: draft.type ?? "",
    status: draft.status ?? "",
    genres: (draft.genres ?? []).join(", "),
    poster_url: draft.poster_url ?? "",
    backdrop_url: draft.backdrop_url ?? "",
    actors: (draft.actors ?? []).join(", "),
    directors: (draft.directors ?? []).join(", "),
    description: draft.description ?? "",
    long_description: draft.long_description ?? "",
    seo_title: draft.seo_title ?? "",
    seo_description: draft.seo_description ?? "",
    faq_json:
      Array.isArray(draft.faq) && draft.faq.length
        ? JSON.stringify(draft.faq, null, 2)
        : "",
    trailer_input: getTrailerExternalUrl(draft) || getTrailerEmbedUrl(draft) || "",
    trailer_url: draft.trailer_url ?? "",
    trailer_embed_url: draft.trailer_embed_url ?? "",
    trailer_provider: draft.trailer_provider ?? "",
    trailer_key: draft.trailer_key ?? "",
    trailer_status: draft.trailer_status ?? "",
    trailer_confidence: draft.trailer_confidence?.toString() ?? "",
    player_links: draft.player_links ?? "",
    rendex_video_id: draft.rendex_video_id ?? "",
    moderation_notes: draft.moderation_notes ?? "",
  };
}

function createEmptyManualForm(): ManualDraftForm {
  return {
    title: "",
    original_title: "",
    slug: "",
    year: "",
    kinopoisk_id: "",
    tmdb_id: "",
    imdb_id: "",
    rating: "",
    type: "film",
    status: "draft",
    genres: "",
    poster_url: "",
    backdrop_url: "",
    actors: "",
    directors: "",
    description: "",
    long_description: "",
    seo_title: "",
    seo_description: "",
    faq_json: "",
    trailer_input: "",
    trailer_url: "",
    trailer_embed_url: "",
    trailer_provider: "",
    trailer_key: "",
    trailer_status: "",
    trailer_confidence: "",
    player_links: "",
    rendex_video_id: "",
    moderation_notes: "",
  };
}

function extractRendexVideoIdFromText(value: string) {
  const trimmed = value.trim();
  const fromDataId = trimmed.match(/data-id=["']?([^"'\s>]+)/i)?.[1];
  if (fromDataId) return fromDataId.trim();

  const fromRendexLine = trimmed
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.toLowerCase().includes("| rendex |"));

  if (fromRendexLine) {
    const parts = fromRendexLine
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean);
    const lastPart = parts.at(-1) || "";
    const digits = lastPart.match(/\d+/)?.[0];
    if (digits) return digits;
  }

  return trimmed.match(/\d+/)?.[0] || "";
}

function getRendexContentTypeFromDraftType(type: string) {
  const normalized = type.trim().toLowerCase();
  return normalized === "series" ||
    normalized === "serial" ||
    normalized === "tv" ||
    normalized.includes("сериал")
    ? "series"
    : "movie";
}

function buildCollapsePlayerLineFromKinopoiskId(kinopoiskInput: string) {
  const kinopoiskId = kinopoiskInput.trim().match(/\d+/)?.[0] || "";
  return kinopoiskId ? `Основной | collapse | kp | ${kinopoiskId}` : "";
}

function buildAutoPlayerLinksForDraft(form: ManualDraftForm) {
  const rendexId = extractRendexVideoIdFromText(form.rendex_video_id);
  const kinopoiskId = form.kinopoisk_id.trim().match(/\d+/)?.[0] || "";
  const rendexType = getRendexContentTypeFromDraftType(form.type);
  const lines: string[] = [];
  const collapseLine = buildCollapsePlayerLineFromKinopoiskId(kinopoiskId);

  if (collapseLine) {
    lines.push(collapseLine);
  }

  if (rendexId) {
    lines.push(
      `${kinopoiskId ? "Запасной 1" : "Основной"} | rendex | ${rendexType} | ${rendexId}`,
    );
  }

  if (kinopoiskId) {
    lines.push(
      `${rendexId ? "Запасной 2" : "Запасной 1"} | iframe | https://tarantino.factorios.live/show/kinopoisk/${kinopoiskId}`,
    );
  }

  return lines.join("\n");
}

export default function ImportDashboardClient() {
  const [adminSecret, setAdminSecret] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("new_candidates");
  const [data, setData] = useState<ImportListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [trailerDraft, setTrailerDraft] = useState<Draft | null>(null);
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [editForm, setEditForm] = useState<ManualDraftForm | null>(null);
  const [isAutofillingDraft, setIsAutofillingDraft] = useState(false);

  useEffect(() => {
    window.localStorage.removeItem("kinoluma_admin_secret");
  }, []);

  const visibleDrafts = useMemo(() => {
    const drafts = data?.drafts ?? [];

    if (activeTab === "drafts") {
      return drafts.filter((draft) =>
        ["draft", "needs_ai_seo", "needs_moderation"].includes(
          draft.status ?? "",
        ),
      );
    }

    if (activeTab === "needs_review") {
      return drafts.filter((draft) => draft.status === "needs_review");
    }

    if (activeTab === "ready") {
      return drafts.filter((draft) => draft.status === "ready");
    }

    if (activeTab === "published") {
      return drafts.filter((draft) => draft.status === "published");
    }

    if (activeTab === "errors") {
      return drafts.filter((draft) => draft.status === "rejected");
    }

    return [];
  }, [activeTab, data?.drafts]);

  const newCandidates =
    data?.candidates.filter((candidate) => candidate.status === "new") ?? [];
  const failedCandidates =
    data?.candidates.filter((candidate) => candidate.status === "failed") ?? [];
  const filteredNewCandidates = useMemo(() => {
    const query = candidateSearch.trim().toLowerCase();

    if (!query) return newCandidates;

    return newCandidates.filter((candidate) =>
      [
        candidate.title,
        candidate.original_title,
        candidate.year?.toString(),
        candidate.source_id,
        candidate.type,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [candidateSearch, newCandidates]);
  const totalDrafts = data?.drafts.length ?? 0;
  const readyCount = getDraftCount(data, "ready");
  const profileLevel = Math.max(1, Math.min(99, totalDrafts + 1));
  const progressWidth = Math.min(
    100,
    Math.max(6, Math.round((readyCount / Math.max(totalDrafts, 1)) * 100)),
  );

  async function loadData(secret = adminSecret) {
    if (!secret.trim()) {
      setError("Введи KINOLUMA_ADMIN_SECRET");
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      await fetch("/api/admin/import/cleanup-duplicates", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "x-kinoluma-admin-secret": secret.trim(),
        },
        body: JSON.stringify({
          includeDrafts: true,
          includeAllCandidateStatuses: true,
          deleteCandidateDuplicates: true,
          deleteFailedCandidates: true,
          deleteDraftsWithoutKinopoisk: true,
          deleteRejectedDrafts: true,
        }),
      }).catch(() => null);

      const response = await fetch("/api/admin/import/list", {
        cache: "no-store",
        headers: {
          "x-kinoluma-admin-secret": secret.trim(),
        },
      });

      const payload = (await readJsonResponse(response)) as ImportListResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Не удалось загрузить импорт");
      }

      setAdminSecret(secret.trim());
      setData(payload);
      setMessage("Данные обновлены");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Неизвестная ошибка загрузки",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function runPost(
    path: string,
    body: Record<string, unknown>,
    successMessage: string,
  ) {
    if (!adminSecret.trim()) {
      setError("Введи KINOLUMA_ADMIN_SECRET");
      return;
    }

    setIsWorking(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-kinoluma-admin-secret": adminSecret.trim(),
        },
        body: JSON.stringify(body),
      });

      const payload = (await readJsonResponse(response)) as { ok?: boolean; error?: string; message?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Запрос не выполнен");
      }

      setMessage(payload.message || successMessage);
      await loadData(adminSecret);
      return true;
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Неизвестная ошибка действия",
      );
      return false;
    } finally {
      setIsWorking(false);
    }
  }

  function processNext(candidateId?: string) {
    return runPost(
      "/api/admin/import/process-next",
      candidateId ? { candidateId } : {},
      "Черновик создан",
    );
  }

  function deleteCandidate(candidateId: string) {
    return runPost(
      "/api/admin/import/delete-candidate",
      { candidateId },
      "Кандидат удалён из очереди",
    );
  }

  function moderateDraft(draftId: string) {
    return runPost(
      "/api/admin/import/moderate",
      { draftId },
      "Проверка выполнена",
    );
  }

  function generateSeo(draftId: string) {
    return runPost(
      "/api/admin/import/generate-seo",
      { draftId },
      "AI SEO сгенерировано",
    );
  }

  function generateTemplateSeo(draftId: string) {
    return runPost(
      "/api/admin/import/generate-template-seo",
      { draftId },
      "SEO по шаблону создано",
    );
  }

  function draftAction(draftId: string, action: string, reason?: string) {
    return runPost(
      "/api/admin/import/draft-action",
      { draftId, action, reason },
      "Действие сохранено",
    );
  }

  function openTrailer(draft: Draft) {
    if (!hasTrailer(draft)) {
      setError("У этого черновика нет трейлера для просмотра.");
      return;
    }

    setTrailerDraft(draft);
  }

  function openCreateDraft() {
    setEditingDraft(null);
    setIsCreatingDraft(true);
    setEditForm(createEmptyManualForm());
  }

  function openManualEditor(draft: Draft) {
    setIsCreatingDraft(false);
    setEditingDraft(draft);
    setEditForm(draftToManualForm(draft));
  }

  function updateEditField(field: keyof ManualDraftForm, value: string) {
    setEditForm((current) =>
      current ? { ...current, [field]: value } : current,
    );
  }

  async function autofillManualDraft() {
    if (!editForm) return;

    if (!adminSecret.trim()) {
      setError("Введи KINOLUMA_ADMIN_SECRET");
      return;
    }

    setIsAutofillingDraft(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/import/autofill-draft", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-kinoluma-admin-secret": adminSecret.trim(),
        },
        body: JSON.stringify({ values: editForm }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        values?: Partial<ManualDraftForm>;
      };

      if (!response.ok || !payload.ok || !payload.values) {
        throw new Error(payload.error || "Не удалось автозаполнить карточку");
      }

      const autofillValues = payload.values;

      setEditForm((current) =>
        current
          ? {
              ...current,
              ...autofillValues,
              status: current.status || autofillValues.status || "draft",
            }
          : current,
      );
      setMessage(payload.message || "Карточка автозаполнена");
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Неизвестная ошибка автозаполнения",
      );
    } finally {
      setIsAutofillingDraft(false);
    }
  }

  async function saveManualEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editForm) return;

    const ok = isCreatingDraft
      ? await runPost(
          "/api/admin/import/create-draft",
          { values: editForm },
          "Фильм добавлен в черновики",
        )
      : editingDraft
        ? await runPost(
            "/api/admin/import/update-draft",
            { draftId: editingDraft.id, values: editForm },
            "Черновик обновлён вручную",
          )
        : false;

    if (ok) {
      setEditingDraft(null);
      setIsCreatingDraft(false);
      setEditForm(null);
      setActiveTab("drafts");
    }
  }

  async function deleteEditingDraft() {
    if (!editingDraft) return;

    const title = editingDraft.title || editingDraft.slug || "этот фильм";
    const confirmed = window.confirm(
      `Удалить «${title}» из импортированных фильмов?\n\nФильм пропадёт с сайта и из вкладок импорта. Запись останется в Supabase со статусом deleted, чтобы можно было восстановить её вручную.`,
    );

    if (!confirmed) return;

    const ok = await runPost(
      "/api/admin/import/delete-draft",
      { draftId: editingDraft.id },
      "Фильм удалён из импорта",
    );

    if (ok) {
      setEditingDraft(null);
      setEditForm(null);
    }
  }

  function saveSecretAndLoad() {
    void loadData(adminSecret);
  }

  return (
    <main className="import-page">
      <style>{adminImportStyles}</style>
      <div className="ambient-bg" />

      <header className="topbar">
        <div className="topbar-inner">
          <a href="/" className="brand" aria-label="KinoLuma">
            <img
              src="/kinoluma-icon.png"
              alt="KinoLuma"
              className="logo-mark"
            />
            <div>
              <p className="logo-title">KinoLuma</p>
              <p className="logo-subtitle">Import Admin</p>
            </div>
          </a>

          <div className="top-actions">
            <button
              type="button"
              onClick={openCreateDraft}
              disabled={isLoading || isWorking}
              className="primary-button manual-create-button"
            >
              <PlusCircle size={17} strokeWidth={2.4} aria-hidden="true" />
              Добавить фильм
            </button>
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={isLoading || isWorking}
              className="ghost-button"
            >
              <RefreshCcw size={17} strokeWidth={2.4} aria-hidden="true" />
              Обновить
            </button>
            <a href="/" className="ghost-button">
              <Film size={17} strokeWidth={2.4} aria-hidden="true" />В каталог
            </a>
          </div>
        </div>
      </header>

      <div className="page-shell">
        <section className="hero-grid">
          <aside className="identity-card animate-in">
            <div className="avatar-row">
              <div className="avatar">{getInitials("KinoLuma Import")}</div>
              <div className="user-meta">
                <p className="eyebrow">Пульт</p>
                <h1>Импорт</h1>
                <p>Черновики Supabase</p>
              </div>
            </div>

            <div className="level-card">
              <div className="level-top">
                <div>
                  <p>Готовность импорта</p>
                  <strong>{progressWidth}%</strong>
                </div>
                <span>
                  {totalDrafts
                    ? `${readyCount}/${totalDrafts} ready`
                    : "ожидает данных"}
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${progressWidth}%` }}
                />
              </div>
            </div>

            <div className="mini-stats">
              <div>
                <strong>{data?.counts.newCandidates ?? 0}</strong>
                <span>кандидаты</span>
              </div>
              <div>
                <strong>{totalDrafts}</strong>
                <span>drafts</span>
              </div>
              <div>
                <strong>{readyCount}</strong>
                <span>ready</span>
              </div>
            </div>
          </aside>

          <section className="dashboard-card animate-in delay-1">
            <div className="dashboard-content">
              <p className="eyebrow">KinoLuma Admin</p>
              <h2>Красивый контроль черновиков</h2>
              <p>
                Здесь фильмы проходят путь от найденного кандидата до
                проверенного черновика. Публичный сайт не меняется, пока ты сам
                не подтвердил публикацию.
              </p>

              <div className="dashboard-actions">
                <button
                  type="button"
                  onClick={openCreateDraft}
                  disabled={isLoading || isWorking}
                  className="primary-button"
                >
                  <PlusCircle size={18} strokeWidth={2.4} aria-hidden="true" />
                  Добавить фильм
                </button>
                <button
                  type="button"
                  onClick={() => void loadData()}
                  disabled={isLoading || isWorking}
                  className="primary-button"
                >
                  <RefreshCcw size={18} strokeWidth={2.4} aria-hidden="true" />
                  Обновить данные
                </button>
              </div>
            </div>

            <div className="secret-card">
              <div className="secret-head">
                <KeyRound size={18} strokeWidth={2.4} aria-hidden="true" />
                <div>
                  <p className="eyebrow">Доступ</p>
                  <strong>Admin secret</strong>
                </div>
              </div>

              <label className="secret-field" htmlFor="admin-secret">
                <span>KINOLUMA_ADMIN_SECRET</span>
                <input
                  id="admin-secret"
                  value={adminSecret}
                  onChange={(event) => setAdminSecret(event.target.value)}
                  type="password"
                  placeholder="Вставь секрет"
                />
              </label>

              <button
                type="button"
                onClick={saveSecretAndLoad}
                disabled={isLoading}
                className="primary-button secret-button"
              >
                {isLoading ? "Загрузка..." : "Войти"}
              </button>
            </div>
          </section>
        </section>

        <section className="stats-grid">
          <StatCard
            icon={<Search size={21} strokeWidth={2.4} aria-hidden="true" />}
            title="Новые кандидаты"
            value={data?.counts.newCandidates ?? 0}
            text="Фильмы ждут превращения в черновики."
          />
          <StatCard
            icon={<Wand2 size={21} strokeWidth={2.4} aria-hidden="true" />}
            title="Нужен SEO"
            value={getDraftCount(data, "needs_ai_seo")}
            text="Бесплатный шаблон заполнит SEO без API-токенов."
          />
          <StatCard
            icon={<Eye size={21} strokeWidth={2.4} aria-hidden="true" />}
            title="Нужна проверка"
            value={getDraftCount(data, "needs_review")}
            text="Черновики с сомнениями и низкой уверенностью."
          />
          <StatCard
            icon={
              <CheckCircle2 size={21} strokeWidth={2.4} aria-hidden="true" />
            }
            title="Готово"
            value={readyCount}
            text="Даже готовое публикуется только вручную."
          />
        </section>

        {data ? (
          <section className="integration-grid">
            <ConfigBadge
              icon={<Database size={18} strokeWidth={2.4} aria-hidden="true" />}
              label="TMDB"
              active={data.config.hasTMDB}
            />
            <ConfigBadge
              icon={<Layers3 size={18} strokeWidth={2.4} aria-hidden="true" />}
              label="Kinopoisk.dev"
              active={data.config.hasKinopoisk}
            />
            <ConfigBadge
              icon={<Sparkles size={18} strokeWidth={2.4} aria-hidden="true" />}
              label="Template SEO"
              active={data.config.hasTemplateSeo}
            />
            <ConfigBadge
              icon={<Bot size={18} strokeWidth={2.4} aria-hidden="true" />}
              label="OpenAI SEO"
              active={data.config.hasOpenAI}
            />
            <ConfigBadge
              icon={
                <PlayCircle size={18} strokeWidth={2.4} aria-hidden="true" />
              }
              label="Vibix API"
              active={data.config.hasVibix}
            />
          </section>
        ) : null}

        <nav className="tabs-card" aria-label="Разделы импорта">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={
                activeTab === tab.id
                  ? "tab-button tab-button-active"
                  : "tab-button"
              }
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {message ? <Notice tone="success" text={message} /> : null}
        {error ? <Notice tone="error" text={error} /> : null}

        <section className="section-card content-section animate-in">
          <div className="section-head">
            <div>
              <p className="eyebrow">{getTabEyebrow(activeTab)}</p>
              <h2>{getTabTitle(activeTab)}</h2>
            </div>
            <span className="count-pill">
              {getActiveCount(
                activeTab,
                data,
                filteredNewCandidates,
                visibleDrafts,
              )}
            </span>
          </div>

          {activeTab === "new_candidates" ? (
            <CandidateList
              candidates={filteredNewCandidates}
              totalCount={newCandidates.length}
              searchValue={candidateSearch}
              onSearchChange={setCandidateSearch}
              isWorking={isWorking}
              onProcess={processNext}
              onDelete={deleteCandidate}
            />
          ) : null}

          {activeTab === "runs" ? <RunList runs={data?.runs ?? []} /> : null}

          {activeTab === "errors" ? (
            <>
              <DraftList
                drafts={visibleDrafts}
                configHasOpenAI={Boolean(data?.config.hasOpenAI)}
                isWorking={isWorking}
                onModerate={moderateDraft}
                onGenerateSeo={generateSeo}
                onGenerateTemplateSeo={generateTemplateSeo}
                onOpenTrailer={openTrailer}
                onManualEdit={openManualEditor}
                onAction={draftAction}
              />
              {failedCandidates.length ? (
                <div className="failed-candidates">
                  <div className="section-head compact">
                    <div>
                      <p className="eyebrow">Кандидаты</p>
                      <h2>Ошибки кандидатов</h2>
                    </div>
                    <span className="count-pill">
                      {failedCandidates.length}
                    </span>
                  </div>
                  <CandidateList
                    candidates={failedCandidates}
                    isWorking={isWorking}
                    onProcess={processNext}
                    onDelete={deleteCandidate}
                  />
                </div>
              ) : null}
            </>
          ) : null}

          {["drafts", "needs_review", "ready", "published"].includes(
            activeTab,
          ) ? (
            <DraftList
              drafts={visibleDrafts}
              configHasOpenAI={Boolean(data?.config.hasOpenAI)}
              isWorking={isWorking}
              onModerate={moderateDraft}
              onGenerateSeo={generateSeo}
              onGenerateTemplateSeo={generateTemplateSeo}
              onOpenTrailer={openTrailer}
              onManualEdit={openManualEditor}
              onAction={draftAction}
            />
          ) : null}
        </section>
      </div>

      {trailerDraft ? (
        <TrailerModal
          draft={trailerDraft}
          onClose={() => setTrailerDraft(null)}
        />
      ) : null}

      {(isCreatingDraft || editingDraft) && editForm ? (
        <ManualEditModal
          draft={editingDraft}
          isNew={isCreatingDraft}
          form={editForm}
          isWorking={isWorking}
          isAutofilling={isAutofillingDraft}
          onChange={updateEditField}
          onAutofill={autofillManualDraft}
          onClose={() => {
            setEditingDraft(null);
            setIsCreatingDraft(false);
            setEditForm(null);
          }}
          onSave={saveManualEdit}
          onDelete={editingDraft ? () => void deleteEditingDraft() : undefined}
        />
      ) : null}
    </main>
  );
}

function getTabEyebrow(tab: TabId) {
  const map: Record<TabId, string> = {
    new_candidates: "Очередь",
    drafts: "Draft board",
    needs_review: "Контроль качества",
    ready: "Финальный этап",
    published: "История",
    errors: "Диагностика",
    runs: "Cron",
  };

  return map[tab];
}

function getTabTitle(tab: TabId) {
  const map: Record<TabId, string> = {
    new_candidates: "Новые кандидаты",
    drafts: "Черновики",
    needs_review: "Нужна проверка",
    ready: "Готово к публикации",
    published: "Опубликовано",
    errors: "Ошибки",
    runs: "Запуски импорта",
  };

  return map[tab];
}

function getActiveCount(
  tab: TabId,
  data: ImportListResponse | null,
  candidates: Candidate[],
  drafts: Draft[],
) {
  if (tab === "new_candidates") return candidates.length;
  if (tab === "runs") return data?.runs.length ?? 0;
  if (tab === "errors")
    return (
      drafts.length +
      (data?.candidates.filter((candidate) => candidate.status === "failed")
        .length ?? 0)
    );
  return drafts.length;
}

function StatCard({
  title,
  value,
  text,
  icon,
}: {
  title: string;
  value: number;
  text: string;
  icon: ReactNode;
}) {
  return (
    <article className="stat-card">
      <div className="stat-icon">{icon}</div>
      <p className="stat-title">{title}</p>
      <p className="stat-value">{value}</p>
      <p className="stat-text">{text}</p>
    </article>
  );
}

function ConfigBadge({
  label,
  active,
  icon,
}: {
  label: string;
  active: boolean;
  icon: ReactNode;
}) {
  return (
    <article className="config-card">
      <div className="config-icon">{icon}</div>
      <div>
        <p>{label}</p>
        <span>{active ? "Подключён" : "Не подключён"}</span>
      </div>
      <StatusPill status={active ? "ready" : "needs_review"} />
    </article>
  );
}

function StatusPill({ status }: { status: string | null }) {
  return (
    <span className={`status-pill status-${statusTone(status)}`}>
      {statusLabel(status)}
    </span>
  );
}

function Notice({ tone, text }: { tone: "success" | "error"; text: string }) {
  return (
    <div
      className={
        tone === "success" ? "notice notice-success" : "notice notice-error"
      }
    >
      {tone === "success" ? (
        <Check size={17} strokeWidth={2.4} aria-hidden="true" />
      ) : (
        <X size={17} strokeWidth={2.4} aria-hidden="true" />
      )}
      <span>{text}</span>
    </div>
  );
}

function CandidateList({
  candidates,
  totalCount,
  searchValue = "",
  onSearchChange,
  isWorking,
  onProcess,
  onDelete,
}: {
  candidates: Candidate[];
  totalCount?: number;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  isWorking: boolean;
  onProcess: (candidateId?: string) => void;
  onDelete: (candidateId: string) => void;
}) {
  const isFiltering = Boolean(searchValue.trim());

  return (
    <>
      {onSearchChange ? (
        <div className="candidate-search-card">
          <div>
            <p className="eyebrow">Поиск</p>
            <strong>Найти кандидата по названию</strong>
            <span>
              Показано {candidates.length} из {totalCount ?? candidates.length}
            </span>
          </div>

          <label className="candidate-search-field">
            <Search size={18} strokeWidth={2.4} aria-hidden="true" />
            <input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Например: Обсессия, Backrooms, 2026..."
            />
          </label>
        </div>
      ) : null}

      {!candidates.length ? (
        <EmptyState
          icon={<Search size={24} strokeWidth={2.4} aria-hidden="true" />}
          title={isFiltering ? "Ничего не найдено" : "Новых кандидатов нет"}
          text={
            isFiltering
              ? "Попробуй другое название, год или original title."
              : "Запусти cron discover-movies или вернись позже, когда очередь пополнится."
          }
        />
      ) : (
        <div className="candidate-grid">
          {candidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              isWorking={isWorking}
              onProcess={onProcess}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </>
  );
}

function CandidateCard({
  candidate,
  isWorking,
  onProcess,
  onDelete,
}: {
  candidate: Candidate;
  isWorking: boolean;
  onProcess: (candidateId?: string) => void;
  onDelete: (candidateId: string) => void;
}) {
  const poster =
    candidate.poster_url ||
    candidate.backdrop_url ||
    createGeneratedPoster(
      candidate.title || "KinoLuma",
      candidate.original_title || "Candidate",
      candidate.type || "movie",
    );

  return (
    <article className="candidate-card">
      <img
        src={candidate.backdrop_url || poster}
        alt=""
        className="candidate-backdrop"
        aria-hidden="true"
      />

      <div className="candidate-main">
        <div className="candidate-poster-wrap">
          <img
            src={poster}
            alt={candidate.title || "Постер кандидата"}
            className="candidate-poster"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = createGeneratedPoster(
                candidate.title || "KinoLuma",
                candidate.original_title || "Candidate",
                candidate.type || "movie",
              );
            }}
          />
        </div>

        <div className="candidate-content">
          <div className="candidate-head">
            <div>
              <p className="eyebrow">{candidate.source || "source"}</p>
              <h3>{candidate.title || "Без названия"}</h3>
              <p>{candidate.original_title || "—"}</p>
            </div>
            <StatusPill status={candidate.status} />
          </div>

          <div className="info-grid candidate-info">
            <Info label="Год" value={candidate.year?.toString() ?? "—"} />
            <Info label="Тип" value={candidate.type ?? "—"} />
            <Info label="ID" value={candidate.source_id ?? "—"} />
            <Info label="Создан" value={formatDate(candidate.created_at)} />
          </div>

          <div className="candidate-card-actions">
            <button
              type="button"
              onClick={() => onProcess(candidate.id)}
              disabled={isWorking}
              className="primary-button card-button"
            >
              <Sparkles size={17} strokeWidth={2.4} aria-hidden="true" />
              Создать черновик
            </button>
            <button
              type="button"
              onClick={() => {
                const title = candidate.title || candidate.original_title || "кандидат";
                const confirmed = window.confirm(
                  `Удалить «${title}» из кандидатов? Он не уйдёт в ошибки и исчезнет из очереди.`,
                );
                if (confirmed) onDelete(candidate.id);
              }}
              disabled={isWorking}
              className="secondary-button danger-action card-button"
            >
              <Trash2 size={17} strokeWidth={2.4} aria-hidden="true" />
              Удалить
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function DraftList({
  drafts,
  configHasOpenAI,
  isWorking,
  onModerate,
  onGenerateSeo,
  onGenerateTemplateSeo,
  onOpenTrailer,
  onManualEdit,
  onAction,
}: {
  drafts: Draft[];
  configHasOpenAI: boolean;
  isWorking: boolean;
  onModerate: (draftId: string) => void;
  onGenerateSeo: (draftId: string) => void;
  onGenerateTemplateSeo: (draftId: string) => void;
  onOpenTrailer: (draft: Draft) => void;
  onManualEdit: (draft: Draft) => void;
  onAction: (draftId: string, action: string, reason?: string) => void;
}) {
  if (!drafts.length) {
    return (
      <EmptyState
        icon={<Film size={24} strokeWidth={2.4} aria-hidden="true" />}
        title="Здесь пока пусто"
        text="Когда появятся подходящие черновики, они будут показаны здесь красивыми карточками, а не таблицей из подвала."
      />
    );
  }

  return (
    <div className="draft-list">
      {drafts.map((draft) => (
        <DraftCard
          key={draft.id}
          draft={draft}
          configHasOpenAI={configHasOpenAI}
          isWorking={isWorking}
          onModerate={onModerate}
          onGenerateSeo={onGenerateSeo}
          onGenerateTemplateSeo={onGenerateTemplateSeo}
          onOpenTrailer={onOpenTrailer}
          onManualEdit={onManualEdit}
          onAction={onAction}
        />
      ))}
    </div>
  );
}

function DraftCard({
  draft,
  configHasOpenAI,
  isWorking,
  onModerate,
  onGenerateSeo,
  onGenerateTemplateSeo,
  onOpenTrailer,
  onManualEdit,
  onAction,
}: {
  draft: Draft;
  configHasOpenAI: boolean;
  isWorking: boolean;
  onModerate: (draftId: string) => void;
  onGenerateSeo: (draftId: string) => void;
  onGenerateTemplateSeo: (draftId: string) => void;
  onOpenTrailer: (draft: Draft) => void;
  onManualEdit: (draft: Draft) => void;
  onAction: (draftId: string, action: string, reason?: string) => void;
}) {
  const poster =
    draft.poster_url ||
    createGeneratedPoster(
      draft.title || "KinoLuma",
      draft.original_title || "Draft",
      draft.type || "movie",
    );
  const backdrop = draft.backdrop_url || draft.poster_url || "";
  const score = Math.max(0, Math.min(100, draft.quality_score ?? 0));
  const checklist = [
    { label: "SEO title", ready: isFeatureReady(draft.seo_title) },
    {
      label: "Long description",
      ready: isFeatureReady(draft.long_description),
    },
    { label: "FAQ", ready: isFeatureReady(draft.faq) },
    {
      label: "Трейлер",
      ready: draft.trailer_status === "accepted" || Boolean(draft.trailer_key),
    },
    { label: "Жанры", ready: isFeatureReady(draft.genres) },
  ];

  return (
    <article className="draft-card">
      {backdrop ? (
        <img
          src={backdrop}
          alt=""
          className="draft-backdrop"
          aria-hidden="true"
        />
      ) : null}
      <div className="draft-poster-wrap">
        <img
          src={poster}
          alt={draft.title || "Постер"}
          className="draft-poster"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = createGeneratedPoster(
              draft.title || "KinoLuma",
              draft.original_title || "Draft",
              draft.type || "movie",
            );
          }}
        />
        <div className="poster-glow" />
      </div>

      <div className="draft-content">
        <div className="draft-topline">
          <div className="draft-title-block">
            <p className="eyebrow">{draft.source || "draft"}</p>
            <h3>{draft.title || "Без названия"}</h3>
            <p>
              {draft.original_title || "—"} · {draft.year || "—"} ·{" "}
              {draft.type || "—"}
            </p>
          </div>
          <StatusPill status={draft.status} />
        </div>

        <div className="draft-actions-top">
          <button
            type="button"
            onClick={() => onGenerateTemplateSeo(draft.id)}
            disabled={
              isWorking ||
              draft.status === "published" ||
              draft.status === "rejected"
            }
            title="Бесплатно заполнить long description, SEO title, SEO description и FAQ по шаблону. Факты не меняются."
            className="primary-button compact-action"
          >
            <Sparkles size={16} strokeWidth={2.4} aria-hidden="true" />
            SEO по шаблону
          </button>
          <button
            type="button"
            onClick={() => onGenerateSeo(draft.id)}
            disabled={
              !configHasOpenAI ||
              isWorking ||
              draft.status === "published" ||
              draft.status === "rejected"
            }
            title={
              configHasOpenAI
                ? "Сгенерировать SEO через OpenAI, если когда-нибудь подключишь API"
                : "OPENAI_API_KEY не подключён. Используй бесплатное SEO по шаблону."
            }
            className="secondary-button compact-action"
          >
            <Wand2 size={16} strokeWidth={2.4} aria-hidden="true" />
            AI SEO
          </button>
          <button
            type="button"
            onClick={() => onModerate(draft.id)}
            disabled={isWorking}
            className="secondary-button compact-action"
          >
            <Eye size={16} strokeWidth={2.4} aria-hidden="true" />
            Проверить
          </button>
          <button
            type="button"
            onClick={() => onOpenTrailer(draft)}
            disabled={isWorking || !hasTrailer(draft)}
            title={
              hasTrailer(draft)
                ? "Открыть трейлер в админке"
                : "Трейлер не найден"
            }
            className="secondary-button compact-action"
          >
            <PlayCircle size={16} strokeWidth={2.4} aria-hidden="true" />
            Открыть трейлер
          </button>
          <button
            type="button"
            disabled
            title="Перепоиск трейлера добавим отдельным endpoint"
            className="secondary-button compact-action muted-action"
          >
            <RefreshCcw size={16} strokeWidth={2.4} aria-hidden="true" />
            Найти трейлер заново
          </button>
        </div>

        <p className="draft-description">{shortText(draft.description, 260)}</p>

        <div className="genre-row">
          {(draft.genres ?? []).length ? (
            draft.genres
              ?.slice(0, 8)
              .map((genre) => <span key={genre}>{genre}</span>)
          ) : (
            <span className="genre-warning">Жанры не найдены</span>
          )}
        </div>

        <div className="draft-layout-grid">
          <div className="info-grid">
            <Info label="TMDB" value={draft.tmdb_id?.toString() ?? "—"} />
            <Info label="IMDb" value={draft.imdb_id ?? "—"} />
            <Info
              label="Кинопоиск"
              value={draft.kinopoisk_id?.toString() ?? "—"}
            />
            <Info
              label="Рейтинг"
              value={draft.movie_rating ? draft.movie_rating.toString() : "—"}
            />
            <Info label="Slug" value={draft.slug ?? "—"} />
            <Info
              label="Trailer"
              value={`${statusLabel(draft.trailer_status)} · ${draft.trailer_confidence ?? 0}`}
            />
            <Info
              label="FAQ"
              value={
                Array.isArray(draft.faq) && draft.faq.length
                  ? `${draft.faq.length}`
                  : "Нет"
              }
            />
            <Info
              label="Плееры"
              value={draft.player_links?.trim() ? "Есть" : "Нет"}
            />
          </div>

          <div className="quality-card">
            <div className="quality-head">
              <Gauge size={18} strokeWidth={2.4} aria-hidden="true" />
              <div>
                <p>Quality score</p>
                <strong>
                  {draft.quality_score === null
                    ? "Не проверено"
                    : `${draft.quality_score} / 100`}
                </strong>
              </div>
            </div>
            <div className="progress-track small">
              <div
                className="progress-fill"
                style={{ width: `${score || 6}%` }}
              />
            </div>
            <div className="check-list">
              {checklist.map((item) => (
                <span
                  key={item.label}
                  className={item.ready ? "check-item ready" : "check-item"}
                >
                  {item.ready ? (
                    <Check size={13} strokeWidth={3} aria-hidden="true" />
                  ) : (
                    <X size={13} strokeWidth={3} aria-hidden="true" />
                  )}
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {draft.moderation_notes ? (
          <div className="moderation-card">
            <p className="eyebrow">Заметки модерации</p>
            <pre>{draft.moderation_notes}</pre>
          </div>
        ) : null}

        <div className="draft-actions-bottom">
          <button
            type="button"
            onClick={() => onAction(draft.id, "publish_safe_click")}
            disabled={isWorking || draft.status !== "ready"}
            title="Публикует черновик вручную: статус станет published, публичная страница и sitemap обновятся"
            className="primary-button"
          >
            <ShieldCheck size={17} strokeWidth={2.4} aria-hidden="true" />
            Опубликовать
          </button>
          <button
            type="button"
            onClick={() => onAction(draft.id, "mark_ready")}
            disabled={isWorking}
            className="secondary-button good-action"
          >
            <CheckCircle2 size={17} strokeWidth={2.4} aria-hidden="true" />
            Готово
          </button>
          <button
            type="button"
            onClick={() => onAction(draft.id, "wrong_trailer")}
            disabled={isWorking}
            className="secondary-button"
          >
            Неверный трейлер
          </button>
          <button
            type="button"
            onClick={() => onAction(draft.id, "bad_description")}
            disabled={isWorking}
            className="secondary-button"
          >
            Плохое описание
          </button>
          <button
            type="button"
            onClick={() => onAction(draft.id, "duplicate")}
            disabled={isWorking}
            className="secondary-button"
          >
            <CopyCheck size={17} strokeWidth={2.4} aria-hidden="true" />
            Дубль
          </button>
          <button
            type="button"
            onClick={() => onAction(draft.id, "reject")}
            disabled={isWorking}
            className="secondary-button danger-action"
          >
            <Trash2 size={17} strokeWidth={2.4} aria-hidden="true" />
            Отклонить
          </button>
          <button
            type="button"
            onClick={() => onManualEdit(draft)}
            disabled={isWorking}
            className="secondary-button"
          >
            <Edit3 size={17} strokeWidth={2.4} aria-hidden="true" />
            Исправить вручную
          </button>
        </div>
      </div>
    </article>
  );
}

function TrailerModal({
  draft,
  onClose,
}: {
  draft: Draft;
  onClose: () => void;
}) {
  const embedUrl = getTrailerEmbedUrl(draft);
  const externalUrl = getTrailerExternalUrl(draft);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <section
        className="modal-panel trailer-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-head">
          <div>
            <p className="eyebrow">Трейлер</p>
            <h3>{draft.title || "Без названия"}</h3>
            <span>
              {draft.trailer_provider || "video"} ·{" "}
              {statusLabel(draft.trailer_status)} · confidence{" "}
              {draft.trailer_confidence ?? 0}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="icon-close"
            aria-label="Закрыть"
          >
            <X size={20} strokeWidth={2.8} aria-hidden="true" />
          </button>
        </div>

        {embedUrl ? (
          <div className="trailer-frame-wrap">
            <iframe
              src={embedUrl}
              title={`Трейлер: ${draft.title || "KinoLuma"}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="empty-state compact-empty">
            <div className="empty-icon">
              <PlayCircle size={24} strokeWidth={2.4} aria-hidden="true" />
            </div>
            <h3>Встраивание недоступно</h3>
            <p>Можно открыть трейлер во внешней вкладке.</p>
          </div>
        )}

        <div className="modal-actions">
          {externalUrl ? (
            <a
              href={externalUrl}
              target="_blank"
              rel="noreferrer"
              className="primary-button"
            >
              <ExternalLink size={17} strokeWidth={2.4} aria-hidden="true" />
              Открыть на YouTube
            </a>
          ) : null}
          <button type="button" onClick={onClose} className="secondary-button">
            Закрыть
          </button>
        </div>
      </section>
    </div>
  );
}

function ManualEditModal({
  draft,
  isNew,
  form,
  isWorking,
  isAutofilling,
  onChange,
  onAutofill,
  onClose,
  onSave,
  onDelete,
}: {
  draft: Draft | null;
  isNew: boolean;
  form: ManualDraftForm;
  isWorking: boolean;
  isAutofilling: boolean;
  onChange: (field: keyof ManualDraftForm, value: string) => void;
  onAutofill: () => void;
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onDelete?: () => void;
}) {
  const modalTitle = isNew ? "Новый фильм" : draft?.title || "Черновик";
  const isBusy = isWorking || isAutofilling;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form
        className="modal-panel edit-modal"
        onClick={(event) => event.stopPropagation()}
        onSubmit={onSave}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-head">
          <div>
            <p className="eyebrow">{isNew ? "Добавление фильма" : "Ручная правка"}</p>
            <h3>{modalTitle}</h3>
            <span>
              Изменения сохранятся в Supabase и попадут в agent_feedback.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="icon-close"
            aria-label="Закрыть"
          >
            <X size={20} strokeWidth={2.8} aria-hidden="true" />
          </button>
        </div>

        <div className="edit-grid">
          <EditField
            label="Название"
            value={form.title}
            onChange={(value) => onChange("title", value)}
          />
          <EditField
            label="Оригинальное название"
            value={form.original_title}
            onChange={(value) => onChange("original_title", value)}
          />
          <EditField
            label="Slug"
            value={form.slug}
            onChange={(value) => onChange("slug", value)}
          />
          <EditField
            label="Год"
            value={form.year}
            onChange={(value) => onChange("year", value)}
          />
          <EditField
            label="Кинопоиск ID"
            value={form.kinopoisk_id}
            onChange={(value) => onChange("kinopoisk_id", value)}
            placeholder="например 535341"
          />
          <EditField
            label="TMDB ID"
            value={form.tmdb_id}
            onChange={(value) => onChange("tmdb_id", value)}
            placeholder="например 940721"
          />
          <EditField
            label="IMDb ID"
            value={form.imdb_id}
            onChange={(value) => onChange("imdb_id", value)}
            placeholder="например tt23289160"
          />
          <EditField
            label="Рейтинг фильма"
            value={form.rating}
            onChange={(value) => onChange("rating", value)}
            placeholder="например 7.4"
          />
          <EditChoiceGroup
            label="Тип"
            value={form.type || "film"}
            onChange={(value) => onChange("type", value)}
            options={manualTypeOptions}
          />
          <EditChoiceGroup
            label="Статус"
            value={form.status || "draft"}
            onChange={(value) => onChange("status", value)}
            options={manualStatusOptions}
          />
          <div className="autofill-panel wide">
            <button
              type="button"
              onClick={onAutofill}
              disabled={isBusy}
              className="secondary-button compact-action"
            >
              <Sparkles size={16} strokeWidth={2.4} aria-hidden="true" />
              {isAutofilling ? "Ищу данные..." : "Автозаполнить"}
            </button>
            <div>
              <strong>Факты, описание, SEO и FAQ</strong>
              <span>
                По названию, году, Kinopoisk ID, TMDB ID или IMDb ID подтянет данные из TMDB/Kinopoisk и заполнит карточку.
              </span>
            </div>
          </div>
          <EditField
            label="Жанры через запятую"
            value={form.genres}
            onChange={(value) => onChange("genres", value)}
            className="wide"
          />
          <EditField
            label="Постер URL"
            value={form.poster_url}
            onChange={(value) => onChange("poster_url", value)}
            placeholder="https://..."
            className="wide"
          />
          <EditField
            label="Backdrop URL"
            value={form.backdrop_url}
            onChange={(value) => onChange("backdrop_url", value)}
            placeholder="https://..."
            className="wide"
          />
          <EditField
            label="Актёры через запятую"
            value={form.actors}
            onChange={(value) => onChange("actors", value)}
            className="wide"
          />
          <EditField
            label="Режиссёры через запятую"
            value={form.directors}
            onChange={(value) => onChange("directors", value)}
            className="wide"
          />
          <EditField
            label="SEO title"
            value={form.seo_title}
            onChange={(value) => onChange("seo_title", value)}
            className="wide"
          />
          <EditField
            label="SEO description"
            value={form.seo_description}
            onChange={(value) => onChange("seo_description", value)}
            className="wide"
          />
          <div className="trailer-simple-field wide">
            <EditField
              label="Трейлер"
              value={form.trailer_input}
              onChange={(value) => onChange("trailer_input", value)}
              placeholder="Вставь YouTube-ссылку, embed-ссылку, iframe или ID видео"
              className="wide"
            />
            <p className="field-helper">
              Одного поля достаточно: можно вставить обычную ссылку вида youtube.com/watch?v=..., youtu.be/..., embed URL или iframe-код.
            </p>
          </div>
          <EditField
            label="Rendex ID или <ins>"
            value={form.rendex_video_id}
            onChange={(value) => onChange("rendex_video_id", value)}
            placeholder={
              '150669 или <ins data-publisher-id="678053396" data-type="movie" data-id="150669"></ins>'
            }
            className="wide"
          />
          <div className="player-generator-row wide">
            <button
              type="button"
              onClick={() => {
                const generated = buildAutoPlayerLinksForDraft(form);
                if (generated) onChange("player_links", generated);
              }}
              className="secondary-button compact-action"
            >
              <Sparkles size={16} strokeWidth={2.4} aria-hidden="true" />
              Сгенерировать плееры
            </button>
            <span>
              Основной — Collapse, запасной 1 — Rendex, запасной 2 — Factorios
              по Kinopoisk ID.
            </span>
          </div>
          <EditTextarea
            label="Плееры фильма"
            value={form.player_links}
            onChange={(value) => onChange("player_links", value)}
            placeholder={
              "Основной | collapse | kp | 1219177\nЗапасной 1 | rendex | movie | 150669\nЗапасной 2 | iframe | https://tarantino.factorios.live/show/kinopoisk/1219177"
            }
          />
          <EditTextarea
            label="Описание"
            value={form.description}
            onChange={(value) => onChange("description", value)}
          />
          <EditTextarea
            label="Long description"
            value={form.long_description}
            onChange={(value) => onChange("long_description", value)}
          />
          <EditTextarea
            label="FAQ JSON"
            value={form.faq_json}
            onChange={(value) => onChange("faq_json", value)}
            placeholder='[{"question":"...","answer":"..."}]'
          />
          <EditTextarea
            label="Заметки модерации"
            value={form.moderation_notes}
            onChange={(value) => onChange("moderation_notes", value)}
          />
        </div>

        <div className="modal-actions sticky-actions">
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={isBusy}
              className="secondary-button danger-action delete-draft-button"
            >
              <Trash2 size={17} strokeWidth={2.4} aria-hidden="true" />
              Удалить фильм
            </button>
          ) : null}
          <div className="modal-save-actions">
            <button
              type="submit"
              disabled={isBusy}
              className="primary-button"
            >
              <Save size={17} strokeWidth={2.4} aria-hidden="true" />
              {isWorking ? "Сохраняю..." : "Сохранить изменения"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="secondary-button"
            >
              Отмена
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  placeholder,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`edit-field ${className}`}>
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function EditChoiceGroup({
  label,
  value,
  onChange,
  options,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <fieldset className={`edit-field choice-field ${className}`}>
      <legend>{label}</legend>
      <div className="choice-grid">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={option.value === value ? "choice-option active" : "choice-option"}
            onClick={() => onChange(option.value)}
            aria-pressed={option.value === value}
          >
            <strong>{option.label}</strong>
            {option.value === value ? (
              <Check size={14} strokeWidth={3} aria-hidden="true" />
            ) : null}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function EditTextarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="edit-field wide">
      <span>{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={5}
      />
    </label>
  );
}

function RunList({ runs }: { runs: ImportRun[] }) {
  if (!runs.length) {
    return (
      <EmptyState
        icon={<Activity size={24} strokeWidth={2.4} aria-hidden="true" />}
        title="Запусков пока нет"
        text="После cron discover-movies здесь появится история запусков."
      />
    );
  }

  return (
    <div className="run-list">
      {runs.map((run) => (
        <article key={run.id} className="run-card">
          <div className="run-head">
            <div>
              <p className="eyebrow">Cron</p>
              <h3>Запуск импорта</h3>
              <p>{formatDate(run.started_at)}</p>
            </div>
            <StatusPill status={run.status} />
          </div>
          <div className="info-grid run-info">
            <Info label="Найдено" value={run.found_count?.toString() ?? "0"} />
            <Info
              label="Создано drafts"
              value={run.created_drafts_count?.toString() ?? "0"}
            />
            <Info label="Ошибок" value={run.failed_count?.toString() ?? "0"} />
            <Info label="Завершён" value={formatDate(run.finished_at)} />
          </div>
          {run.log ? (
            <pre className="log-card">{formatLog(run.log)}</pre>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-card">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

const adminImportStyles = `
  * {
    box-sizing: border-box;
  }

  .import-page {
    min-height: 100vh;
    background: #050505;
    color: #ffffff;
    overflow-x: hidden;
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

  .brand {
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

  .top-actions,
  .dashboard-actions,
  .candidate-card-actions,
  .draft-actions-top,
  .draft-actions-bottom {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }

  .candidate-card-actions {
    margin-top: 14px;
  }

  .ghost-button,
  .primary-button,
  .secondary-button,
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
    transition: transform 180ms ease, background 180ms ease, color 180ms ease, border-color 180ms ease;
  }

  .ghost-button:hover,
  .ghost-button:focus-visible {
    transform: translateY(-1px);
    border-color: rgba(255,255,255,0.35);
    background: #ffffff;
    color: #000000;
    outline: none;
  }

  .page-shell {
    position: relative;
    z-index: 1;
    width: min(1180px, calc(100% - 40px));
    margin: 0 auto;
    padding: 28px 0 56px;
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
  .candidate-card,
  .draft-card,
  .run-card,
  .config-card,
  .empty-state {
    border: 1px solid rgba(255,255,255,0.10);
    background:
      linear-gradient(145deg, rgba(28,28,28,0.82), rgba(8,8,8,0.92)),
      #0b0b0b;
    box-shadow: 0 30px 90px rgba(0,0,0,0.42);
    backdrop-filter: blur(20px);
  }

  .identity-card {
    min-height: 360px;
    padding: 22px;
    border-radius: 30px;
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
    font-size: 30px;
    font-weight: 1000;
    letter-spacing: -0.08em;
    box-shadow: 0 18px 48px rgba(255,255,255,0.10), inset 0 -10px 20px rgba(0,0,0,0.12);
  }

  .user-meta {
    min-width: 0;
  }

  .eyebrow {
    margin: 0;
    color: #858585;
    font-size: 12px;
    font-weight: 1000;
    letter-spacing: 0.32em;
    text-transform: uppercase;
  }

  .user-meta h1,
  .section-head h2,
  .dashboard-content h2,
  .draft-title-block h3,
  .candidate-card h3,
  .run-head h3 {
    font-weight: 1000;
    letter-spacing: -0.06em;
  }

  .user-meta h1 {
    margin: 8px 0 0;
    font-size: 30px;
    line-height: 1;
  }

  .user-meta p:last-child {
    margin: 8px 0 0;
    color: #8a8a8a;
    font-size: 13px;
    font-weight: 800;
  }

  .level-card,
  .secret-card,
  .quality-card,
  .moderation-card {
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.46);
  }

  .level-card {
    margin-top: 22px;
    padding: 18px;
    border-radius: 24px;
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
    max-width: 140px;
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
    height: 8px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(255,255,255,0.07);
    margin-top: 18px;
  }

  .progress-track.small {
    margin-top: 14px;
    height: 7px;
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
    grid-template-columns: minmax(0, 1fr) 290px;
    gap: 24px;
    align-items: stretch;
  }

  .dashboard-card::before {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 18% 20%, rgba(255,255,255,0.10), transparent 28%), linear-gradient(135deg, rgba(255,255,255,0.06), transparent 38%);
    opacity: 0.9;
  }

  .dashboard-content,
  .secret-card {
    position: relative;
    z-index: 1;
  }

  .dashboard-content h2 {
    margin: 18px 0 0;
    max-width: 660px;
    font-size: clamp(38px, 5vw, 68px);
    line-height: 0.94;
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
  }

  .secret-card {
    border-radius: 26px;
    padding: 18px;
    align-self: stretch;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 16px;
  }

  .secret-head {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .secret-head > svg,
  .config-icon,
  .stat-icon,
  .empty-icon {
    width: 42px;
    height: 42px;
    padding: 11px;
    border-radius: 16px;
    background: rgba(255,255,255,0.08);
    color: #ffffff;
  }

  .secret-head strong {
    display: block;
    margin-top: 5px;
    font-size: 16px;
    font-weight: 1000;
  }

  .secret-field {
    display: grid;
    gap: 8px;
  }

  .secret-field span {
    color: #8c8c8c;
    font-size: 11px;
    font-weight: 1000;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .secret-field input {
    min-height: 48px;
    width: 100%;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.05);
    color: #ffffff;
    padding: 0 15px;
    font: inherit;
    font-size: 14px;
    outline: none;
    transition: border-color 180ms ease, background 180ms ease;
  }

  .secret-field input:focus {
    border-color: rgba(255,255,255,0.38);
    background: rgba(255,255,255,0.075);
  }

  .secret-button {
    width: 100%;
  }

  .primary-button,
  .secondary-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    min-height: 48px;
    border-radius: 16px;
    padding: 0 20px;
    font-size: 14px;
    font-weight: 1000;
    transition: transform 180ms ease, background 180ms ease, color 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
  }

  .primary-button {
    background: #ffffff;
    color: #000000;
    border: 1px solid #ffffff;
  }

  .manual-create-button {
    min-height: 42px;
    padding: 0 16px;
    border-radius: 14px;
  }

  .primary-button:hover:not(:disabled),
  .primary-button:focus-visible:not(:disabled) {
    transform: translateY(-2px);
    background: #000000;
    color: #ffffff;
    box-shadow: 0 0 28px rgba(255,255,255,0.16);
    outline: none;
  }

  .secondary-button {
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(0,0,0,0.38);
    color: #ededed;
  }

  .secondary-button:hover:not(:disabled),
  .secondary-button:focus-visible:not(:disabled) {
    transform: translateY(-2px);
    border-color: rgba(255,255,255,0.32);
    background: rgba(255,255,255,0.08);
    outline: none;
  }

  button:disabled,
  .primary-button:disabled,
  .secondary-button:disabled {
    cursor: not-allowed;
    opacity: 0.48;
    transform: none;
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
    transition: transform 220ms ease, border-color 220ms ease, background 220ms ease;
  }

  .stat-card:hover {
    transform: translateY(-4px);
    border-color: rgba(255,255,255,0.26);
    background: linear-gradient(145deg, rgba(36,36,36,0.92), rgba(8,8,8,0.95)), #0b0b0b;
  }

  .stat-icon {
    display: grid;
    place-items: center;
  }

  .stat-title {
    margin: 16px 0 0;
    color: #8e8e8e;
    font-size: 13px;
    font-weight: 1000;
  }

  .stat-value {
    margin: 8px 0 0;
    font-size: 38px;
    line-height: 1;
    font-weight: 1000;
    letter-spacing: -0.06em;
  }

  .stat-text {
    margin: 10px 0 0;
    color: #747474;
    font-size: 13px;
    line-height: 1.55;
    font-weight: 700;
  }

  .integration-grid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .config-card {
    min-height: 78px;
    border-radius: 22px;
    padding: 14px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .config-card > div:nth-child(2) {
    min-width: 0;
    flex: 1;
  }

  .config-card p {
    margin: 0;
    font-size: 14px;
    font-weight: 1000;
  }

  .config-card span:not(.status-pill) {
    display: block;
    margin-top: 4px;
    color: #777777;
    font-size: 12px;
    font-weight: 800;
  }

  .tabs-card {
    position: sticky;
    top: 92px;
    z-index: 20;
    margin-top: 20px;
    padding: 8px;
    border-radius: 22px;
    display: flex;
    gap: 8px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .tabs-card::-webkit-scrollbar {
    display: none;
  }

  .tab-button {
    flex: 1 0 auto;
    min-height: 46px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 16px;
    background: transparent;
    color: #8c8c8c;
    padding: 0 16px;
    font-size: 14px;
    font-weight: 1000;
    transition: background 180ms ease, color 180ms ease, transform 180ms ease;
  }

  .tab-button:hover {
    color: #ffffff;
    background: rgba(255,255,255,0.06);
  }

  .tab-button-active,
  .tab-button-active:hover {
    background: #ffffff;
    color: #000000;
    box-shadow: 0 12px 36px rgba(255,255,255,0.10);
  }

  .notice {
    margin-top: 14px;
    min-height: 50px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-radius: 18px;
    padding: 13px 16px;
    font-size: 14px;
    font-weight: 850;
  }

  .notice-success {
    border: 1px solid rgba(255,255,255,0.22);
    background: rgba(255,255,255,0.07);
    color: #ffffff;
  }

  .notice-error {
    border: 1px solid rgba(248,113,113,0.34);
    background: rgba(248,113,113,0.10);
    color: #fecaca;
  }

  .content-section {
    margin-top: 20px;
  }

  .section-card {
    min-width: 0;
    overflow: hidden;
    border-radius: 30px;
    padding: 24px;
  }

  .section-head {
    margin-bottom: 20px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
  }

  .section-head.compact {
    margin: 28px 0 16px;
  }

  .section-head h2 {
    margin: 8px 0 0;
    font-size: 30px;
    line-height: 1;
  }

  .count-pill {
    min-width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(0,0,0,0.36);
    font-size: 14px;
    font-weight: 1000;
  }

  .candidate-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .candidate-card {
    position: relative;
    min-height: 220px;
    overflow: hidden;
    border-radius: 28px;
    padding: 18px;
    display: block;
    transition: transform 220ms ease, border-color 220ms ease, background 220ms ease;
  }

  .candidate-card:hover,
  .draft-card:hover {
    transform: translateY(-4px);
    border-color: rgba(255,255,255,0.24);
    background: linear-gradient(145deg, rgba(36,36,36,0.90), rgba(8,8,8,0.95)), #0b0b0b;
  }

  .candidate-backdrop {
    position: absolute;
    inset: -28px;
    width: calc(100% + 56px);
    height: calc(100% + 56px);
    object-fit: cover;
    opacity: 0.08;
    filter: blur(24px) saturate(0.85);
    transform: scale(1.04);
  }

  .candidate-main {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: 112px minmax(0, 1fr);
    gap: 16px;
    align-items: stretch;
  }

  .candidate-poster-wrap {
    width: 112px;
    aspect-ratio: 2 / 3;
    align-self: start;
    overflow: hidden;
    border-radius: 22px;
    border: 1px solid rgba(255,255,255,0.12);
    background: #111111;
    box-shadow: 0 18px 46px rgba(0,0,0,0.42);
  }

  .candidate-poster {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    object-position: center top;
  }

  .candidate-content {
    min-width: 0;
    display: grid;
    align-content: start;
    gap: 14px;
  }

  .candidate-head {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: flex-start;
  }

  .candidate-card h3 {
    margin: 6px 0 0;
    font-size: 24px;
    line-height: 1.02;
    letter-spacing: -0.055em;
  }

  .candidate-card p:not(.eyebrow) {
    margin: 7px 0 0;
    color: #929292;
    font-size: 13px;
    font-weight: 850;
  }

  .candidate-info {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .card-button {
    width: max-content;
  }

  .draft-list,
  .run-list {
    display: grid;
    gap: 16px;
  }

  .draft-card {
    position: relative;
    display: grid;
    grid-template-columns: 196px minmax(0, 1fr);
    gap: 22px;
    align-items: start;
    overflow: hidden;
    border-radius: 30px;
    padding: 18px;
    transition: transform 220ms ease, border-color 220ms ease, background 220ms ease;
  }

  .draft-backdrop {
    position: absolute;
    inset: -48px;
    width: calc(100% + 96px);
    height: calc(100% + 96px);
    object-fit: cover;
    opacity: 0.055;
    filter: blur(28px) saturate(0.72);
    transform: scale(1.04);
  }

  .draft-card::after {
    content: "";
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 18% 18%, rgba(255,255,255,0.055), transparent 28%),
      linear-gradient(90deg, rgba(0,0,0,0.52), rgba(0,0,0,0.90));
    pointer-events: none;
  }

  .draft-poster-wrap,
  .draft-content {
    position: relative;
    z-index: 1;
  }

  .draft-poster-wrap {
    width: 180px;
    aspect-ratio: 2 / 3;
    align-self: start;
    border-radius: 24px;
    overflow: hidden;
    background: #111111;
    border: 1px solid rgba(255,255,255,0.12);
    box-shadow: 0 22px 60px rgba(0,0,0,0.45);
  }

  .draft-poster {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    object-position: center top;
  }

  .poster-glow {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.42), transparent 58%);
  }

  .draft-content {
    min-width: 0;
    display: grid;
    gap: 14px;
  }

  .draft-topline {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
  }

  .draft-title-block h3 {
    margin: 7px 0 0;
    font-size: clamp(24px, 3vw, 36px);
    line-height: 1;
  }

  .draft-title-block p:not(.eyebrow) {
    margin: 8px 0 0;
    color: #9a9a9a;
    font-size: 14px;
    font-weight: 850;
  }

  .compact-action {
    min-height: 38px;
    border-radius: 999px;
    padding: 0 13px;
    font-size: 12px;
  }

  .draft-description {
    margin: 0;
    max-width: 900px;
    color: #bdbdbd;
    font-size: 14px;
    line-height: 1.7;
    font-weight: 650;
  }

  .genre-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .genre-row span,
  .status-pill,
  .check-item {
    border-radius: 999px;
    font-size: 12px;
    font-weight: 1000;
  }

  .genre-row span {
    padding: 7px 10px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.055);
    color: #d7d7d7;
  }

  .genre-row .genre-warning {
    border-color: rgba(250,204,21,0.28);
    background: rgba(250,204,21,0.08);
    color: #fde68a;
  }

  .draft-layout-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 270px;
    gap: 14px;
    align-items: stretch;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .info-card {
    min-width: 0;
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.32);
    padding: 12px;
  }

  .info-card p {
    margin: 0;
    color: #777777;
    font-size: 10px;
    font-weight: 1000;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .info-card strong {
    display: block;
    margin-top: 7px;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #f2f2f2;
    font-size: 13px;
    font-weight: 850;
  }

  .quality-card {
    border-radius: 22px;
    padding: 15px;
  }

  .quality-head {
    display: flex;
    align-items: center;
    gap: 11px;
  }

  .quality-head > svg {
    width: 38px;
    height: 38px;
    padding: 10px;
    border-radius: 14px;
    background: rgba(255,255,255,0.08);
  }

  .quality-head p {
    margin: 0;
    color: #8a8a8a;
    font-size: 12px;
    font-weight: 900;
  }

  .quality-head strong {
    display: block;
    margin-top: 4px;
    font-size: 26px;
    line-height: 1;
    font-weight: 1000;
  }

  .check-list {
    margin-top: 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }

  .check-item {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: 1px solid rgba(255,255,255,0.09);
    background: rgba(255,255,255,0.04);
    color: #8f8f8f;
    padding: 6px 8px;
    font-size: 10px;
  }

  .check-item.ready {
    color: #ffffff;
    background: rgba(255,255,255,0.09);
  }

  .moderation-card {
    border-radius: 20px;
    padding: 14px;
  }

  .moderation-card pre {
    margin: 9px 0 0;
    white-space: pre-wrap;
    color: #cfcfcf;
    font: inherit;
    font-size: 13px;
    line-height: 1.65;
  }

  .good-action {
    border-color: rgba(255,255,255,0.28);
  }

  .danger-action {
    border-color: rgba(248,113,113,0.30);
    color: #fecaca;
    background: rgba(248,113,113,0.08);
  }

  .danger-action:hover:not(:disabled) {
    border-color: rgba(248,113,113,0.55);
    background: rgba(248,113,113,0.14);
    color: #ffffff;
  }

  .muted-action {
    color: #7a7a7a;
  }

  .run-card {
    border-radius: 26px;
    padding: 20px;
  }

  .run-head {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: flex-start;
  }

  .run-head h3 {
    margin: 8px 0 0;
    font-size: 24px;
  }

  .run-head p:not(.eyebrow) {
    margin: 6px 0 0;
    color: #888888;
    font-size: 13px;
    font-weight: 850;
  }

  .run-info {
    margin-top: 16px;
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .log-card {
    margin: 16px 0 0;
    max-height: 260px;
    overflow: auto;
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.36);
    padding: 14px;
    color: #bdbdbd;
    font-size: 12px;
    line-height: 1.55;
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: max-content;
    min-height: 30px;
    padding: 0 10px;
    border: 1px solid rgba(255,255,255,0.12);
    white-space: nowrap;
  }

  .status-good {
    border-color: rgba(255,255,255,0.34);
    background: rgba(255,255,255,0.12);
    color: #ffffff;
  }

  .status-warn {
    border-color: rgba(250,204,21,0.32);
    background: rgba(250,204,21,0.08);
    color: #fde68a;
  }

  .status-bad {
    border-color: rgba(248,113,113,0.32);
    background: rgba(248,113,113,0.10);
    color: #fecaca;
  }

  .status-neutral {
    border-color: rgba(255,255,255,0.14);
    background: rgba(255,255,255,0.07);
    color: #d5d5d5;
  }

  .empty-state {
    min-height: 250px;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 12px;
    padding: 28px;
    border-radius: 24px;
    border-style: dashed;
    text-align: center;
  }

  .empty-icon {
    display: grid;
    place-items: center;
  }

  .empty-state h3 {
    margin: 0;
    font-size: 24px;
    font-weight: 1000;
    letter-spacing: -0.04em;
  }

  .empty-state p {
    margin: 0;
    max-width: 540px;
    color: #858585;
    font-size: 14px;
    line-height: 1.65;
    font-weight: 700;
  }


  .candidate-search-card {
    margin-bottom: 18px;
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(260px, 1.1fr);
    gap: 14px;
    align-items: center;
    padding: 16px;
    border-radius: 24px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.34);
  }

  .candidate-search-card strong,
  .candidate-search-card span {
    display: block;
  }

  .candidate-search-card strong {
    margin-top: 6px;
    font-size: 18px;
    font-weight: 1000;
    letter-spacing: -0.04em;
  }

  .candidate-search-card span {
    margin-top: 6px;
    color: #858585;
    font-size: 13px;
    font-weight: 800;
  }

  .candidate-search-field {
    min-height: 54px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 16px;
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(0,0,0,0.48);
    color: #ffffff;
  }

  .candidate-search-field input {
    width: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    color: #ffffff;
    font: inherit;
    font-size: 14px;
    font-weight: 850;
  }

  .candidate-search-field input::placeholder {
    color: #686868;
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: grid;
    place-items: center;
    padding: 22px;
    background: rgba(0,0,0,0.76);
    backdrop-filter: blur(24px);
  }

  .modal-panel {
    width: min(980px, 100%);
    max-height: min(88vh, 920px);
    overflow: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.24) transparent;
    border-radius: 30px;
    border: 1px solid rgba(255,255,255,0.13);
    background:
      radial-gradient(circle at 20% 0%, rgba(255,255,255,0.08), transparent 34%),
      linear-gradient(145deg, rgba(25,25,25,0.96), rgba(4,4,4,0.98));
    box-shadow: 0 40px 120px rgba(0,0,0,0.72);
    padding: 24px;
    color: #ffffff;
  }

  .modal-panel::-webkit-scrollbar {
    width: 9px;
  }

  .modal-panel::-webkit-scrollbar-track {
    background: transparent;
    margin: 24px 0;
  }

  .modal-panel::-webkit-scrollbar-thumb {
    border: 3px solid transparent;
    border-radius: 999px;
    background: rgba(255,255,255,0.24);
    background-clip: padding-box;
  }

  .modal-panel::-webkit-scrollbar-thumb:hover {
    background: rgba(255,255,255,0.34);
    background-clip: padding-box;
  }

  .modal-panel::-webkit-scrollbar-button {
    display: none;
  }

  .modal-head {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    align-items: flex-start;
    margin-bottom: 20px;
  }

  .modal-head h3 {
    margin: 8px 0 0;
    font-size: clamp(28px, 4vw, 46px);
    line-height: 0.95;
    font-weight: 1000;
    letter-spacing: -0.07em;
  }

  .modal-head span {
    display: block;
    margin-top: 9px;
    color: #8f8f8f;
    font-size: 13px;
    font-weight: 850;
  }

  .icon-close {
    width: 44px;
    height: 44px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.04);
    color: #ffffff;
    cursor: pointer;
  }

  .icon-close:hover {
    background: #ffffff;
    color: #000000;
  }

  .trailer-frame-wrap {
    overflow: hidden;
    border-radius: 24px;
    border: 1px solid rgba(255,255,255,0.12);
    background: #000000;
    aspect-ratio: 16 / 9;
  }

  .trailer-frame-wrap iframe {
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
  }

  .modal-actions {
    margin-top: 18px;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 10px;
  }

  .modal-save-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 10px;
  }

  .delete-draft-button {
    margin-right: auto;
  }

  .edit-modal {
    width: min(1120px, 100%);
  }

  .edit-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .edit-field {
    display: grid;
    gap: 8px;
    min-inline-size: 0;
    padding: 13px;
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.34);
  }

  .edit-field.wide,
  .trailer-simple-field.wide {
    grid-column: 1 / -1;
  }

  .trailer-simple-field {
    display: grid;
    gap: 10px;
  }

  .trailer-simple-field .edit-field {
    padding-bottom: 11px;
  }

  .field-helper {
    margin: 0;
    color: rgba(255,255,255,0.58);
    font-size: 13px;
    line-height: 1.55;
    font-weight: 800;
  }

  .edit-field > span,
  .choice-field legend {
    color: #8f8f8f;
    font-size: 11px;
    font-weight: 1000;
    letter-spacing: 0.24em;
    text-transform: uppercase;
  }

  .edit-field input,
  .edit-field textarea {
    width: 100%;
    border: 0;
    outline: 0;
    resize: vertical;
    background: transparent;
    color: #ffffff;
    font: inherit;
    font-size: 14px;
    line-height: 1.55;
    font-weight: 800;
  }

  .choice-field {
    margin: 0;
  }

  .choice-field legend {
    padding: 0;
  }

  .choice-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .choice-option {
    min-width: 0;
    min-height: 42px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 14px;
    background: rgba(255,255,255,0.045);
    color: rgba(255,255,255,0.78);
    padding: 0 12px;
    font: inherit;
    cursor: pointer;
    transition: border-color 180ms ease, background 180ms ease, color 180ms ease, transform 180ms ease;
  }

  .choice-option:hover {
    border-color: rgba(255,255,255,0.24);
    background: rgba(255,255,255,0.08);
    color: #ffffff;
  }

  .choice-option.active {
    border-color: #ffffff;
    background: #ffffff;
    color: #050505;
    box-shadow: 0 12px 34px rgba(255,255,255,0.08);
  }

  .choice-option strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 950;
  }

  .choice-option svg {
    flex: 0 0 auto;
  }

  .edit-field textarea {
    min-height: 110px;
  }

  .edit-field input::placeholder,
  .edit-field textarea::placeholder {
    color: #666666;
  }

  .sticky-actions {
    position: sticky;
    bottom: -24px;
    margin: 18px -24px -24px;
    padding: 16px 24px 24px;
    background: linear-gradient(to top, rgba(5,5,5,0.98), rgba(5,5,5,0.72));
    backdrop-filter: blur(18px);
  }

  .compact-empty {
    min-height: 220px;
  }

  .failed-candidates {
    margin-top: 24px;
  }

  .animate-in {
    animation: animateIn 420ms ease both;
  }

  .delay-1 {
    animation-delay: 80ms;
  }

  @keyframes animateIn {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }


  .player-generator-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 12px 0 4px;
  }

  .player-generator-row span {
    color: rgba(255,255,255,0.62);
    font-size: 13px;
    font-weight: 800;
  }

  .autofill-panel {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 14px;
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 18px;
    background:
      radial-gradient(circle at 12% 0%, rgba(255,255,255,0.14), transparent 30%),
      linear-gradient(135deg, rgba(255,255,255,0.08), rgba(0,0,0,0.28));
  }

  .autofill-panel.wide {
    grid-column: 1 / -1;
  }

  .autofill-panel div {
    flex: 1 1 260px;
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  .autofill-panel strong {
    color: #ffffff;
    font-size: 13px;
    font-weight: 1000;
  }

  .autofill-panel span {
    color: rgba(255,255,255,0.62);
    font-size: 13px;
    line-height: 1.45;
    font-weight: 800;
  }

  @media (max-width: 1100px) {
    .hero-grid,
    .dashboard-card,
    .draft-layout-grid {
      grid-template-columns: 1fr;
    }

    .identity-card {
      min-height: auto;
    }

    .stats-grid,
    .integration-grid,
    .candidate-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .candidate-search-card {
      grid-template-columns: 1fr;
    }

    .draft-card {
      grid-template-columns: 176px minmax(0, 1fr);
    }

    .draft-poster-wrap {
      width: 164px;
    }
  }

  @media (max-width: 760px) {
    .topbar-inner,
    .page-shell {
      width: min(100% - 24px, 1180px);
    }

    .topbar-inner {
      min-height: 68px;
    }

    .top-actions .ghost-button:first-child {
      display: none;
    }

    .dashboard-card,
    .section-card,
    .identity-card {
      border-radius: 24px;
      padding: 20px;
    }

    .dashboard-content h2 {
      font-size: 38px;
    }

    .stats-grid,
    .integration-grid,
    .candidate-grid,
    .candidate-search-card,
    .edit-grid,
    .choice-grid,
    .candidate-info,
    .info-grid,
    .run-info {
      grid-template-columns: 1fr;
    }

    .draft-card {
      grid-template-columns: 1fr;
    }

    .draft-poster-wrap {
      width: min(170px, 100%);
      min-height: 0;
    }

    .draft-topline,
    .run-head {
      flex-direction: column;
    }

    .candidate-main {
      grid-template-columns: 92px minmax(0, 1fr);
      padding-right: 0;
      align-items: flex-start;
    }

    .candidate-poster-wrap {
      width: 92px;
      border-radius: 18px;
    }

    .candidate-head {
      flex-direction: column;
      gap: 10px;
    }


    .primary-button,
    .secondary-button,
    .card-button {
      width: 100%;
    }
  }
`;
