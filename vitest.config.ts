import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      // The `server-only` package throws on any non-RSC import. We
      // intentionally test server-only modules (lib/eval-extraction.ts,
      // lib/eval-extraction-providers.ts) under jsdom, so neutralize it.
      'server-only': path.resolve(__dirname, 'tests/__mocks__/server-only.ts'),
    },
  },
})
