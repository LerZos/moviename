// Run against a local built app: KINOLUMA_SEO_QA_ORIGIN=http://127.0.0.1:<port>
// node --test scripts/seo-crawlable-links.test.mjs
import assert from 'node:assert/strict';
import { before, test } from 'node:test';

const origin = new URL(process.env.KINOLUMA_SEO_QA_ORIGIN || '');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname), 'QA must use a loopback server');
assert.equal(origin.protocol, 'http:');
assert.equal(origin.username + origin.password + origin.search + origin.hash, '');

async function get(path) {
  const response = await fetch(new URL(path, origin), {
    redirect: 'error',
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(response.status, 200, path);
  return response.text();
}

// Inspect actual HTML elements, excluding JSON-LD and React's serialized payload.
// Those script strings can contain URLs without providing a crawlable anchor.
function elements(source) {
  const html = source.replace(/<!--[^]*?-->/g, '').replace(/<(script|style)\b[^>]*>[^]*?<\/\1>/gi, '');
  const nodes = [], stack = [];
  const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  for (const match of html.matchAll(/<\/?([a-z][\w:-]*)\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi)) {
    const tag = match[1].toLowerCase();
    if (match[0].startsWith('</')) {
      const index = stack.findLastIndex(node => node.tag === tag);
      if (index >= 0) {
        for (const node of stack.splice(index)) node.end = match.index;
      }
      continue;
    }
    const attributeText = match[0].slice(match[1].length + 1, -1);
    const attributes = Object.fromEntries([...attributeText.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)].map(m => [m[1].toLowerCase(), m[2] ?? m[3] ?? m[4] ?? '']));
    const node = { tag, attributes, parent: stack.at(-1), start: match.index + match[0].length, end: html.length };
    nodes.push(node);
    if (!voidTags.has(tag) && !match[0].endsWith('/>')) stack.push(node);
  }
  return { nodes, html };
}

function inside(node, ancestor) {
  for (let parent = node.parent; parent; parent = parent.parent) if (parent === ancestor) return true;
  return false;
}

function hiddenWithoutScript(node) {
  for (let current = node; current; current = current.parent) {
    if (Object.hasOwn(current.attributes, 'hidden')) return true;
    if (/(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse))\s*(?:!important)?\s*(?:;|$)/i.test(current.attributes.style || '')) return true;
  }
  return false;
}

test('no-JS inspection rejects hidden ancestors, not just empty link text', () => {
  for (const attributes of ['hidden', 'hidden="false"', 'style="display:none"', 'style="visibility: hidden !important"']) {
    const { nodes } = elements(`<div ${attributes}><a href="/movie/inception">Inception</a></div>`);
    assert.equal(hiddenWithoutScript(nodes.find(node => node.tag === 'a')), true, attributes);
  }
  const { nodes } = elements('<nav><a href="/movie/inception">Inception</a></nav>');
  assert.equal(hiddenWithoutScript(nodes.find(node => node.tag === 'a')), false);
});

let canonicalPaths;
const pages = new Map();
before(async () => {
  const sitemap = await get('/sitemap.xml');
  canonicalPaths = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname));
  assert.ok(canonicalPaths.size > 0, 'Sitemap must contain canonical paths');
  for (const route of ['/', '/catalog/films']) pages.set(route, elements(await get(route)));
});

for (const route of ['/', '/catalog/films']) {
  test(`${route}: useful loading navigation has visible canonical links without script execution`, () => {
    const page = pages.get(route);
    const navigation = page.nodes.find(node => node.tag === 'nav' && node.attributes.class?.split(/\s+/).includes('loading-film-navigation'));
    assert.ok(navigation, 'Missing useful loading fallback navigation');
    assert.equal(hiddenWithoutScript(navigation), false, 'Fallback itself is hidden');
    const links = page.nodes.filter(node => node.tag === 'a' && node.attributes.href?.startsWith('/movie/') && !hiddenWithoutScript(node));
    assert.ok(links.length >= 6, 'Need visible movie links, not links inside React streaming containers');
    for (const link of links) {
      assert.ok(inside(link, navigation));
      assert.ok(canonicalPaths.has(link.attributes.href));
      assert.ok(page.html.slice(link.start, link.end).replace(/<[^>]+>/g, '').trim());
    }
    console.log(JSON.stringify({ route, visibleNoJsMovieLinks: links.length, unique: new Set(links.map(node => node.attributes.href)).size, hiddenMovieLinks: page.nodes.filter(node => node.tag === 'a' && node.attributes.href?.startsWith('/movie/') && hiddenWithoutScript(node)).length }));
  });
}

test('internal non-movie links in SSR HTML resolve without 404', async () => {
  const hrefs = new Set();
  for (const page of pages.values()) {
    for (const node of page.nodes) {
      const href = node.tag === 'a' ? node.attributes.href : undefined;
      if (href?.startsWith('/') && !href.startsWith('//') && !href.startsWith('/movie/')) hrefs.add(href.split('#')[0] || '/');
    }
  }
  assert.ok(hrefs.size > 0);
  for (const href of hrefs) await get(href);
  console.log(JSON.stringify({ internalNonMovieLinks: [...hrefs].sort() }));
});

for (const [route, cardClass, buttonCount] of [['/', 'desktop-mock-card', 2], ['/', 'mobile-v2-card', 2], ['/', 'movie-card', 4], ['/catalog/films', 'catalog-card', 4]]) {
  test(`${route} ${cardClass}: every active-template SSR card has a real canonical movie anchor`, () => {
    const page = pages.get(route);
    const cards = page.nodes.filter(node => node.attributes.class?.split(/\s+/).includes(cardClass));
    assert.ok(cards.length > 0, 'No server-rendered cards found');
    const hrefs = [];
    for (const card of cards) {
      const links = page.nodes.filter(node => node.tag === 'a' && inside(node, card));
      assert.equal(links.length, 1, 'Each card must expose a movie-page anchor without replacing its modal buttons');
      const link = links[0], href = link.attributes.href;
      assert.match(href, /^\/movie\/[a-z0-9][a-z0-9_-]*$/);
      assert.ok(canonicalPaths.has(href), `Noncanonical or unknown movie path: ${href}`);
      assert.ok(page.html.slice(link.start, link.end).replace(/<[^>]+>/g, '').trim(), 'Movie link must have visible text');
      hrefs.push(href);
    }
    console.log(JSON.stringify({ route, template: cardClass, cards: cards.length, movieLinks: hrefs.length, uniqueMovieLinks: new Set(hrefs).size }));
  });

  test(`${route} ${cardClass}: modal buttons remain separate from links`, () => {
    const page = pages.get(route);
    const cards = page.nodes.filter(node => node.attributes.class?.split(/\s+/).includes(cardClass));
    for (const card of cards) {
      const buttons = page.nodes.filter(node => node.tag === 'button' && inside(node, card));
      assert.equal(buttons.length, buttonCount, 'Poster/title modal buttons and existing catalog actions must remain');
    }
    const interactive = new Set(['a', 'button', 'input', 'select', 'textarea']);
    for (const node of page.nodes.filter(node => node.tag === 'a' && node.attributes.href?.startsWith('/movie/'))) {
      for (let parent = node.parent; parent; parent = parent.parent) assert.ok(!interactive.has(parent.tag), 'Movie link nested in an interactive element');
      assert.ok(!page.nodes.some(child => interactive.has(child.tag) && inside(child, node)), 'Interactive child nested in a movie link');
    }
  });
}
