import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 加 vue 插件只影响 .vue 文件，原有的 TS 版（index.html + TS/*.ts）一行不动。
export default defineConfig({
  plugins: [vue()],

  resolve: {
    // 别名解决的是"相对路径会随着文件挪窝而失效"这一件事：
    //   @/...    → Vue/src/...   （组件、composable、类型）
    //   @img/... → image/...     （桌宠素材，两个版本共用一份，不复制）
    // 没有别名的话，features/pet/PetStage.vue 引用根目录图片要写
    // '../../../../image/idle-1.png' —— 数几个 .. 是纯粹的心算负担。
    // 注意：别名只在 Vite 里生效，tsc 那一侧靠 tsconfig.json 的 paths 对齐。
    alias: {
      '@': fileURLToPath(new URL('./Vue/src', import.meta.url)),
      '@img': fileURLToPath(new URL('./image', import.meta.url)),
    },
  },
})
