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
  test: {
    globals: true,
    environment: 'jsdom'
  }
})
