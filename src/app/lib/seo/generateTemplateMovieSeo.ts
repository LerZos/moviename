type DraftLike = {
  id?: string | null;
  title?: string | null;
  original_title?: string | null;
  year?: number | string | null;
  type?: string | null;
  genres?: string[] | null;
  actors?: string[] | null;
  directors?: string[] | null;
  description?: string | null;
  trailer_status?: string | null;
  trailer_key?: string | null;
  trailer_url?: string | null;
  kinopoisk_id?: number | null;
  tmdb_id?: number | null;
  imdb_id?: string | null;
};

export type TemplateMovieSeoResult = {
  longDescription: string;
  seoTitle: string;
  seoDescription: string;
  faq: Array<{ question: string; answer: string }>;
  internalLinkSuggestions: string[];
};

const TYPE_LABELS: Record<string, string> = {
  film: 'фильм',
  movie: 'фильм',
  series: 'сериал',
  tv: 'сериал',
  anime: 'аниме',
  cartoon: 'мультфильм',
  documentary: 'документальный фильм',
};

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function cleanList(value: unknown, limit = 8) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => cleanText(item))
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index)
    .slice(0, limit);
}

function getTypeLabel(type: unknown) {
  const normalizedType = cleanText(type).toLowerCase();
  return (TYPE_LABELS[normalizedType] ?? normalizedType) || 'материал';
}

function getYearText(year: unknown) {
  const value = typeof year === 'number' ? year.toString() : cleanText(year);
  return value || 'без указанного года';
}

function joinHuman(items: string[]) {
  if (!items.length) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} и ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} и ${items[items.length - 1]}`;
}

function pickVariant(seed: string, variants: string[]) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 100000;
  }

  return variants[Math.abs(hash) % variants.length];
}

function trimSentence(value: string, maxLength: number) {
  const text = cleanText(value);
  if (text.length <= maxLength) return text;

  const sliced = text.slice(0, maxLength).trim();
  const lastSentenceEnd = Math.max(sliced.lastIndexOf('.'), sliced.lastIndexOf('!'), sliced.lastIndexOf('?'));

  if (lastSentenceEnd > maxLength * 0.58) {
    return sliced.slice(0, lastSentenceEnd + 1).trim();
  }

  return `${sliced.replace(/[,.!?;:]+$/g, '')}…`;
}

function ensureLength(text: string, minLength: number, maxLength: number, fillers: string[]) {
  let result = cleanText(text);
  let index = 0;

  while (result.length < minLength && index < fillers.length) {
    const next = cleanText(fillers[index]);
    if (next) result = `${result} ${next}`.trim();
    index += 1;
  }

  return trimSentence(result, maxLength);
}

function makeSeoTitle(title: string, year: string, typeLabel: string) {
  const yearPart = year && year !== 'без указанного года' ? ` (${year})` : '';
  const base = `${title}${yearPart} смотреть онлайн ${typeLabel}`;

  return trimSentence(base, 78);
}

function makeSeoDescription(title: string, year: string, typeLabel: string, genres: string[], hasTrailer: boolean) {
  const yearPart = year && year !== 'без указанного года' ? `${year} года` : 'из каталога KinoLuma';
  const genrePart = genres.length ? ` в жанрах ${genres.slice(0, 3).join(', ')}` : '';
  const trailerPart = hasTrailer ? ', трейлер' : '';

  return trimSentence(
    `Смотрите ${typeLabel} ${title} ${yearPart}${genrePart}: описание${trailerPart}, актёры и похожие материалы на KinoLuma.`,
    210,
  );
}

function makeInternalLinkSuggestions(typeLabel: string, genres: string[]) {
  const suggestions = [`Похожие ${typeLabel}ы`];

  genres.slice(0, 4).forEach((genre) => {
    suggestions.push(`Каталог: ${genre}`);
  });

  suggestions.push('Новинки KinoLuma');

  return suggestions;
}

export function generateTemplateMovieSeo(draft: DraftLike): TemplateMovieSeoResult {
  const title = cleanText(draft.title) || 'Без названия';
  const originalTitle = cleanText(draft.original_title);
  const year = getYearText(draft.year);
  const typeLabel = getTypeLabel(draft.type);
  const genres = cleanList(draft.genres, 8);
  const actors = cleanList(draft.actors, 6);
  const directors = cleanList(draft.directors, 3);
  const baseDescription = cleanText(draft.description);
  const hasTrailer = Boolean(draft.trailer_key || draft.trailer_url || draft.trailer_status === 'accepted');
  const seed = `${draft.id || ''}-${title}-${year}`;

  const genrePhrase = genres.length
    ? `В жанровой основе — ${joinHuman(genres.slice(0, 4))}.`
    : 'Жанры пока не заполнены в источниках, поэтому их лучше проверить вручную перед публикацией.';

  const actorPhrase = actors.length
    ? `В актёрском блоке указаны ${joinHuman(actors.slice(0, 5))}.`
    : 'Актёрский состав пока не найден в подключённых источниках.';

  const directorPhrase = directors.length
    ? `Режиссёрский блок: ${joinHuman(directors.slice(0, 2))}.`
    : 'Информация о режиссёре пока не найдена в API.';

  const originalPhrase = originalTitle && originalTitle !== title
    ? `Оригинальное название — ${originalTitle}.`
    : '';

  const trailerPhrase = hasTrailer
    ? 'Трейлер уже прикреплён к черновику, поэтому перед публикацией стоит открыть его в админке и убедиться, что это официальный ролик, а не обзор или фанатское видео.'
    : 'Трейлер пока не подтверждён, поэтому карточку лучше оставить на проверке или добавить ролик вручную.';

  const intro = pickVariant(seed, [
    `${title} — ${typeLabel} ${year === 'без указанного года' ? 'из каталога KinoLuma' : `${year} года`}, который можно подготовить к публикации после проверки фактов и медиа.` ,
    `Карточка ${title} собрана как ${typeLabel} ${year === 'без указанного года' ? 'без указанного года' : `${year} года`} и готовится для каталога KinoLuma.`,
    `${title} — материал KinoLuma в формате «${typeLabel}», где основные данные берутся из подключённых источников и проходят ручную проверку перед публикацией.`,
  ]);

  const descriptionPart = baseDescription
    ? `Краткое описание: ${trimSentence(baseDescription, 330)}`
    : 'Краткое описание пока отсутствует, поэтому перед публикацией желательно дополнить карточку вручную или через подключённые источники.';

  const seoSafetyPart = 'Этот текст не добавляет новые факты: год, жанры, актёры, режиссёры, идентификаторы и трейлер остаются только теми, что уже есть в черновике.';

  const fillers = [
    genrePhrase,
    actorPhrase,
    directorPhrase,
    trailerPhrase,
    'После модерации карточка может использоваться для нижнего блока «О фильме», SEO-описания и FAQ на странице материала.',
    'Если часть данных не найдена, её лучше оставить пустой, чем заменять догадками.',
    seoSafetyPart,
  ];

  const longDescription = ensureLength(
    [intro, originalPhrase, descriptionPart, genrePhrase, actorPhrase, directorPhrase, trailerPhrase, seoSafetyPart]
      .filter(Boolean)
      .join(' '),
    700,
    1000,
    fillers,
  );

  const seoTitle = makeSeoTitle(title, year, typeLabel);
  const seoDescription = makeSeoDescription(title, year, typeLabel, genres, hasTrailer);

  const faq = [
    {
      question: `О чём ${typeLabel} «${title}»?`,
      answer: baseDescription
        ? trimSentence(baseDescription, 260)
        : 'Описание пока не найдено в подключённых источниках. Перед публикацией карточку стоит проверить и дополнить вручную.',
    },
    {
      question: `Какого жанра «${title}»?`,
      answer: genres.length
        ? `В карточке указаны жанры: ${genres.join(', ')}.`
        : 'Жанры пока не найдены в источниках, поэтому поле лучше проверить вручную.',
    },
    {
      question: `Есть ли трейлер у «${title}»?`,
      answer: hasTrailer
        ? 'Да, трейлер прикреплён к черновику. Перед публикацией его нужно открыть в админке и убедиться, что ролик подходит.'
        : 'Трейлер пока не подтверждён. Такой черновик лучше оставить на проверке.',
    },
    {
      question: `В каком году вышел «${title}»?`,
      answer: year === 'без указанного года'
        ? 'Год выхода пока не найден в подключённых источниках.'
        : `В карточке указан год: ${year}.`,
    },
  ];

  if (actors.length) {
    faq.push({
      question: `Кто играет в «${title}»?`,
      answer: `В карточке указаны актёры: ${actors.slice(0, 6).join(', ')}.`,
    });
  }

  return {
    longDescription,
    seoTitle,
    seoDescription,
    faq,
    internalLinkSuggestions: makeInternalLinkSuggestions(typeLabel, genres),
  };
}
