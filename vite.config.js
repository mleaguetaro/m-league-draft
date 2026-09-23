import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset URLs work on both the repository root and a GitHub Pages subpath.
  base: './',
  resolve: { preserveSymlinks: true },
});
