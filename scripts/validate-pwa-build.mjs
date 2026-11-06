import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const manifestPath = path.join(dist, 'asset-manifest.json');
if (!fs.existsSync(manifestPath)) {
  throw new Error('Vite production asset manifest is missing. Check build.manifest in vite.config.js.');
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const assetFiles = [...new Set(Object.values(manifest).flatMap(entry => [
  entry.file,
  ...(entry.css || [])
]).filter(file => typeof file === 'string' && /\\.(?:js|css)$/.test(file)))];

if (!assetFiles.some(file => /\\.js$/.test(file))) {
  throw new Error('Production asset manifest does not contain a JavaScript bundle.');
}
if (!assetFiles.some(file => /\\.css$/.test(file))) {
  throw new Error('Production asset manifest does not contain a CSS bundle.');
}

for (const file of assetFiles) {
  const assetPath = path.resolve(dist, file);
  if (!assetPath.startsWith(dist + path.sep) || !fs.existsSync(assetPath)) {
    throw new Error('Production offline asset is missing: ' + file);
  }
}

for (const file of ['index.html', 'sw.js', 'offline.html', 'manifest.webmanifest', 'privacy.html', 'release-info.json']) {
  if (!fs.existsSync(path.join(dist, file))) {
    throw new Error('Required PWA production file is missing: ' + file);
  }
}

const serviceWorker = fs.readFileSync(path.join(dist, 'sw.js'), 'utf8');
if (!serviceWorker.includes('/asset-manifest.json') || !serviceWorker.includes('cache.addAll(assets)') || !serviceWorker.includes("url.pathname.startsWith('/api/')")) {
  throw new Error('Service worker does not pre-cache the Vite asset graph or exclude API responses.');
}

console.log('PWA production build verified: ' + assetFiles.length + ' JavaScript/CSS assets and required offline files exist.');
