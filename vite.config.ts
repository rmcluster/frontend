import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

const backendTarget = process.env.BACKEND_URL || 'http://127.0.0.1:4917';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        timeout: 0,
        xfwd: true,
      },
      '/v1': {
        target: backendTarget,
        changeOrigin: true,
        timeout: 0,
      },
      '/dav': {
        target: backendTarget,
        changeOrigin: true,
        timeout: 0,
      },
    },
  },
});
