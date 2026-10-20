import { execFileSync } from "node:child_process";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { requireLocal } from "./register-local.mjs";

const { PersistentTmdbE3Pilot, createTmdbSender } = requireLocal("./e3Transport.ts");
const { collectPilot, initialPlan, verifyLocalPilotIdentities } = requireLocal("./e3Import.ts");
const root = fileURLToPath(new URL("../../", import.meta.url));
const common = execFileSync("git", ["rev-parse", "--git-common-dir"], {
  cwd: root,
  encoding: "utf8",
}).trim();
const directory = join(resolve(root, common), "kinoluma-episode-guides-e3-pilot");
const networkEnabled = process.argv.includes("--network");
const initialize = process.argv.includes("--initialize-once");
const detailsOnly = process.argv.includes("--details-only");
const inspectOnly = process.argv.includes("--inspect");
let session;
try {
  verifyLocalPilotIdentities();
  console.log(JSON.stringify({
    initialMaximumGETs: initialPlan().length,
    hardBudget: 33,
    concurrency: 1,
    networkEnabled,
  }));
  const token = process.env.TMDB_ACCESS_TOKEN;
  delete process.env.TMDB_ACCESS_TOKEN;
  const sender = networkEnabled
    ? createTmdbSender(token ?? "")
    : async () => { throw new Error("NETWORK_DISABLED"); };
  session = await PersistentTmdbE3Pilot.open(directory, {
    initialize,
    networkEnabled,
    sender,
  });
  if (!inspectOnly) console.log(JSON.stringify(await collectPilot(session, detailsOnly), null, 2));
  console.log(JSON.stringify({ requestJournal: session.summary() }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : "IMPORT_FAILED");
  if (session) console.log(JSON.stringify({ requestJournal: session.summary() }, null, 2));
  process.exitCode = 1;
} finally {
  await session?.close();
}
