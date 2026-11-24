import { defineConfig } from 'vitest/config'

// Kept apart from vite.config.ts: Vitest ships its own copy of Vite, and mixing the two in one
// file makes `npm run build` (tsc) fail with a plugin type mismatch.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
