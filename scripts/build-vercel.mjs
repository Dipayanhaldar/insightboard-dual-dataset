// Build the same Vite frontend into public/ for Vercel's static asset CDN.
// Render continues to run the normal "vite build" command into dist/.
process.env.VERCEL = '1';

const { build } = await import('vite');
await build();
