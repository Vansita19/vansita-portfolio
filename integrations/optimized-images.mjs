import { readFile, writeFile, readdir, mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { load } from 'cheerio';

// Build-time only: no image transformation or scroll handlers in the browser.
export default function optimizedImages() {
  return { name: 'portfolio-optimized-images', hooks: {
    'astro:build:done': async ({ dir, logger }) => {
      const root = fileURLToPath(dir);
      const output = join(root, 'assets/optimized');
      await mkdir(output, { recursive: true });
      const cache = new Map();
      let originalBytes = 0, optimizedBytes = 0;
      async function variants(src) {
        // These already have deliberately lower phone-only quality and explicit sizes.
        if (src?.startsWith('/assets/mobile-covers/')) return null;
        if (!/^\/assets\/.*\.(png|jpe?g|webp)(?:[?#].*)?$/i.test(src || '')) return null;
        const pathname = decodeURIComponent(src.split(/[?#]/)[0]);
        if (cache.has(pathname)) return cache.get(pathname);
        const input = await readFile(join(root, pathname));
        const meta = await sharp(input).metadata();
        if (!meta.width || !meta.height || (meta.pages || 1) > 1) return null;
        const max = Math.min(meta.width, 2400);
        const widths = [...new Set([320, 640, 1280, 1920, max].filter(w => w <= max))];
        const hash = createHash('sha256').update(input).digest('hex').slice(0, 16);
        const entries = [];
        for (const width of widths) {
          const name = `${hash}-${width}.webp`;
          await sharp(input).resize({ width, withoutEnlargement: true }).webp({ quality: 85, effort: 4 }).toFile(join(output, name));
          entries.push({ width, src: `/assets/optimized/${name}` });
        }
        originalBytes += input.length;
        optimizedBytes += (await stat(join(root, entries.at(-1).src))).size;
        const result = { entries, width: meta.width, height: meta.height };
        cache.set(pathname, result);
        return result;
      }
      async function walk(path) {
        const entries = await readdir(path, { withFileTypes: true });
        return (await Promise.all(entries.map(e => e.isDirectory() ? walk(join(path, e.name)) : e.name.endsWith('.html') ? [join(path, e.name)] : []))).flat();
      }
      for (const file of await walk(root)) {
        const $ = load(await readFile(file, 'utf8'));
        for (const el of $('img').toArray()) {
          const img = $(el);
          const data = await variants(img.attr('src'));
          img.attr('decoding', 'async');
          // Retain existing eager/lazy decisions; defer decorative content below the fold.
          if (!img.attr('loading') && img.closest('.about-desk, footer, .project-footer').length) img.attr('loading', 'lazy');
          if (!data) continue;
          const { entries, width, height } = data;
          img.attr('src', entries.at(-1).src);
          if (!img.attr('srcset')) {
            img.attr('srcset', entries.map(e => `${e.src} ${e.width}w`).join(', '));
            const fixed = Number(img.attr('width'));
            img.attr('sizes', fixed && fixed <= 200 ? `${fixed}px` : img.closest('.about-desk').length ? '(max-width: 700px) 40vw, 420px' : '(max-width: 800px) 100vw, 1280px');
          }
          if (!img.attr('width') && !img.attr('height')) img.attr({ width: String(width), height: String(height) });
        }
        // Art-directed sources keep their original media query and aspect ratio.
        for (const el of $('picture > source').toArray()) {
          const source = $(el), data = await variants(source.attr('srcset'));
          if (data) source.attr('srcset', data.entries.map(e => `${e.src} ${e.width}w`).join(', ')).attr('sizes', '100vw');
        }
        for (const el of $('video[poster], svg image[href]').toArray()) {
          const node = $(el), attr = el.tagName === 'video' ? 'poster' : 'href';
          const data = await variants(node.attr(attr));
          if (data) node.attr(attr, (data.entries.find(e => e.width >= 1280) || data.entries.at(-1)).src);
        }
        await writeFile(file, $.html());
      }
      logger.info(`Optimized ${cache.size} images: ${(originalBytes/1e6).toFixed(1)} MB → ${(optimizedBytes/1e6).toFixed(1)} MB at the largest size; smaller screens download smaller variants.`);
    }
  }};
}
