import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The web editor lives in apps/web; build it from the repo root.
export default defineConfig({
  root: 'apps/web',
  plugins: [react()],
  build: {
    outDir: '../../dist/web',
    emptyOutDir: true,
  },
});
