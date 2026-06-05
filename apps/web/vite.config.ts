import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { apiPlugin } from './vite-plugin-api';

export default defineConfig({
  plugins: [react(), apiPlugin()],
  resolve: {
    alias: [
      {
        find: /^@\//,
        replacement: path.resolve(__dirname, '../../packages/ui/src') + '/',
      },
    ],
  },
  server: {
    port: 5173,
  },
});
