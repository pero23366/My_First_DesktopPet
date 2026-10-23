// ============================================================
// Vue/main.ts —— Vue 版入口
// 对应原版 TS/main.ts 的「装配层」职责，但少了 init 顺序那一段：
// Vue 里没有"先 init 谁再 init 谁"的顺序问题，组件的 setup 按依赖自动跑。
// ============================================================

import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
