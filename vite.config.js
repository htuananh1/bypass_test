import { defineConfig } from 'vite'

// Base path cho GitHub Pages
const base = process.env.NODE_ENV === 'production' ? '/bypass_test/' : '/'

export default defineConfig({
  base: base,
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
  server: {
    port: 5173,
  },
})
