import fs from 'node:fs';
import path from 'node:path';

const manifestPath = path.resolve('public/manifest.webmanifest');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const required = ['name', 'short_name', 'start_url', 'display', 'icons'];
if (!Array.isArray(manifest.file_handlers) || !manifest.file_handlers.some(handler => handler.accept?.['text/csv']?.includes('.csv') && handler.accept?.['application/json']?.includes('.json'))) {
  throw new Error('PWA manifest must register CSV and JSON file handlers for Windows file-open integration');
}
const appEntry = fs.readFileSync(path.resolve('src/main.jsx'), 'utf8');
if (!appEntry.includes('launchQueue.setConsumer')) {
  throw new Error('PWA app entry must consume Windows file-open launches');
}
for (const key of required) {
  if (!manifest[key]) throw new Error('PWA manifest is missing required member: ' + key);
}
for (const size of ['192x192', '512x512']) {
  const icon = manifest.icons.find(item => (item.sizes || '').split(' ').includes(size));
  if (!icon) throw new Error('PWA manifest is missing a ' + size + ' icon');
  const relativeIconPath = icon.src.startsWith('/') ? icon.src.slice(1) : icon.src;
  const iconPath = path.resolve('public', relativeIconPath);
  if (!fs.existsSync(iconPath)) throw new Error('PWA icon file does not exist: ' + icon.src);
}
const releaseInfo = JSON.parse(fs.readFileSync(path.resolve('public/release-info.json'), 'utf8'));
if (!releaseInfo.websiteVersion || !releaseInfo.apiVersion || !releaseInfo.windowsPackageVersion || !Array.isArray(releaseInfo.notes)) {
  throw new Error('Release metadata must define website/API/Windows package versions and release notes');
}
for (const file of ['public/sw.js', 'public/offline.html', 'public/privacy.html', 'public/release-info.json']) {
  if (!fs.existsSync(path.resolve(file))) throw new Error('PWA release file is missing: ' + file);
}
const serviceWorker = fs.readFileSync(path.resolve('public/sw.js'), 'utf8');
for (const requiredBehavior of ["const CACHE_NAME = 'insightboard-shell-v6'", "cache.addAll(PRECACHE_URLS)", "cache.put(APP_SHELL_URL", "asset-manifest.json", "cache.addAll(assets)", "url.pathname.startsWith('/api/')"]) {
  if (!serviceWorker.includes(requiredBehavior)) {
    throw new Error('Service worker is missing offline safety behavior: ' + requiredBehavior);
  }
}
const offlinePage = fs.readFileSync(path.resolve('public/offline.html'), 'utf8');
if (!offlinePage.includes('import a CSV/JSON file') || !offlinePage.includes('Cloud accounts')) {
  throw new Error('Offline page must explain local workflows and online-only services');
}
console.log('PWA manifest, icons, cached app shell, offline workflow guidance and privacy notice are present.');
