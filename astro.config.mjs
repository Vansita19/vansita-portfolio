import optimizedImages from './integrations/optimized-images.mjs';
import { defineConfig } from 'astro/config';
// Keep production builds from invalidating a running localhost dependency cache.
const dependencyCache = process.argv.includes('build') ? 'node_modules/.vite-build' : 'node_modules/.vite-dev';
export default defineConfig({ integrations: [optimizedImages()], vite: { cacheDir: dependencyCache }, site: 'https://vansita.design', output: 'static', prefetch: { prefetchAll: false }, devToolbar: { enabled: false }, server: {host: '127.0.0.1', port: 4324} });
