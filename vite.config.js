import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  // Vite's native JSX transform does not require inline React Refresh scripts.
  // This permits a stricter Content Security Policy for desktop builds.
  esbuild: { jsx: 'transform', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment' },
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 2500 }
});
