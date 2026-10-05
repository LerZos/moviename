export type VibixVideoType = 'movie' | 'serial';

export type VibixVoiceover = {
  id?: number | string | null;
  name?: string | null;
};

export type VibixTag = {
  id?: number | string | null;
  code?: string | null;
  name?: string | null;
};

export type VibixVideo = {
  id?: number | string | null;
  name?: string | null;
  name_rus?: string | null;
  name_eng?: string | null;
  name_original?: string | null;
  type?: string | null;
  year?: number | string | null;
  kp_id?: number | string | null;
  kinopoisk_id?: number | string | null;
  imdb_id?: string | null;
  kp_rating?: number | string | null;
  imdb_rating?: number | string | null;
  iframe_url?: string | null;
  poster_url?: string | null;
  backdrop_url?: string | null;
  duration?: number | string | null;
  quality?: string | null;
  genre?: string[] | string | null;
  country?: string[] | string | null;
  description?: string | null;
  description_short?: string | null;
  voiceovers?: VibixVoiceover[] | null;
  tags?: VibixTag[] | null;
  uploaded_at?: string | null;
};

export type VibixSingleVideoResponse = VibixVideo | { data?: VibixVideo; success?: boolean; message?: string } | null;

type VibixLinksResponse = {
  data?: VibixVideo[];
  links?: Record<string, unknown>;
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
    [key: string]: unknown;
  };
  success?: boolean;
  message?: string;
};

export type FetchVibixLinksOptions = {
  type: VibixVideoType;
  page?: number;
  limit?: number;
};

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim() || 'https://vibix.org';
  return trimmed
    .replace(/\/api\/external\/documentation\/?$/i, '')
    .replace(/\/$/, '');
}

export function getVibixConfig() {
  const apiUrl = normalizeBaseUrl(
    process.env.EXIIM_API_URL ||
      process.env.VIBIX_API_URL ||
      process.env.RENDEX_API_URL ||
      process.env.VIBIX_BASE_URL ||
      'https://vibix.org',
  );

  const apiToken = process.env.EXIIM_API_TOKEN || process.env.VIBIX_API_TOKEN || process.env.RENDEX_API_TOKEN || '';
  const publisherId = process.env.RENDEX_PUBLISHER_ID || process.env.VIBIX_PUBLISHER_ID || '678053396';

  return {
    apiUrl,
    apiToken,
    publisherId,
    isConfigured: Boolean(apiToken),
  };
}

export async function vibixFetch<T>(path: string): Promise<T> {
  const config = getVibixConfig();

  if (!config.apiToken) {
    throw new Error('VIBIX_API_TOKEN или RENDEX_API_TOKEN не задан в env');
  }

  const url = path.startsWith('http') ? path : `${config.apiUrl}${path}`;
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${config.apiToken}`,
    },
    cache: 'no-store',
  });

  const text = await response.text();
  let payload: unknown = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'message' in payload
      ? String((payload as { message?: unknown }).message)
      : response.statusText;

    throw new Error(`Vibix API error ${response.status}: ${message}`);
  }

  return payload as T;
}


export function unwrapVibixVideo(payload: VibixSingleVideoResponse): VibixVideo | null {
  if (!payload || typeof payload !== 'object') return null;

  if ('data' in payload) {
    const data = payload.data;
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as VibixVideo) : null;
  }

  return payload as VibixVideo;
}

export async function fetchVibixLinks(options: FetchVibixLinksOptions) {
  const page = Math.max(1, Math.trunc(options.page || 1));
  const limit = Math.max(1, Math.min(100, Math.trunc(options.limit || 30)));
  const params = new URLSearchParams({
    type: options.type,
    page: String(page),
    limit: String(limit),
  });

  return vibixFetch<VibixLinksResponse>(`/api/v1/publisher/videos/links?${params.toString()}`);
}

export async function fetchVibixByKinopoiskId(kpId: number) {
  return vibixFetch<VibixSingleVideoResponse>(`/api/v1/publisher/videos/kp/${kpId}`);
}

export async function fetchVibixByImdbId(imdbId: string) {
  return vibixFetch<VibixSingleVideoResponse>(`/api/v1/publisher/videos/imdb/${encodeURIComponent(imdbId)}`);
}
