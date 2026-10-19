import { execFileSync } from "node:child_process";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { requireLocal } from "./register-local.mjs";

const { PersistentTmdbPilot, createTmdbSender } = requireLocal("./e2Transport.ts");
const { collectPilot, initialPlan, verifyLocalPilotIdentities } = requireLocal("./e2Import.ts");
const root = fileURLToPath(new URL("../../", import.meta.url));
const common = execFileSync("git", ["rev-parse", "--git-common-dir"], { cwd: root, encoding: "utf8" }).trim();
// Stable across worktrees and restarts. No arbitrary state-directory CLI flag.
const directory = join(resolve(root, common), "kinoluma-episode-guides-e2-pilot");
const networkEnabled = process.argv.includes("--network");
const initialize = process.argv.includes("--initialize-once");
const detailsOnly = process.argv.includes("--details-only");
const inspectOnly = process.argv.includes("--inspect");
let session;
try {
  verifyLocalPilotIdentities();
  console.log(JSON.stringify({ initialMaximumGETs: initialPlan().length, concurrency: 1, networkEnabled }));
  const token = process.env.TMDB_ACCESS_TOKEN;
  delete process.env.TMDB_ACCESS_TOKEN;
  const sender = networkEnabled
    ? createTmdbSender(token ?? "")
    : async () => { throw new Error("NETWORK_DISABLED"); };
  session = await PersistentTmdbPilot.open(directory, { initialize, networkEnabled, sender });
  if (!inspectOnly) console.log(JSON.stringify(await collectPilot(session, detailsOnly), null, 2));
  console.log(JSON.stringify({ requestJournal: session.summary() }, null, 2));
} catch (error) {
  // Our modules emit fixed diagnostics only, never transport/header/URL objects.
  console.error(error instanceof Error ? error.message : "IMPORT_FAILED");
  if (session) console.log(JSON.stringify({ requestJournal: session.summary() }, null, 2));
  process.exitCode = 1;
} finally {
  await session?.close();
}
