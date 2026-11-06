import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const isVercelBuild = process.env.VERCEL === '1';

export default defineConfig({
  plugins: [react()],
  // Vercel serves public/ assets from its CDN. Render continues to use dist/.
  publicDir: isVercelBuild ? false : 'public',
  build: {
    outDir: isVercelBuild ? 'public' : 'dist',
    // Preserve the repository's existing public assets during the Vercel build.
    emptyOutDir: !isVercelBuild
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
});
