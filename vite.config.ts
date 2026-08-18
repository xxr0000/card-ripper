import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sites } from '@openai/sites-vite-plugin'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 默认使用子路径；私有 Vercel 部署可设置 VITE_BASE_PATH=/。
  base: process.env.VITE_BASE_PATH || '/card-ripper/',
  plugins: [react(), sites()],
  // 四系列静态卡目压缩后约 134KB；以 gzip 门禁为准，避免对高压缩 JSON 误报。
  build: { chunkSizeWarningLimit: 800 },
})
