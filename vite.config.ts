import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4917',
        changeOrigin: true,
        timeout: 0,
      },
      '/v1': {
        target: 'http://127.0.0.1:4917',
        changeOrigin: true,
        timeout: 0,
      },
    },
  },
});
