import "server-only";

import type { CanonicalMovieId } from "./canonicalIdentity";

export type EpisodeGuidePilotEntry = {
  title: string;
  slug: string;
  canonicalMovieId: CanonicalMovieId;
  tmdbNamespace: "tv";
  tmdbId: number;
  localStatus: "ended";
  localExpectedRegularSeasons: number;
  localExpectedRegularEpisodes: number;
  reason: string;
};

// Explicit and stable: ordering changes only through review, never from a live API.
export const episodeGuidePilotAllowlist = [
  {
    title: "Андор",
    slug: "andor",
    canonicalMovieId: "174f15d5-abe2-433e-9e8e-e65c61391ca2",
    tmdbNamespace: "tv",
    tmdbId: 83867,
    localStatus: "ended",
    localExpectedRegularSeasons: 2,
    localExpectedRegularEpisodes: 24,
    reason: "Завершённый двухсезонный сериал среднего размера.",
  },
  {
    title: "Аватар: Легенда об Аанге",
    slug: "avatar-legenda-ob-aange-2004",
    canonicalMovieId: "c5cf7ec6-d093-43b0-84b8-9f903c332451",
    tmdbNamespace: "tv",
    tmdbId: 246,
    localStatus: "ended",
    localExpectedRegularSeasons: 3,
    localExpectedRegularEpisodes: 61,
    reason: "Завершённый сериал с несколькими сезонами и анимационным форматом.",
  },
  {
    title: "Братья по оружию",
    slug: "band-of-brothers-2001",
    canonicalMovieId: "01c49b47-8e78-48c7-a718-ec2c06824aa1",
    tmdbNamespace: "tv",
    tmdbId: 4613,
    localStatus: "ended",
    localExpectedRegularSeasons: 1,
    localExpectedRegularEpisodes: 10,
    reason: "Компактный завершённый мини-сериал для первого импорта.",
  },
  {
    title: "Банши",
    slug: "banshi-2013",
    canonicalMovieId: "bc84cfc1-a6fb-4bc0-9661-24fca39c6363",
    tmdbNamespace: "tv",
    tmdbId: 41727,
    localStatus: "ended",
    localExpectedRegularSeasons: 4,
    localExpectedRegularEpisodes: 38,
    reason: "Завершённый многосезонный сериал умеренного объёма.",
  },
  {
    title: "Большая маленькая ложь",
    slug: "bolshaya-malenkaya-lozh-2017",
    canonicalMovieId: "42989ff4-cd94-4f82-a7b0-7d75b3a73fe5",
    tmdbNamespace: "tv",
    tmdbId: 66292,
    localStatus: "ended",
    localExpectedRegularSeasons: 2,
    localExpectedRegularEpisodes: 14,
    reason: "Небольшой завершённый guide с двумя сезонами.",
  },
  {
    title: "Бумажный дом",
    slug: "bumazhnyy-dom-2017",
    canonicalMovieId: "2f9b575e-6dfc-4c3b-89e2-3b217f0c04b6",
    tmdbNamespace: "tv",
    tmdbId: 71446,
    localStatus: "ended",
    localExpectedRegularSeasons: 3,
    localExpectedRegularEpisodes: 41,
    reason: "Завершённый сериал с нетривиальным распределением эпизодов по сезонам.",
  },
  {
    title: "Сообщество",
    slug: "community-2009",
    canonicalMovieId: "b627b83d-6b94-453c-9117-9718da5a8509",
    tmdbNamespace: "tv",
    tmdbId: 18347,
    localStatus: "ended",
    localExpectedRegularSeasons: 6,
    localExpectedRegularEpisodes: 110,
    reason: "Крупный завершённый guide для проверки ленивой загрузки.",
  },
  {
    title: "Декстер",
    slug: "dekster-2006",
    canonicalMovieId: "61fba918-9783-4e8d-b1c4-567fd435a5ec",
    tmdbNamespace: "tv",
    tmdbId: 1405,
    localStatus: "ended",
    localExpectedRegularSeasons: 8,
    localExpectedRegularEpisodes: 96,
    reason: "Завершённый восьмисезонный сериал с крупным guide.",
  },
  {
    title: "Отчаянные домохозяйки",
    slug: "desperate-housewives-2004",
    canonicalMovieId: "1178819f-f034-48fb-aad0-94665cf3dad5",
    tmdbNamespace: "tv",
    tmdbId: 693,
    localStatus: "ended",
    localExpectedRegularSeasons: 8,
    localExpectedRegularEpisodes: 177,
    reason: "Самый объёмный pilot guide для проверки шардирования и cache.",
  },
  {
    title: "Фарго",
    slug: "fargo-2014",
    canonicalMovieId: "413ce6b2-ecd1-49d3-93dc-b0223452b3f5",
    tmdbNamespace: "tv",
    tmdbId: 60622,
    localStatus: "ended",
    localExpectedRegularSeasons: 5,
    localExpectedRegularEpisodes: 51,
    reason: "Завершённый антологический сериал с несколькими сезонами.",
  },
] as const satisfies readonly EpisodeGuidePilotEntry[];

