import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'module';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';
import path from 'path';

const require = createRequire(import.meta.url);

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000
  },
  plugins: [
    react(),
    viteCommonjs({
      include: ['leaflet.heat'],
      exclude: [],
    }),
  ],
  resolve: {
    alias: {
      // Ensure React Router and other dependencies are properly resolved
      'react-router-dom': path.resolve('./node_modules/react-router-dom'),
    },
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: false,
      },
    },
  },
  optimizeDeps: {
    include: [
      'leaflet',
      'leaflet.heat',
      'leaflet.heat/dist/leaflet-heat.js'
    ],
    esbuildOptions: {
      // Ensure we can process the CommonJS module
      target: 'es2020',
    },
  },
  build: {
    outDir: 'build',
    sourcemap: true,
  },
})
