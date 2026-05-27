export type MovieType = 'film' | 'series' | 'anime' | 'cartoon' | 'documentary';

export type ImportCandidateStatus =
  | 'new'
  | 'processing'
  | 'drafted'
  | 'duplicate'
  | 'failed'
  | 'rejected';

export type MovieDraftStatus =
  | 'draft'
  | 'needs_ai_seo'
  | 'needs_moderation'
  | 'needs_review'
  | 'ready'
  | 'published'
  | 'rejected';

export type ImportCandidate = {
  id: string;
  source: string;
  source_id: string;
  title: string;
  original_title: string | null;
  year: number | null;
  type: MovieType | null;
  status: ImportCandidateStatus;
  raw_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type MovieFacts = {
  title: string;
  originalTitle: string | null;
  year: number | null;
  type: MovieType;
  genres: string[];
  posterUrl: string | null;
  backdropUrl: string | null;
  tmdbId: number | null;
  kinopoiskId: number | null;
  imdbId: string | null;
  actors: string[];
  directors: string[];
  description: string | null;
  source: string;
  rawJson: Record<string, unknown>;
};

export type TrailerResult = {
  provider: 'youtube' | null;
  key: string | null;
  url: string | null;
  embedUrl: string | null;
  source: string | null;
  confidence: number;
  status: 'accepted' | 'needs_review' | 'missing';
};
