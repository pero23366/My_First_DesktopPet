// ============================================================
// src/env.d.ts —— 给 TypeScript 补上"它自己看不懂"的模块形状
//
// tsc 只认识 .ts。遇到 import App from './App.vue' 或 import img from 'x.png'
// 它会说"找不到模块"。这两句 declare 就是告诉它：这类文件导入后长什么样。
//
// 这不是"骗编译器"：真正的解析由 Vite 插件在构建时完成，
// tsc 只负责类型检查，它只需要知道"默认导出的东西可以用"。
// ============================================================

/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}
