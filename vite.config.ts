import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The web editor lives in apps/web; build it from the repo root.
// `base` is '/' everywhere (local dev, e2e, CI verify) EXCEPT the GitHub Pages build, which sets
// PAGES_BASE='/psyuml/' so the project-site asset URLs resolve under …github.io/psyuml/.
export default defineConfig({
  root: 'apps/web',
  base: process.env.PAGES_BASE ?? '/',
  plugins: [react()],
  build: {
    outDir: '../../dist/web',
    emptyOutDir: true,
  },
});
