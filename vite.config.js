import { defineConfig } from 'vite'

// Nếu deploy lên GitHub Pages với custom domain, đổi base thành '/'
// Nếu deploy với repo name, sử dụng '/bypass_test/'
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/bypass_test/' : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
