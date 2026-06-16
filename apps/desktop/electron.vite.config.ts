import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({
      // Only bundle our own workspace code. Externalize all npm packages,
      // especially @earendil-works/pi-coding-agent which contains native
      // .node addons and WASM files that cannot be bundled by Vite.
      exclude: ['@pi/sdk-wrapper'],
    })],
    resolve: {
      alias: {
        '@main': resolve(__dirname, 'src/main'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts'),
        },
        output: {
          // Output ESM so dynamic imports work with externalized ESM-only packages
          // like @earendil-works/pi-coding-agent (which has "type": "module").
          format: 'es',
          entryFileNames: '[name].mjs',
          chunkFileNames: 'chunks/[name]-[hash].mjs',
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
        },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
        },
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, '../../packages/ui/src'),
      },
    },
    plugins: [react()],
  },
});
