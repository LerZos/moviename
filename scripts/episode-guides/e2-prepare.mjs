import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { requireLocal } from "./register-local.mjs";
const { PersistentTmdbPilot } = requireLocal("./e2Transport.ts");
const { verifyLocalPilotIdentities } = requireLocal("./e2Import.ts");
const { buildPilotSnapshot } = requireLocal("./e2Normalize.ts");
const { writeJsonAtomic } = requireLocal("./importInfrastructure.ts");
const root = fileURLToPath(new URL("../../", import.meta.url));
const common = execFileSync("git", ["rev-parse", "--git-common-dir"], { cwd: root, encoding: "utf8" }).trim();
const directory = join(resolve(root, common), "kinoluma-episode-guides-e2-pilot");
const session = await PersistentTmdbPilot.open(directory, {
  sender: async () => { throw new Error("OFFLINE_ONLY"); },
});
try {
  const requestJournal = session.summary();
  const results = [];
  for (const { entry, identity, movie } of verifyLocalPilotIdentities()) {
    const responses = [];
    for (const response of requestJournal.filter((item) => item.canonicalMovieId === entry.canonicalMovieId && item.status === 200)) {
      responses.push(await session.get(response.endpoint));
    }
    const result = buildPilotSnapshot(entry, identity, movie, responses);
    if (process.argv.includes("--verify-snapshots")) {
      const { episodeGuideSnapshot } = requireLocal(
        `../../src/app/lib/episodeGuides/snapshots/${entry.canonicalMovieId}.ts`,
      );
      assert.deepEqual(episodeGuideSnapshot, result.snapshot, "Snapshot must reproduce exactly from the cached provider responses");
    }
    results.push(result);
  }
  await writeJsonAtomic(join(directory, "prepared-snapshots.json"), { results, requestJournal });
  console.log(JSON.stringify({
    networkRequestsThisRun: 0,
    totalRecordedGETs: requestJournal.length,
    snapshotsReproducedFromCache: process.argv.includes("--verify-snapshots"),
    series: results.map(({ snapshot, conflicts, omissions, verification }) => {
      const regular = snapshot.regularSeasons.flatMap((season) => season.episodes);
      return {
        slug: snapshot.slug, verification,
        status: snapshot.verificationStatus, checksum: snapshot.checksum,
        seasons: snapshot.regularSeasons.map((season) => season.seasonNumber),
        regularEpisodes: regular.length, specials: snapshot.specials.length,
        russianRegularTitles: regular.filter((episode) => episode.russianTitle).length,
        russianSpecialTitles: snapshot.specials.filter((episode) => episode.russianTitle).length,
        missingDates: [...regular, ...snapshot.specials].filter((episode) => !episode.airDate).length,
        conflicts, omissions,
      };
    }),
  }, null, 2));
} finally { await session.close(); }
