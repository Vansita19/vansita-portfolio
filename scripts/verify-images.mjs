import { readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
import { load } from 'cheerio';
const root = resolve(process.argv[2] || 'dist');
for (const route of ['', 'pitch-protocol', 'turboml']) {
  const $ = load(await readFile(join(root, route, 'index.html'), 'utf8'));
  let count = 0, bytes = 0;
  for (const el of $('img[srcset], img[data-project-srcset], picture source[srcset]').toArray()) {
    const node = $(el);
    const entries = (node.attr('srcset') || node.attr('data-project-srcset')).split(',').map(value => value.trim().split(/\s+/));
    for (const [src] of entries) assert((await stat(join(root, src))).size > 0, `Missing responsive image ${src}`);
    if (el.tagName === 'img') {
      assert.equal(node.attr('decoding'), 'async');
      assert(node.attr('sizes'), 'Responsive image needs a sizes hint');
      bytes += (await stat(join(root, node.attr('src') || node.attr('data-project-src')))).size;
      count++;
    }
  }
  if (route === '') {
    assert.equal($('.intro-tag img').attr('fetchpriority'), 'high');
    assert($('.featured .cover img[src][srcset]').length > 0, 'Project covers must be discoverable without waiting for JavaScript');
    assert.equal($('.featured .cover img[data-project-src]').length, 0);
    assert.equal($('.featured video[data-project-poster]').length, 0);
  }
  assert(count > 0, `No optimized images on /${route}`);
  if (route === 'pitch-protocol') {
    assert.equal($('.pitch-draft-hero').attr('loading'), 'eager');
    assert.equal($('.pitch-draft-hero').attr('fetchpriority'), 'high');
    // Full-resolution screenshots remain available on request.
    for (const el of $('[data-image-src]').toArray()) assert((await stat(join(root, $(el).attr('data-image-src')))).size > 0);
  }
  console.log(`/${route}: ${count} responsive images, ${(bytes/1e6).toFixed(2)} MB combined largest variants; references verified.`);
}

// Homepage phone covers must keep the lightweight media path after each build.
{
  const $ = load(await readFile(join(root, 'index.html'), 'utf8'));
  for (const el of $('.featured .cover picture source, .small-preview picture source').toArray()) {
    const source = $(el);
    const srcset = source.attr('srcset') || source.attr('data-mobile-srcset');
    assert(srcset?.includes('-q40-'), 'Missing compressed phone cover');
    assert(!srcset.includes('800w'), 'Phone covers should be capped at 640px');
  }
  for (const el of $('[data-featured-video]').toArray()) {
    const video = $(el);
    assert(!video.attr('src'), 'Large cover videos must not load before they are visible');
    const src = video.attr('data-mobile-src');
    assert(src?.startsWith('/assets/featured/'), 'Phone cover must use the lightweight preview video');
    assert((await stat(join(root, src))).size < 1_500_000, 'Phone preview exceeds 1.5 MB');
  }
  console.log('Verified compressed phone covers, deferred video loading, and mobile video size budgets.');
}
