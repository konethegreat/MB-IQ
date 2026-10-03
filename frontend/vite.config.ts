// Code written by Kone & Claude | The code does the following: " Vite build/dev configuration for the
// MB IQ React app. It enables the React plugin and proxies /api calls to the Express backend during
// development so the frontend and backend can run side by side. "

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
