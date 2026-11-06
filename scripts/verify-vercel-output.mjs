import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const htmlPath = path.resolve('public/index.html');
const html = await readFile(htmlPath, 'utf8');

if (!html.includes('id="root"')) {
  throw new Error('Vercel build output is missing the InsightBoard React root element.');
}

const assetPaths = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)]
  .map(match => path.resolve('public', match[1].slice(1)));

if (assetPaths.length === 0) {
  throw new Error('Vercel build output does not reference any generated frontend assets.');
}

for (const assetPath of assetPaths) {
  await access(assetPath);
}

console.log(`Verified Vercel SPA document and ${assetPaths.length} generated assets.`);
