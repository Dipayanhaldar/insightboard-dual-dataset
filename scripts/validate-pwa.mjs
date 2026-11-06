import fs from 'node:fs';
import path from 'node:path';

const manifestPath = path.resolve('public/manifest.webmanifest');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const required = ['name', 'short_name', 'start_url', 'display', 'icons'];
for (const key of required) {
  if (!manifest[key]) throw new Error(`PWA manifest is missing required member: ${key}`);
}
for (const size of ['192x192', '512x512']) {
  const icon = manifest.icons.find(item => item.sizes?.split(/\s+/).includes(size));
  if (!icon) throw new Error(`PWA manifest is missing a ${size} icon`);
  const iconPath = path.resolve('public', icon.src.replace(/^\//, ''));
  if (!fs.existsSync(iconPath)) throw new Error(`PWA icon file does not exist: ${icon.src}`);
}
const releaseInfo = JSON.parse(fs.readFileSync(path.resolve('public/release-info.json'), 'utf8'));
if (!releaseInfo.websiteVersion || !releaseInfo.apiVersion || !releaseInfo.windowsPackageVersion || !Array.isArray(releaseInfo.notes)) {
  throw new Error('Release metadata must define website/API/Windows package versions and release notes');
}
for (const file of ['public/sw.js', 'public/offline.html', 'public/privacy.html', 'public/release-info.json']) {
  if (!fs.existsSync(path.resolve(file))) throw new Error(`PWA release file is missing: ${file}`);
}
console.log('PWA manifest, required icon sizes, service worker, offline page and privacy notice are present.');
