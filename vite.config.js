import { defineConfig } from 'vite'

// Nếu deploy lên GitHub Pages với custom domain, đổi base thành '/'
// Nếu deploy với repo name, giữ nguyên '/gemini-github-pages/'
// Hoặc thay 'gemini-github-pages' bằng tên repo của bạn
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/gemini-github-pages/' : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
