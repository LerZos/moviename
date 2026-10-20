import "server-only";
import type { EpisodeGuideSnapshot } from "../types";

// Generated offline from the reviewed E.3 TMDB cache; do not hand-edit episode data.
export const episodeGuideSnapshot = {
  "schemaVersion": 1,
  "canonicalMovieId": "42989ff4-cd94-4f82-a7b0-7d75b3a73fe5",
  "slug": "bolshaya-malenkaya-lozh-2017",
  "provider": {
    "source": "tmdb",
    "namespace": "tv",
    "id": 66292
  },
  "sourceLanguage": "en",
  "observedAt": "2026-10-19T16:03:06.165Z",
  "verificationStatus": "verified_complete",
  "completeness": {
    "status": "complete",
    "expectedRegularSeasonCount": 2,
    "expectedRegularEpisodeCount": 14,
    "expectedSpecialEpisodeCount": 0
  },
  "regularSeasons": [
    {
      "seasonNumber": 1,
      "episodes": [
        {
          "episodeNumber": 1,
          "originalTitle": "Somebody's Dead",
          "russianTitle": "Кто-то умер",
          "airDate": "2017-02-19"
        },
        {
          "episodeNumber": 2,
          "originalTitle": "Serious Mothering",
          "russianTitle": "Серьезная материнская забота",
          "airDate": "2017-02-26"
        },
        {
          "episodeNumber": 3,
          "originalTitle": "Living the Dream",
          "russianTitle": "Живая мечта",
          "airDate": "2017-03-05"
        },
        {
          "episodeNumber": 4,
          "originalTitle": "Push Comes to Shove",
          "russianTitle": "Дела идут неладно",
          "airDate": "2017-03-12"
        },
        {
          "episodeNumber": 5,
          "originalTitle": "Once Bitten",
          "russianTitle": "Однажды укушенный",
          "airDate": "2017-03-19"
        },
        {
          "episodeNumber": 6,
          "originalTitle": "Burning Love",
          "russianTitle": "Пылающая любовь",
          "airDate": "2017-03-26"
        },
        {
          "episodeNumber": 7,
          "originalTitle": "You Get What You Need",
          "russianTitle": "Забава и Веселье",
          "airDate": "2017-04-02"
        }
      ]
    },
    {
      "seasonNumber": 2,
      "episodes": [
        {
          "episodeNumber": 1,
          "originalTitle": "What Have They Done?",
          "russianTitle": "Что они наделали?",
          "airDate": "2019-06-09"
        },
        {
          "episodeNumber": 2,
          "originalTitle": "Tell-Tale Hearts",
          "russianTitle": "Сердца-обличители",
          "airDate": "2019-06-16"
        },
        {
          "episodeNumber": 3,
          "originalTitle": "The End of the World",
          "russianTitle": "Конец света",
          "airDate": "2019-06-23"
        },
        {
          "episodeNumber": 4,
          "originalTitle": "She Knows",
          "russianTitle": "Она знает",
          "airDate": "2019-06-30"
        },
        {
          "episodeNumber": 5,
          "originalTitle": "Kill Me",
          "russianTitle": "Убей меня",
          "airDate": "2019-07-07"
        },
        {
          "episodeNumber": 6,
          "originalTitle": "The Bad Mother",
          "russianTitle": "Плохая мать",
          "airDate": "2019-07-14"
        },
        {
          "episodeNumber": 7,
          "originalTitle": "I Want to Know",
          "russianTitle": "Я хочу знать",
          "airDate": "2019-07-21"
        }
      ]
    }
  ],
  "specials": [],
  "provenance": [
    {
      "source": "tmdb",
      "observedAt": "2026-10-19T16:02:47.995Z",
      "verificationStatus": "verified",
      "fields": [
        "counts"
      ],
      "sourceReference": "https://api.themoviedb.org/3/tv/66292?language=ru-RU"
    },
    {
      "source": "tmdb",
      "observedAt": "2026-10-19T16:03:05.800Z",
      "verificationStatus": "verified",
      "fields": [
        "airDate",
        "episodeNumber",
        "originalTitle",
        "seasonNumber"
      ],
      "language": "en",
      "sourceReference": "https://api.themoviedb.org/3/tv/66292/season/1?language=en-US"
    },
    {
      "source": "tmdb",
      "observedAt": "2026-10-19T16:03:06.165Z",
      "verificationStatus": "verified",
      "fields": [
        "airDate",
        "episodeNumber",
        "originalTitle",
        "seasonNumber"
      ],
      "language": "en",
      "sourceReference": "https://api.themoviedb.org/3/tv/66292/season/2?language=en-US"
    },
    {
      "source": "tmdb",
      "observedAt": "2026-10-19T16:03:05.618Z",
      "verificationStatus": "verified",
      "fields": [
        "airDate",
        "episodeNumber",
        "russianTitle",
        "seasonNumber"
      ],
      "language": "ru",
      "sourceReference": "https://api.themoviedb.org/3/tv/66292/season/1?language=ru-RU"
    },
    {
      "source": "tmdb",
      "observedAt": "2026-10-19T16:03:05.981Z",
      "verificationStatus": "verified",
      "fields": [
        "airDate",
        "episodeNumber",
        "russianTitle",
        "seasonNumber"
      ],
      "language": "ru",
      "sourceReference": "https://api.themoviedb.org/3/tv/66292/season/2?language=ru-RU"
    }
  ],
  "checksum": "sha256:c011de3cdad66c068a2d30fbd536b22176ca8bd7a0c686272285dfd72b9436e9"
} as const satisfies EpisodeGuideSnapshot;
