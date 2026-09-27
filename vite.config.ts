import { fileURLToPath, URL } from 'node:url'

import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import VueRouter from 'unplugin-vue-router/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const apiTarget =
    loadEnv(mode, process.cwd(), 'VITE_').VITE_API_BASE_URL || 'http://localhost:8080'

  return {
    plugins: [
      VueRouter(),
      AutoImport({
        imports: ['vue', 'vue-router'],
        dts: 'src/auto-imports.d.ts',
      }),
      Components({
        dts: 'src/components.d.ts',
      }),
      vue(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: true,
      port: 5173,
      // The API sends no CORS headers, so in development the browser talks to it through Vite.
      proxy: {
        '/api': apiTarget,
        '/health': apiTarget,
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
    },
  }
})
