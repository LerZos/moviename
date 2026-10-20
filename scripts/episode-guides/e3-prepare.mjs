import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { requireLocal } from "./register-local.mjs";

const { PersistentTmdbE3Pilot } = requireLocal("./e3Transport.ts");
const { verifyLocalPilotIdentities } = requireLocal("./e3Import.ts");
const { buildE3PilotSnapshot } = requireLocal("./e3Normalize.ts");
const { writeJsonAtomic } = requireLocal("./importInfrastructure.ts");
const root = fileURLToPath(new URL("../../", import.meta.url));
const common = execFileSync("git", ["rev-parse", "--git-common-dir"], {
  cwd: root,
  encoding: "utf8",
}).trim();
const directory = join(resolve(root, common), "kinoluma-episode-guides-e3-pilot");
const session = await PersistentTmdbE3Pilot.open(directory, {
  sender: async () => { throw new Error("OFFLINE_ONLY"); },
});

function snapshotModule(snapshot) {
  return [
    'import "server-only";',
    'import type { EpisodeGuideSnapshot } from "../types";',
    "",
    "// Generated offline from the reviewed E.3 TMDB cache; do not hand-edit episode data.",
    `export const episodeGuideSnapshot = ${JSON.stringify(snapshot, null, 2)} as const satisfies EpisodeGuideSnapshot;`,
    "",
  ].join("\n");
}

try {
  const requestJournal = session.summary();
  const results = [];
  for (const { entry, identity, movie } of verifyLocalPilotIdentities()) {
    const responses = [];
    for (const response of requestJournal.filter((item) =>
      item.canonicalMovieId === entry.canonicalMovieId && item.status === 200)) {
      responses.push(await session.get(response.endpoint));
    }
    const result = buildE3PilotSnapshot(entry, identity, movie, responses);
    if (process.argv.includes("--verify-snapshots")) {
      const { episodeGuideSnapshot } = requireLocal(
        `../../src/app/lib/episodeGuides/snapshots/${entry.canonicalMovieId}.ts`,
      );
      assert.deepEqual(episodeGuideSnapshot, result.snapshot);
    }
    if (process.argv.includes("--write-snapshots")) {
      assert.equal(result.snapshot.verificationStatus, "verified_complete");
      assert.deepEqual(result.conflicts, []);
      await writeFile(
        join(root, "src/app/lib/episodeGuides/snapshots", `${entry.canonicalMovieId}.ts`),
        snapshotModule(result.snapshot),
        "utf8",
      );
    }
    results.push(result);
  }
  await writeJsonAtomic(join(directory, "prepared-snapshots.json"), { results, requestJournal });
  console.log(JSON.stringify({
    networkRequestsThisRun: 0,
    totalRecordedGETs: requestJournal.length,
    snapshotsWritten: process.argv.includes("--write-snapshots"),
    snapshotsReproducedFromCache: process.argv.includes("--verify-snapshots"),
    series: results.map(({ snapshot, conflicts, omissions, verification }) => {
      const regular = snapshot.regularSeasons.flatMap((season) => season.episodes);
      return {
        slug: snapshot.slug,
        verification,
        status: snapshot.verificationStatus,
        checksum: snapshot.checksum,
        seasons: snapshot.regularSeasons.map((season) => season.seasonNumber),
        regularEpisodes: regular.length,
        specials: snapshot.specials.length,
        russianRegularTitles: regular.filter((episode) => episode.russianTitle).length,
        russianSpecialTitles: snapshot.specials.filter((episode) => episode.russianTitle).length,
        missingDates: [...regular, ...snapshot.specials].filter((episode) => !episode.airDate).length,
        sourceLanguage: snapshot.sourceLanguage,
        conflicts,
        omissions,
      };
    }),
  }, null, 2));
} finally {
  await session.close();
}
