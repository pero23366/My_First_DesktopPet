# Vue 版改造台账

> 目的：把本项目的前端**逐步**从「原生 TS + 手改 DOM」改成 Vue。
> 原版（`index.html` + `TS/`）**一行不动**，随时可回退、可对照。

## 怎么跑

```bash
npm run dev
# 原版：  http://localhost:5173/index.html
# Vue 版：http://localhost:5173/pet-vue.html
```

两个入口共用同一套 CSS（`CSS/base.css` `CSS/common.css` `CSS/style.css`），**样式一行没改**。

## 改造原则

1. **原版不动** —— `index.html` 与 `TS/*.ts` 保持原样，作为对照基准和回退方案。
2. **一步一个可运行状态** —— 每步结束 `pet-vue.html` 都能跑，不做"半截工程"。
3. **按需求学，不按课程目录学** —— 遇到什么讲什么，讲完立刻用在项目里。
4. **每删一个 `id` = 完成一处迁移** —— `App.vue` 里的 `id` 是待迁移标记，删完即全部迁完。

## 进度

| 步 | 内容 | 用到的 Vue 知识 | 状态 |
|:--:|---|---|:--:|
| 1 | 首屏 ↔ 舞台切换 | `createApp` / `ref` / `v-show` / `@click` | ✅ |
| 2 | 消息列表渲染 | `v-for` / `:key` / 数组响应式 | ⬜ |
| 3 | 输入框与发送 | `v-model` / `:disabled` / 事件修饰符 | ⬜ |
| 4 | 气泡显隐 + 自动收起 | `watch` / `onUnmounted` / `nextTick` | ⬜ |
| 5 | 设置面板开合 | `v-if` vs `v-show` | ⬜ |
| 6 | 设置表单（人设 / API / 滑条） | `v-model` 修饰符 / `computed` | ⬜ |
| 7 | 形象上传与恢复 | 事件参数 / `FileReader` | ⬜ |
| 8 | 拆成组件（Chat / Settings / Stage） | 组件注册 / `props` / `emit` / 插槽 | ⬜ |
| 9 | 跨组件共享（人设、配置） | `provide/inject` | ⬜ |
| 10 | 全局状态收口 | Pinia（或 composable） | ⬜ |
| 11 | 清空 / 导出 / 持久化 | 生命周期 / `watchEffect` | ⬜ |

## 第 1 步做了什么

**改前**（`TS/ui.ts`）：两个函数，各自手改两个元素的 class。

```ts
export function showPet(): void {
  dom.home.classList.add('hidden')
  dom.pet.classList.remove('hidden')
  showBubble()
}
export function showHome(): void {
  dom.pet.classList.add('hidden')
  closeSettings(); closeBubble()
  dom.home.classList.remove('hidden')
  clearInput()
}
```

**改后**（`Vue/App.vue`）：一个变量 + 两处绑定。

```ts
const screen = ref<'home' | 'pet'>('home')
```

```html
<main    v-show="screen === 'home'" class="home">  ... </main>
<section v-show="screen === 'pet'"  class="pet">   ... </section>
```

## 踩过的坑

| 坑 | 现象 | 原因 / 解法 |
|---|---|---|
| 图片 404 | 桌宠形象显示成 alt 文字 | `.vue` 里 `src="./image/x.png"` 被 Vite 解析成**相对组件文件**的路径 → 改成 `../image/idle-1.png` |
| `.hidden` 与 `v-show` 冲突 | 元素该显示时不显示 | `.hidden` 带 `!important`，会压过 `v-show` 的内联 `display:none` → Vue 版**不写** `.hidden` 类 |
