import { createHash } from "node:crypto";
import { lstat, readFile, readlink, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const mode = process.argv[2];
const root = path.resolve(process.argv[3] ?? "release");
const manifestPath = path.resolve(process.argv[4] ?? path.join(root, "release-tree.json"));
const skippedRelativePath = path.relative(root, manifestPath).split(path.sep).join("/");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function collect(directory, prefix = "") {
  const directoryEntries = await readdir(directory, { withFileTypes: true });
  directoryEntries.sort((a, b) => a.name.localeCompare(b.name, "en"));
  const result = [];

  for (const entry of directoryEntries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (relativePath === skippedRelativePath) continue;
    const absolutePath = path.join(directory, entry.name);
    const stat = await lstat(absolutePath);
    const fileMode = (stat.mode & 0o777).toString(8).padStart(3, "0");

    if (entry.isDirectory()) {
      result.push(...(await collect(absolutePath, relativePath)));
      continue;
    }

    if (entry.isSymbolicLink()) {
      const target = await readlink(absolutePath);
      result.push({
        path: relativePath,
        type: "symlink",
        mode: fileMode,
        bytes: Buffer.byteLength(target),
        sha256: sha256(`symlink\0${target}`),
        target,
      });
      continue;
    }

    if (entry.isFile()) {
      const contents = await readFile(absolutePath);
      result.push({
        path: relativePath,
        type: "file",
        mode: fileMode,
        bytes: contents.byteLength,
        sha256: sha256(contents),
      });
    }
  }

  return result;
}

function treeHash(entries) {
  const canonical = entries
    .map((entry) =>
      [entry.type, entry.mode, entry.bytes, entry.sha256, entry.path, entry.target ?? ""].join("\t"),
    )
    .join("\n");
  return sha256(Buffer.from(canonical, "utf8"));
}

function findFirstDifference(expectedEntries, actualEntries) {
  const fields = ["path", "type", "mode", "bytes", "sha256", "target"];
  const length = Math.max(expectedEntries.length, actualEntries.length);

  for (let index = 0; index < length; index += 1) {
    const expectedEntry = expectedEntries[index];
    const actualEntry = actualEntries[index];

    if (!expectedEntry || !actualEntry) {
      return {
        index,
        path: expectedEntry?.path ?? actualEntry?.path ?? null,
        field: !expectedEntry ? "unexpected-entry" : "missing-entry",
        expected: expectedEntry ?? null,
        actual: actualEntry ?? null,
      };
    }

    for (const field of fields) {
      const expectedValue = expectedEntry[field] ?? null;
      const actualValue = actualEntry[field] ?? null;
      if (expectedValue !== actualValue) {
        return {
          index,
          path: expectedEntry.path ?? actualEntry.path,
          field,
          expected: expectedValue,
          actual: actualValue,
        };
      }
    }
  }

  return null;
}

if (mode === "create") {
  const entries = await collect(root);
  const manifest = {
    schemaVersion: 1,
    definition: "SHA-256 of sorted type/mode/bytes/content-hash/path/symlink-target rows; manifest excluded",
    entries: entries.length,
    bytes: entries.reduce((total, entry) => total + entry.bytes, 0),
    treeSha256: treeHash(entries),
    files: entries,
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`RELEASE_TREE_ENTRIES=${manifest.entries}`);
  console.log(`RELEASE_TREE_SHA256=${manifest.treeSha256}`);
} else if (mode === "verify") {
  const expected = JSON.parse(await readFile(manifestPath, "utf8"));
  const entries = await collect(root);
  const actualTreeSha256 = treeHash(entries);
  const pass =
    actualTreeSha256 === expected.treeSha256 &&
    JSON.stringify(entries) === JSON.stringify(expected.files);
  console.log(`RELEASE_TREE_VERIFY=${pass ? "PASS" : "FAIL"}`);
  if (!pass) {
    console.log(`RELEASE_TREE_EXPECTED_ENTRIES=${expected.files.length}`);
    console.log(`RELEASE_TREE_ACTUAL_ENTRIES=${entries.length}`);
    console.log(`RELEASE_TREE_EXPECTED_SHA256=${expected.treeSha256}`);
    console.log(`RELEASE_TREE_ACTUAL_SHA256=${actualTreeSha256}`);
    console.log(
      `RELEASE_TREE_FIRST_DIFFERENCE=${JSON.stringify(findFirstDifference(expected.files, entries))}`,
    );
    process.exitCode = 1;
  }
} else {
  throw new Error("Usage: node release-tree.mjs <create|verify> <release-dir> [manifest-path]");
}
