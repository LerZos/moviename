import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const adminModulePath = path.join(
  repositoryRoot,
  "src",
  "app",
  "lib",
  "supabase",
  "admin.ts",
);
const adminModuleUrl = pathToFileURL(adminModulePath).href;

const MANAGED_ENV_NAMES = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "KINOLUMA_DISABLE_SUPABASE_DURING_BUILD",
];

function preserveEnvironment() {
  const original = new Map(
    MANAGED_ENV_NAMES.map((name) => [name, process.env[name]]),
  );

  return () => {
    for (const [name, value] of original) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  };
}

function clearAdminEnvironment() {
  for (const name of MANAGED_ENV_NAMES) delete process.env[name];
}

async function importFreshAdminModule(testCase) {
  return import(`${adminModuleUrl}?test=${encodeURIComponent(testCase)}`);
}

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectSourceFiles(entryPath)));
    else if (/\.tsx?$/.test(entry.name)) files.push(entryPath);
  }

  return files;
}

test("imports without a service-role key and does not initialize eagerly", async () => {
  const restoreEnvironment = preserveEnvironment();

  try {
    clearAdminEnvironment();
    const admin = await importFreshAdminModule("missing-import");

    assert.equal(admin.hasRealSupabaseAdminCredentials(), false);
  } finally {
    restoreEnvironment();
  }
});

test("fails in a controlled way when a privileged operation has no key", async () => {
  const restoreEnvironment = preserveEnvironment();

  try {
    clearAdminEnvironment();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://unit-test.supabase.co";
    const admin = await importFreshAdminModule("missing-key-operation");

    assert.throws(
      () => admin.getSupabaseAdmin().from("movie_overrides"),
      /Missing SUPABASE_SERVICE_ROLE_KEY/,
    );
  } finally {
    restoreEnvironment();
  }
});

test("memoizes one client for valid runtime configuration", async () => {
  const restoreEnvironment = preserveEnvironment();

  try {
    clearAdminEnvironment();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://unit-test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "unit-test-service-role-key";
    const admin = await importFreshAdminModule("memoized-runtime");

    assert.equal(admin.hasRealSupabaseAdminCredentials(), true);
    assert.strictEqual(admin.getSupabaseAdmin(), admin.getSupabaseAdmin());
  } finally {
    restoreEnvironment();
  }
});

test("build opt-out can import public paths without initializing admin", async () => {
  const restoreEnvironment = preserveEnvironment();

  try {
    clearAdminEnvironment();
    process.env.KINOLUMA_DISABLE_SUPABASE_DURING_BUILD = "true";
    const admin = await importFreshAdminModule("public-build-import");

    assert.equal(admin.hasRealSupabaseAdminCredentials(), false);
  } finally {
    restoreEnvironment();
  }
});

test("all existing admin importers use the lazy getter", async () => {
  const sourceRoot = path.join(repositoryRoot, "src");
  const sourceFiles = await collectSourceFiles(sourceRoot);
  const importerFiles = [];

  for (const file of sourceFiles) {
    if (path.resolve(file) === path.resolve(adminModulePath)) continue;

    const source = await readFile(file, "utf8");
    if (!source.includes("supabase/admin")) continue;

    importerFiles.push(file);
    assert.match(source, /\bgetSupabaseAdmin\b/);
    assert.doesNotMatch(source, /\bsupabaseAdmin\b/);
  }

  assert.equal(importerFiles.length, 21);
  assert.match(await readFile(adminModulePath, "utf8"), /^import 'server-only';/);
});
