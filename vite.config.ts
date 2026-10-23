import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 加 vue 插件只影响 .vue 文件，原有的 TS 版（index.html + TS/*.ts）一行不动。
export default defineConfig({
  plugins: [vue()],
})
