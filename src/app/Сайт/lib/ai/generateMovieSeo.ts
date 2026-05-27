import 'server-only';

type DraftForSeo = {
  id: string;
  title: string | null;
  original_title: string | null;
  year: number | null;
  type: string | null;
  genres: string[] | null;
  actors: string[] | null;
  directors: string[] | null;
  description: string | null;
  tmdb_id: number | null;
  kinopoisk_id: number | null;
  imdb_id: string | null;
  trailer_status: string | null;
  trailer_confidence: number | null;
};

export type GeneratedMovieSeo = {
  longDescription: string;
  seoTitle: string;
  seoDescription: string;
  faq: Array<{
    question: string;
    answer: string;
  }>;
  internalLinkSuggestions: string[];
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

function getTypeLabel(type: string | null) {
  const labels: Record<string, string> = {
    film: 'фильм',
    series: 'сериал',
    anime: 'аниме',
    cartoon: 'мультфильм',
    documentary: 'документальный фильм',
  };

  return type ? labels[type] ?? type : 'фильм';
}

function extractOutputText(data: OpenAIResponse) {
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text;
  }

  const parts = data.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .filter((text): text is string => Boolean(text));

  return parts?.join('\n').trim() ?? '';
}

function parseSeoJson(text: string): GeneratedMovieSeo {
  const parsed = JSON.parse(text) as Partial<GeneratedMovieSeo>;

  const longDescription = parsed.longDescription?.trim() ?? '';
  const seoTitle = parsed.seoTitle?.trim() ?? '';
  const seoDescription = parsed.seoDescription?.trim() ?? '';
  const faq = Array.isArray(parsed.faq)
    ? parsed.faq
        .map((item) => ({
          question: typeof item?.question === 'string' ? item.question.trim() : '',
          answer: typeof item?.answer === 'string' ? item.answer.trim() : '',
        }))
        .filter((item) => item.question && item.answer)
    : [];
  const internalLinkSuggestions = Array.isArray(parsed.internalLinkSuggestions)
    ? parsed.internalLinkSuggestions.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
    : [];

  if (!longDescription) throw new Error('OpenAI did not return longDescription');
  if (!seoTitle) throw new Error('OpenAI did not return seoTitle');
  if (!seoDescription) throw new Error('OpenAI did not return seoDescription');
  if (faq.length < 3) throw new Error('OpenAI returned less than 3 FAQ items');

  return {
    longDescription,
    seoTitle,
    seoDescription,
    faq: faq.slice(0, 5),
    internalLinkSuggestions: internalLinkSuggestions.slice(0, 8),
  };
}

export async function generateMovieSeo(draft: DraftForSeo): Promise<GeneratedMovieSeo> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const model = process.env.OPENAI_SEO_MODEL || 'gpt-4o-mini';
  const typeLabel = getTypeLabel(draft.type);

  const facts = {
    title: draft.title,
    originalTitle: draft.original_title,
    year: draft.year,
    type: draft.type,
    typeLabel,
    genres: draft.genres ?? [],
    actors: draft.actors ?? [],
    directors: draft.directors ?? [],
    description: draft.description,
    ids: {
      tmdbId: draft.tmdb_id,
      kinopoiskId: draft.kinopoisk_id,
      imdbId: draft.imdb_id,
    },
    trailer: {
      status: draft.trailer_status,
      confidence: draft.trailer_confidence,
    },
  };

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.65,
      max_output_tokens: 1600,
      input: [
        {
          role: 'system',
          content:
            'Ты SEO-редактор KinoLuma. Пиши на русском языке. Используй только предоставленные факты. Не выдумывай ID, год, актёров, режиссёров, рейтинг, даты выхода и сюжетные факты. Если факта нет, не добавляй его. Не используй фразы вроде "по данным TMDB". Ответ должен строго соответствовать JSON schema.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            task: {
              longDescription: '700–1000 символов. Живой, аккуратный текст для блока “О фильме”. Без спойлеров и без выдуманных фактов.',
              seoTitle: 'До 75 символов. В стиле: Название (год) смотреть онлайн фильм/сериал/аниме/мультфильм.',
              seoDescription: '120–170 символов. Для meta description. Естественно, без кликбейта.',
              faq: '3–5 вопросов и ответов. Только по фактам из карточки.',
              internalLinkSuggestions: '5–8 коротких подсказок для похожих материалов: жанры, тип, настроение, актёры или режиссёр, только если они есть в фактах.',
            },
            facts,
          }),
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'kinoluma_movie_seo',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              longDescription: { type: 'string' },
              seoTitle: { type: 'string' },
              seoDescription: { type: 'string' },
              faq: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    question: { type: 'string' },
                    answer: { type: 'string' },
                  },
                  required: ['question', 'answer'],
                },
              },
              internalLinkSuggestions: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['longDescription', 'seoTitle', 'seoDescription', 'faq', 'internalLinkSuggestions'],
          },
        },
      },
    }),
  });

  const data = (await response.json()) as OpenAIResponse;

  if (!response.ok) {
    throw new Error(data.error?.message || `OpenAI request failed: ${response.status}`);
  }

  const outputText = extractOutputText(data);

  if (!outputText) {
    throw new Error('OpenAI returned an empty SEO response');
  }

  return parseSeoJson(outputText);
}
