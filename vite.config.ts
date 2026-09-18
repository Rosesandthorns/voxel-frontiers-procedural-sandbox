import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // Electron renderer needs relative asset paths in production build
    base: process.env.ELECTRON_BUILD === 'true' ? './' : '/',
    build: {
      outDir: 'dist',
      // Increase chunk size budget to avoid warnings with large Three.js bundles
      chunkSizeWarningLimit: 4096,
      rollupOptions: {
        output: {
          // Split vendor chunks for faster loads
          manualChunks(id) {
            if (id.includes('three')) {
              return 'three';
            }
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react';
            }
          },
        },
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true as true,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      allowedHosts: true as true,
    },
    // Allow larger worker / WASM allocations
    optimizeDeps: {
      exclude: ['electron'],
    },
    define: {
      // Expose whether we're running inside Electron to the renderer
      __IS_ELECTRON__: JSON.stringify(typeof process !== 'undefined' && process.versions?.electron != null),
    },
  };
});
