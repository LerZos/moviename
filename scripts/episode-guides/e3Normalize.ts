import "server-only";
import { buildPilotSnapshot } from "./e2Normalize";
import { endpointIdentity } from "./e3Transport";

export function buildE3PilotSnapshot(
  entry: Parameters<typeof buildPilotSnapshot>[0],
  identity: Parameters<typeof buildPilotSnapshot>[1],
  baseline: Parameters<typeof buildPilotSnapshot>[2],
  responses: Parameters<typeof buildPilotSnapshot>[3],
) {
  return buildPilotSnapshot(entry, identity, baseline, responses, endpointIdentity);
}
