import { build } from './app/node_modules/esbuild/lib/main.js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

await build({ entryPoints: ['app/src/main.ts'], outfile: 'app/dist/motion.js', bundle: true,
  format: 'esm', platform: 'browser', minify: true, tsconfigRaw: {}, external: ['three/webgpu', 'three/tsl'] });
let js = readFileSync('app/dist/motion.js', 'utf8').replaceAll('__NIGHTMARE__', 'nightmare.mp4');
writeFileSync('app/dist/motion.js', js);
let html = readFileSync('index.src.html', 'utf8');
mkdirSync('assets', { recursive: true });
html = html.replace(/data:(image\/[\w.+-]+|font\/[\w.+-]+);base64,([A-Za-z0-9+/=]+)/g, (_, mime, data) => {
  const bytes = Buffer.from(data, 'base64');
  const ext = mime.split('/')[1].replace('jpeg', 'jpg').replace('svg+xml', 'svg');
  const name = `assets/${createHash('sha256').update(bytes).digest('hex').slice(0, 16)}.${ext}`;
  writeFileSync(name, bytes);
  return name;
});
html = html.replace('<script type="module" id="motion-bundle">/*MOTION*/</script>',
  '<script type="module" id="motion-bundle" src="app/dist/motion.js"></script>');
const startup = `<script>
document.documentElement.classList.add('booting');
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
// Keep the document usable if the animation bundle fails to load.
window.setTimeout(() => document.documentElement.classList.remove('booting'), 8000);
</script>
<style>
html.booting { overflow: hidden; scroll-snap-type: none; }
html.booting #page > section:not(#home),
html.booting #home .flow > :not(#home-title) { display: none !important; }
.carousel:has(.car-item[style*="transform"]) .text { backdrop-filter: none; }
</style>`;
html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<link rel="preload" as="image" href="bg-01.jpg" fetchpriority="high">\n<link rel="modulepreload" href="app/dist/motion.js">\n' + startup);
writeFileSync('index.html', html);
console.log(`Built index.html: ${Buffer.byteLength(html)} bytes`);
