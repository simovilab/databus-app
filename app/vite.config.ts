/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    legacy()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Resolve the local in-repo telemetry plugin from source so the app
      // builds without a separate plugin build step (no committed dist/).
      'capacitor-databus-telemetry': path.resolve(
        __dirname,
        './plugins/capacitor-databus-telemetry/src/index.ts',
      ),
    },
  },
  // Dev-only proxy: the browser calls same-origin /api/... and Vite forwards
  // to the Databús orchestrator. This sidesteps CORS (the backend has no
  // django-cors-headers configured for the dev origin). Prod uses an absolute
  // https API URL (native apps have no CORS; prod web is same-origin or CORS'd).
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom'
  }
})
