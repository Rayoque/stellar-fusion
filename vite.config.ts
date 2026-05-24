import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Ensures relative asset paths, making deployment to GitHub Pages (or any subfolder) out-of-the-box compatible
  server: {
    port: 5173,
    open: true, // Automatically open browser on startup
  },
});
