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
  optimizeDeps: {
    // Pre-bundle the SDK and the adapter entry so the very first request doesn't
    // hit a half-optimized module graph (which would leave createRealWorkspaceService
    // etc. as undefined exports). Without this, the SessionList query fails with
    // "Failed to load sessions" on first paint.
    include: [
      '@earendil-works/pi-coding-agent',
      '@pi/sdk-wrapper/adapters',
    ],
  },
  ssr: {
    optimizeDeps: {
      include: [
        '@earendil-works/pi-coding-agent',
        '@pi/sdk-wrapper/adapters',
      ],
    },
  },
  server: {
    port: 5173,
  },
});
