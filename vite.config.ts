import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 项目站点部署在 /card-ripper/ 子路径下
  base: '/card-ripper/',
  plugins: [react()],
})
