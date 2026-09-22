import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    cssMinify: true,
    reportCompressedSize: true,
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
