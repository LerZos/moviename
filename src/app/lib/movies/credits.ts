import type { CastMember, Movie } from "../../data/movies";

export type CatalogCredits = {
  directors: string[];
  seriesCreators: string[];
  actors: CastMember[];
  voiceActors: CastMember[];
  characters: CastMember[];
  unclassified: CastMember[];
};

export type CreditDisplayGroup = {
  key: "directors" | "creators" | "cast" | "voice-cast" | "characters" | "participants";
  title: string;
  people: CastMember[];
};

export const COLLAPSED_CREDIT_COUNT = 6;

const DIRECTOR_LABELS = new Set(["режиссёр", "режиссёры", "режиссер", "режиссеры"]);
const CREATOR_LABELS = new Set(["создатель", "создатели"]);
const LEGACY_CAST_SUMMARY_LABELS = new Set([
  "актёры",
  "актеры",
  "актёрский состав",
  "актерский состав",
  "в главных ролях",
  "главные роли",
  "главные герои",
]);

function uniqueNames(values: string[]): string[] {
  const seen = new Set<string>();
  return values.map((value) => value.trim()).filter((value) => {
    const key = value.toLocaleLowerCase("ru-RU");
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniquePeople(values: CastMember[]): CastMember[] {
  const people = new Map<string, CastMember>();

  for (const person of values) {
    const name = person.name.trim();
    const role = person.role.trim();
    const key = name.toLocaleLowerCase("ru-RU");
    if (!name) continue;

    const existing = people.get(key);
    if (!existing || (!existing.role && role)) {
      people.set(key, { name: existing?.name ?? name, role });
    }
  }

  return [...people.values()];
}

export function buildCreditDisplayGroups(credits: CatalogCredits): CreditDisplayGroup[] {
  const groups: CreditDisplayGroup[] = [
    {
      key: "directors",
      title: "Режиссёры",
      people: credits.directors.map((name) => ({ name, role: "" })),
    },
    {
      key: "creators",
      title: "Создатели сериала",
      people: credits.seriesCreators.map((name) => ({ name, role: "" })),
    },
    { key: "cast", title: "Актёрский состав", people: credits.actors },
    { key: "voice-cast", title: "Актёры озвучивания", people: credits.voiceActors },
    { key: "characters", title: "Персонажи", people: credits.characters },
    { key: "participants", title: "Участники", people: credits.unclassified },
  ];

  return groups
    .map((group) => ({ ...group, people: uniquePeople(group.people) }))
    .filter((group) => group.people.length > 0);
}

export function getVisibleCreditPeople(
  people: CastMember[],
  expanded: boolean,
  limit = COLLAPSED_CREDIT_COUNT,
): CastMember[] {
  return expanded ? people : people.slice(0, limit);
}

export function isLegacyCastSummaryLabel(label: string): boolean {
  return LEGACY_CAST_SUMMARY_LABELS.has(label.trim().toLocaleLowerCase("ru-RU"));
}

export function shouldShowMovieFact(label: string, hasStructuredCast: boolean): boolean {
  return !hasStructuredCast || !isLegacyCastSummaryLabel(label);
}

function factNames(movie: Movie, labels: Set<string>): string[] {
  return uniqueNames(
    (movie.facts ?? [])
      .filter((fact) => labels.has(fact.label.trim().toLocaleLowerCase("ru-RU")))
      .flatMap((fact) => fact.value.split(",")),
  );
}

// The legacy catalog uses the same `cast` field for performers and fictional
// characters. Classify only what the content type or an explicit label proves.
export function normalizeCatalogCredits(movie: Movie): CatalogCredits {
  const credits: CatalogCredits = {
    // Imported TV drafts currently fold TMDB `created_by` into `directors`.
    // Without per-person provenance, a series director fact is not safe to relabel.
    directors: movie.type === "Сериал" ? [] : factNames(movie, DIRECTOR_LABELS),
    seriesCreators:
      movie.type === "Сериал" ||
      (movie.type === "Мультфильм" && movie.tmdbNamespace === "tv")
        ? factNames(movie, CREATOR_LABELS)
        : [],
    actors: [],
    voiceActors: [],
    characters: [],
    unclassified: [],
  };

  const explicitVoiceFact = (movie.facts ?? []).some((fact) =>
    /озвучк|voice/i.test(fact.label),
  );
  const isAnimation =
    movie.type === "Аниме" ||
    movie.type === "Мультфильм" ||
    (movie.genres ?? []).some((genre) => /анимац|мульт/i.test(genre));
  const seen = new Set<string>();

  for (const person of movie.cast ?? []) {
    const name = person.name.trim();
    const role = person.role.trim();
    const key = `${name.toLocaleLowerCase("ru-RU")}\0${role.toLocaleLowerCase("ru-RU")}`;
    if (!name || seen.has(key)) continue;
    seen.add(key);

    const entry = { name, role };
    if (/озвучк|voice/i.test(role) || (isAnimation && movie.type !== "Аниме" && explicitVoiceFact)) {
      credits.voiceActors.push(entry);
    } else if (movie.type === "Аниме") {
      credits.characters.push(entry);
    } else if (
      !isAnimation &&
      (movie.type === "Фильм" || movie.type === "Сериал") &&
      !/создател|режисс|продюсер|шоураннер|сценарист|producer|director|writer/i.test(role)
    ) {
      credits.actors.push(entry);
    } else {
      credits.unclassified.push(entry);
    }
  }

  const verified = movie.verifiedCredits;
  if (!credits.directors.length && movie.type !== "Сериал" && verified?.directors?.length) {
    credits.directors = uniqueNames(verified.directors);
  }
  if (!credits.seriesCreators.length && verified?.seriesCreators?.length) {
    credits.seriesCreators = uniqueNames(verified.seriesCreators);
  }
  if (!credits.actors.length && !isAnimation && verified?.actors?.length) {
    credits.actors = verified.actors.map((person) => ({ ...person }));
  }

  return credits;
}
