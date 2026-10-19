import "server-only";
import type { EpisodeGuideSnapshot } from "../types";

// Generated offline from the reviewed E.2 TMDB cache; do not hand-edit episode data.
export const episodeGuideSnapshot = {
  "schemaVersion": 1,
  "canonicalMovieId": "01c49b47-8e78-48c7-a718-ec2c06824aa1",
  "slug": "band-of-brothers-2001",
  "provider": {
    "source": "tmdb",
    "namespace": "tv",
    "id": 4613
  },
  "sourceLanguage": "en",
  "observedAt": "2026-10-18T10:13:33.619Z",
  "verificationStatus": "verified_complete",
  "completeness": {
    "status": "complete",
    "expectedRegularSeasonCount": 1,
    "expectedRegularEpisodeCount": 10,
    "expectedSpecialEpisodeCount": 6
  },
  "regularSeasons": [
    {
      "seasonNumber": 1,
      "episodes": [
        {
          "episodeNumber": 1,
          "originalTitle": "Currahee",
          "russianTitle": "Куррахи",
          "airDate": "2001-09-09"
        },
        {
          "episodeNumber": 2,
          "originalTitle": "Day of Days",
          "russianTitle": "Славные Дни",
          "airDate": "2001-09-09"
        },
        {
          "episodeNumber": 3,
          "originalTitle": "Carentan",
          "russianTitle": "Карентан",
          "airDate": "2001-09-16"
        },
        {
          "episodeNumber": 4,
          "originalTitle": "Replacements",
          "russianTitle": "Замены",
          "airDate": "2001-09-23"
        },
        {
          "episodeNumber": 5,
          "originalTitle": "Crossroads",
          "russianTitle": "Перекресток",
          "airDate": "2001-09-30"
        },
        {
          "episodeNumber": 6,
          "originalTitle": "Bastogne",
          "russianTitle": "Бастонь",
          "airDate": "2001-10-07"
        },
        {
          "episodeNumber": 7,
          "originalTitle": "The Breaking Point",
          "russianTitle": "Прорыв",
          "airDate": "2001-10-14"
        },
        {
          "episodeNumber": 8,
          "originalTitle": "The Last Patrol",
          "russianTitle": "Ночная разведка",
          "airDate": "2001-10-21"
        },
        {
          "episodeNumber": 9,
          "originalTitle": "Why We Fight",
          "russianTitle": "За что мы сражаемся?",
          "airDate": "2001-10-28"
        },
        {
          "episodeNumber": 10,
          "originalTitle": "Points",
          "russianTitle": "Победа",
          "airDate": "2001-11-04"
        }
      ]
    }
  ],
  "specials": [
    {
      "episodeNumber": 1,
      "originalTitle": "Premiere in Normandy",
      "russianTitle": "Премьера в Нормандии",
      "airDate": "2001-06-06"
    },
    {
      "episodeNumber": 2,
      "originalTitle": "Who's Who: The Men of Easy Company",
      "airDate": "2001-06-09"
    },
    {
      "episodeNumber": 3,
      "originalTitle": "The Making of \"Band of Brothers\"",
      "russianTitle": "Создание сериала",
      "airDate": "2001-09-08"
    },
    {
      "episodeNumber": 4,
      "originalTitle": "We Stand Alone Together: The Men of Easy Company",
      "airDate": "2001-11-10"
    },
    {
      "episodeNumber": 5,
      "originalTitle": "Ron Livingston's Video Diaries",
      "russianTitle": "Видеодневник",
      "airDate": "2002-11-05"
    },
    {
      "episodeNumber": 6,
      "originalTitle": "He Has Seen War",
      "airDate": "2011-11-14"
    }
  ],
  "provenance": [
    {
      "source": "tmdb",
      "observedAt": "2026-10-18T10:13:17.468Z",
      "verificationStatus": "verified",
      "fields": [
        "counts"
      ],
      "sourceReference": "https://api.themoviedb.org/3/tv/4613?language=ru-RU"
    },
    {
      "source": "tmdb",
      "observedAt": "2026-10-18T10:13:33.042Z",
      "verificationStatus": "verified",
      "fields": [
        "airDate",
        "episodeNumber",
        "originalTitle",
        "seasonNumber"
      ],
      "language": "en",
      "sourceReference": "https://api.themoviedb.org/3/tv/4613/season/0?language=en-US"
    },
    {
      "source": "tmdb",
      "observedAt": "2026-10-18T10:13:33.619Z",
      "verificationStatus": "verified",
      "fields": [
        "airDate",
        "episodeNumber",
        "originalTitle",
        "seasonNumber"
      ],
      "language": "en",
      "sourceReference": "https://api.themoviedb.org/3/tv/4613/season/1?language=en-US"
    },
    {
      "source": "tmdb",
      "observedAt": "2026-10-18T10:13:32.879Z",
      "verificationStatus": "verified",
      "fields": [
        "airDate",
        "episodeNumber",
        "russianTitle",
        "seasonNumber"
      ],
      "language": "ru",
      "sourceReference": "https://api.themoviedb.org/3/tv/4613/season/0?language=ru-RU"
    },
    {
      "source": "tmdb",
      "observedAt": "2026-10-18T10:13:33.301Z",
      "verificationStatus": "verified",
      "fields": [
        "airDate",
        "episodeNumber",
        "russianTitle",
        "seasonNumber"
      ],
      "language": "ru",
      "sourceReference": "https://api.themoviedb.org/3/tv/4613/season/1?language=ru-RU"
    }
  ],
  "checksum": "sha256:a7269e8832e1603c97415355542d7cf9bf7fd346eeb92b21367ba424c5bc8c5a"
} as const satisfies EpisodeGuideSnapshot;

