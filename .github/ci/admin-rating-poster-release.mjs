import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import net from 'node:net';

const repo = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const spec = JSON.parse(fs.readFileSync(new URL('./admin-rating-poster-source.json', import.meta.url), 'utf8'));
const output = path.resolve(process.env.KINOLUMA_CI_OUTPUT || path.join(repo, '../evidence/ci-preflight'));
const sha = value => createHash('sha256').update(value).digest('hex');
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const git = args => execFileSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim();
const write = (name, value) => {
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
};
const lines = value => value.split(/\r?\n/).filter(Boolean).sort();
const expectedFiles = [...Object.keys(spec.application), ...spec.ciFiles].sort();

export function validateApplication(read) {
  for (const [file, hashes] of Object.entries(spec.application)) {
    assert.equal(sha(read(file).toString('utf8').replaceAll('\r\n', '\n')), hashes.sha256LF, `Unapproved source: ${file}`);
  }
}

export function verifySource(local = false) {
  const commit = git(['rev-parse', 'HEAD']);
  assert.equal(git(['diff', '--cached', '--name-only']), '', 'Staged/uncommitted index');
  if (local) {
    assert.equal(commit, spec.baseCommit);
    assert.equal(git(['branch', '--show-current']), spec.branch);
    assert.deepEqual([...lines(git(['diff', '--name-only', 'HEAD'])), ...lines(git(['ls-files', '--others', '--exclude-standard']))].sort(), expectedFiles);
  } else {
    assert.equal(process.version, spec.node);
    assert.equal(process.platform, 'linux');
    assert.equal(process.arch, 'x64');
    assert.equal(process.env.GITHUB_REPOSITORY, spec.repository);
    assert.equal(process.env.GITHUB_REF_NAME, spec.branch);
    assert.ok(['push', 'workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME));
    assert.equal(commit, process.env.GITHUB_SHA, 'Checkout differs from event SHA');
    assert.deepEqual(git(['rev-list', '--parents', '-n', '1', 'HEAD']).split(' '), [commit, spec.baseCommit], 'Expected one non-merge commit on approved baseline');
    assert.deepEqual(lines(git(['diff', '--name-only', spec.baseCommit, 'HEAD'])), expectedFiles);
    assert.equal(git(['status', '--porcelain']), '', 'Dirty CI source');
    validateApplication(file => execFileSync('git', ['show', `HEAD:${file}`], { cwd: repo }));
  }
  validateApplication(file => fs.readFileSync(path.join(repo, file)));
  assert.ok(!fs.readdirSync(repo).some(file => file.startsWith('.env')), 'Environment files forbidden');
  const sourceHashes = Object.fromEntries(expectedFiles.map(file => [file, sha(fs.readFileSync(path.join(repo, file), 'utf8').replaceAll('\r\n', '\n'))]));
  return { pass: true, mode: local ? 'local-uncommitted-preflight' : 'committed-linux', baseCommit: spec.baseCommit, commit, tree: git(['rev-parse', 'HEAD^{tree}']), branch: spec.branch, files: expectedFiles, sourceHashes, lockfileSha256: sha(fs.readFileSync(path.join(repo, 'package-lock.json'))), productionEligible: false, requiresIntegrationAfterVibix: true };
}

function childEnv(label, build = false) {
  const env = {};
  for (const key of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA', 'COMSPEC', 'PATHEXT', 'HOME', 'TMPDIR']) {
    if (process.env[key]) env[key] = process.env[key];
  }
  Object.assign(env, {
    NEXT_TELEMETRY_DISABLED: '1',
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:9',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'ci-public-placeholder-not-a-credential',
    KINOLUMA_DISABLE_SUPABASE_DURING_BUILD: build ? 'true' : 'false',
    KINOLUMA_LOAD_PUBLISHED_DRAFTS: 'false',
    NODE_OPTIONS: '--import=' + new URL('./admin-rating-poster-network-guard.mjs', import.meta.url).href,
    KINOLUMA_CI_NETWORK_LOG: path.join(output, `${label}-network.jsonl`),
  });
  return env;
}

function noNetwork(env) {
  assert.ok(!fs.existsSync(env.KINOLUMA_CI_NETWORK_LOG) || fs.statSync(env.KINOLUMA_CI_NETWORK_LOG).size === 0, 'Outbound network attempt; see evidence');
}

function runNode(label, args, env = childEnv(label)) {
  fs.mkdirSync(output, { recursive: true });
  const result = spawnSync(process.execPath, args, { cwd: repo, env, encoding: 'utf8', timeout: 25 * 60 * 1000, maxBuffer: 64 * 1024 * 1024 });
  const log = (result.stdout || '') + (result.stderr || '');
  fs.writeFileSync(path.join(output, label + '.log'), log, { flag: 'wx' });
  process.stdout.write(log);
  assert.equal(result.status, 0, `${label} failed: ${result.error || result.status}`);
  noNetwork(env);
  return log;
}

function assertTestCounts(log, count) {
  for (const [key, value] of [['tests', count], ['pass', count], ['fail', 0], ['skipped', 0]]) {
    assert.match(log, new RegExp(`^# ${key} ${value}$`, 'm'), `${key}: expected ${value}`);
  }
}

function checks() {
  assert.equal(process.version, spec.node);
  runNode('typescript', ['node_modules/typescript/bin/tsc', '--noEmit', '--incremental', 'false']);
  const lintFiles = expectedFiles.filter(file => /\.(?:tsx?|mjs)$/.test(file));
  runNode('eslint', ['node_modules/eslint/bin/eslint.js', ...lintFiles]);
  const regression = runNode('regression', ['--test', '--test-reporter=tap', 'scripts/admin-rating-integrated.test.mjs', 'scripts/admin-rating.test.mjs', 'scripts/episode-guides/integration.test.mjs', 'scripts/episode-guides/accordion.test.mjs', 'scripts/credits-normalization.test.mjs', 'scripts/batch-c3-credits.test.mjs']);
  assertTestCounts(regression, 124); // Includes all 44 inherited admin-poster/P1/P2 tests.
  const lazy = runNode('supabase-lazy', ['--experimental-strip-types', '--experimental-loader', './scripts/server-only-test-loader.mjs', '--test', '--test-reporter=tap', './scripts/supabase-admin-lazy.test.mjs']);
  assertTestCounts(lazy, 5);
  write('checks.json', { pass: true, node: process.version, regression: 124, supabaseLazy: 5, posterP1P2Included: true, typescript: true, scopedLint: true, realCredentials: false });
}

function build() {
  assert.equal(process.version, spec.node);
  const env = childEnv('build', true);
  env.KINOLUMA_ADMIN_SECRET = 'KINO_CI_PRIVATE_CANARY_ADMIN';
  env.CRON_SECRET = 'KINO_CI_PRIVATE_CANARY_CRON';
  const log = runNode('build', ['node_modules/next/dist/bin/next', 'build', '--webpack'], env);
  assert.match(log, /198\/198/);
  write('build.json', { pass: true, node: process.version, buildId: fs.readFileSync(path.join(repo, '.next/BUILD_ID'), 'utf8').trim(), staticPages: 198, realCredentials: false, publicConfiguration: 'loopback fixture; rebuild required for production' });
}

export function scanClient(root) {
  let files = 0;
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(file); continue; }
      assert.ok(entry.isFile(), 'Unexpected client symlink');
      const text = fs.readFileSync(file, 'utf8');
      // supabase-js contains a literal "sb_secret_" prefix check. A prefix alone
      // is library code, not a credential. Reject key-shaped values and canaries.
      if (/SUPABASE_SERVICE_ROLE_KEY|TMDB_API_KEY|TMDB_ACCESS_TOKEN|sb_secret_[A-Za-z0-9_-]{16,}|KINO_CI_PRIVATE_CANARY|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) {
        throw new Error(`Privileged marker in ${file}`); // Never print bundle/token contents.
      }
      for (const match of text.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)) {
        let decoded;
        try { decoded = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8')); } catch { continue; }
        assert.notEqual(decoded.role, 'service_role', `Privileged JWT in ${file}`);
      }
      files++;
    }
  }
  walk(root); assert.ok(files > 0); return { pass: true, files, canaryScan: true, privilegedMarkers: true, serviceRoleJWTScan: true };
}

function validatePayload(root, buildId) {
  for (const file of ['server.js', 'package.json', '.next/BUILD_ID', 'release-metadata.json']) assert.ok(fs.statSync(path.join(root, file)).isFile(), file);
  assert.equal(fs.readFileSync(path.join(root, '.next/BUILD_ID'), 'utf8').trim(), buildId);
  assert.ok(fs.readdirSync(path.join(root, '.next/static')).length);
  assert.ok(fs.readdirSync(path.join(root, 'public')).length);
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      assert.ok(!entry.name.startsWith('.env') && !['.git', '.npmrc'].includes(entry.name) && !/\.(?:pem|key)$/.test(entry.name), `Forbidden artifact file: ${file}`);
      if (entry.isSymbolicLink()) {
        const relative = path.relative(root, fs.realpathSync(file));
        assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), `Escaping symlink: ${file}`);
      } else if (entry.isDirectory()) walk(file);
      else assert.ok(entry.isFile(), `Unsupported artifact entry: ${file}`);
    }
  }
  walk(root);
  assert.ok(fs.existsSync(path.join(root, 'node_modules/@img/sharp-linux-x64')));
  assert.ok(fs.existsSync(path.join(root, 'node_modules/@img/sharp-libvips-linux-x64')));
  assert.ok(!fs.readdirSync(path.join(root, 'node_modules/@img')).some(name => name.includes('win32')));
}

async function runtime(root) {
  const require = createRequire(path.join(root, 'server.js'));
  const sharpFile = fs.realpathSync(require.resolve('sharp'));
  const relative = path.relative(root, sharpFile);
  assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'Sharp resolved outside extracted artifact');
  const png = await require('sharp')({ create: { width: 2, height: 2, channels: 4, background: '#26134d' } }).resize(1, 1).png().toBuffer();
  assert.ok(png.length > 0);
  const socket = net.createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  const env = { ...childEnv('runtime', true), NODE_ENV: 'production', HOSTNAME: '127.0.0.1', PORT: String(port), KINOLUMA_ADMIN_SECRET: 'ci-fixture-only' };
  const server = spawn(process.execPath, [path.join(root, 'server.js')], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  for (const stream of [server.stdout, server.stderr]) stream.on('data', chunk => { log += chunk; });
  const closed = new Promise(resolve => server.on('close', resolve));
  const requests = [];
  try {
    for (let i = 0; i < 200 && !log.includes('Ready in'); i++) {
      assert.equal(server.exitCode, null, log);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(log.includes('Ready in'), 'Standalone startup timeout');
    const request = async (route, options) => {
      const response = await fetch(`http://127.0.0.1:${port}${route}`, { ...options, signal: AbortSignal.timeout(20000) });
      const body = await response.text();
      requests.push({ route, method: options?.method || 'GET', status: response.status });
      return { response, body };
    };
    let asset;
    for (const route of ['/', '/catalog/films', '/movie/chelovek-pauk-2002', '/movie/andor', '/movie/the-100-2014', '/sitemap.xml']) {
      const { response, body } = await request(route);
      assert.equal(response.status, 200, route);
      if (route.startsWith('/movie/')) { assert.match(body, /<h1[\s>]/); assert.match(body, /application\/ld\+json/); }
      if (route === '/') asset = body.match(/src="(\/_next\/static\/[^"?]+\.js)(?:\?[^" ]*)?"/)?.[1];
      if (route !== '/sitemap.xml') assert.ok(body.includes(`href="https://kinoluma.online${route === '/' ? '' : route}"`), `Canonical ${route}`);
      else { const urls = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]); assert.ok(urls.length > 0); assert.equal(new Set(urls).size, urls.length); }
    }
    assert.ok(asset, 'No static script');
    assert.equal((await request(asset)).response.status, 200);
    for (const [route, method, status] of [['/api/admin/movies/andor/override', 'PUT', 403], ['/api/admin/movies/andor/override', 'DELETE', 403], ['/api/admin/import/update-draft', 'POST', 401], ['/api/admin/import/create-draft', 'POST', 401]]) {
      assert.equal((await request(route, { method, headers: { 'content-type': 'application/json' }, body: '{}' })).response.status, status);
    }
    noNetwork(env);
    assert.doesNotMatch(log, /uncaught|unhandled rejection|TypeError:|ReferenceError:|CI_NETWORK_FORBIDDEN/i);
    return { pass: true, requests, standaloneSharp: true, networkAttempts: 0, productionWrites: false };
  } finally {
    server.kill(); await closed;
    fs.writeFileSync(path.join(output, 'runtime.log'), log, { flag: 'wx' });
  }
}

function archive(root, target) {
  const tarFile = target.replace(/\.gz$/, '');
  execFileSync('tar', ['--sort=name', '--mtime=@0', '--owner=0', '--group=0', '--numeric-owner', '-C', root, '-cf', tarFile, '.']);
  const fd = fs.openSync(target, 'wx');
  try { const result = spawnSync('gzip', ['-n', '-9', '-c', tarFile], { stdio: ['ignore', fd, 'pipe'] }); assert.equal(result.status, 0, result.stderr?.toString()); }
  finally { fs.closeSync(fd); }
}

async function packageRelease() {
  assert.equal(process.platform, 'linux'); assert.equal(process.version, spec.node);
  const source = json(path.join(output, 'source-final.json'));
  const checksReport = json(path.join(output, 'checks.json'));
  const buildReport = json(path.join(output, 'build.json'));
  for (const report of [source, checksReport, buildReport]) assert.equal(report.pass, true);
  assert.equal(source.commit, git(['rev-parse', 'HEAD']));
  const scan = scanClient(path.join(repo, '.next/static')); write('client-scan.json', scan);
  const release = path.join(output, 'release'), dist = path.join(output, 'dist'), extracted = path.join(output, 'extracted');
  for (const dir of [release, dist, extracted]) { assert.ok(!fs.existsSync(dir), `Existing output: ${dir}`); fs.mkdirSync(dir); }
  fs.cpSync(path.join(repo, '.next/standalone'), release, { recursive: true });
  fs.cpSync(path.join(repo, '.next/static'), path.join(release, '.next/static'), { recursive: true });
  fs.cpSync(path.join(repo, 'public'), path.join(release, 'public'), { recursive: true });
  fs.copyFileSync(path.join(repo, '.next/BUILD_ID'), path.join(release, '.next/BUILD_ID'));
  const metadata = { repository: spec.repository, branch: spec.branch, commit: source.commit, baseline: spec.baseCommit, buildId: buildReport.buildId, node: process.version, npm: spec.npm, lockfileSha256: source.lockfileSha256, productionEligible: false, requiresIntegrationAfterVibix: true, publicConfiguration: buildReport.publicConfiguration };
  fs.writeFileSync(path.join(release, 'release-metadata.json'), JSON.stringify(metadata, null, 2) + '\n');
  validatePayload(release, buildReport.buildId);
  runNode('release-tree-create', ['.github/ci/release-tree.mjs', 'create', release, path.join(release, 'release-tree.json')]);
  const name = `kinoluma-admin-rating-poster-linux-${source.commit}-${buildReport.buildId}.tar.gz`;
  const archivePath = path.join(dist, name);
  archive(release, archivePath);
  const repeated = path.join(output, 'repacked.tar.gz'); archive(release, repeated);
  const archiveHash = sha(fs.readFileSync(archivePath));
  assert.equal(sha(fs.readFileSync(repeated)), archiveHash, 'Packaging is not deterministic');
  // Only our just-created archive is extracted, into a fresh directory.
  execFileSync('tar', ['--same-permissions', '-xzf', archivePath, '-C', extracted]);
  runNode('release-tree-verify', ['.github/ci/release-tree.mjs', 'verify', extracted, path.join(extracted, 'release-tree.json')]);
  validatePayload(extracted, buildReport.buildId);
  assert.deepEqual(json(path.join(extracted, 'release-metadata.json')), metadata);
  const runtimeReport = await runtime(extracted); write('runtime.json', runtimeReport);
  const tree = json(path.join(extracted, 'release-tree.json'));
  const manifest = { ...metadata, pass: true, validation: { source: true, checks: checksReport, build: buildReport, clientScan: scan, runtime: runtimeReport, archiveExtraction: true, deterministicRepack: true }, artifact: { name, bytes: fs.statSync(archivePath).size, sha256: archiveHash, treeSha256: tree.treeSha256, files: tree.entries }, reproduction: { install: 'npm ci --include=optional --no-audit --no-fund', build: 'node .github/ci/admin-rating-poster-release.mjs build', note: 'Deterministic packaging of this build. Independent Next builds may generate different Build IDs; byte-identical independent rebuild is not claimed.' } };
  fs.writeFileSync(path.join(dist, 'release-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(dist, name + '.sha256'), `${archiveHash}  ${name}\n`);
  // Keep uncompressed .tar and repack evidence outside uploaded dist.
  fs.renameSync(archivePath.replace(/\.gz$/, ''), path.join(output, 'release-uncompressed.tar'));
  for (const file of ['source-final.json', 'checks.json', 'build.json', 'client-scan.json', 'runtime.json']) fs.copyFileSync(path.join(output, file), path.join(dist, file));
  fs.copyFileSync(path.join(extracted, 'release-tree.json'), path.join(dist, 'release-tree.json'));
  console.log(JSON.stringify({ pass: true, commit: source.commit, buildId: buildReport.buildId, archiveHash, productionEligible: false }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const mode = process.argv[2];
  if (mode === 'preflight') write('local-preflight.json', verifySource(true));
  else if (mode === 'source' || mode === 'source-final') write(`${mode}.json`, verifySource());
  else if (mode === 'checks') checks();
  else if (mode === 'build') build();
  else if (mode === 'package') await packageRelease();
  else throw new Error('Usage: preflight|source|source-final|checks|build|package');
}
