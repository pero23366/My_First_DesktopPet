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

## 目录规范（按功能切，不按文件类型切）

```
Vue/
├─ src/
│  ├─ main.ts                    唯一入口：createApp(App).mount('#app')
│  ├─ App.vue                    只做「现在哪一屏」+ 事件转发，薄到 30 行
│  ├─ env.d.ts                   告诉 tsc：*.vue / *.png 导入后长什么样
│  ├─ features/                  一个功能一个文件夹，改需求只动一个目录
│  │  ├─ home/HomeScreen.vue     首屏
│  │  ├─ pet/PetStage.vue        舞台：形象 + 底部控件
│  │  ├─ chat/
│  │  │  ├─ ChatBubble.vue       对话框（纯展示）
│  │  │  └─ useChat.ts           对话状态与动作（composable）
│  │  └─ settings/SettingsPanel.vue  设置面板四段
│  └─ shared/                    跨功能共用；这一层不 import 任何人
│     └─ types.ts                Message / BubbleFrom
└─ README.md
```

**依赖方向是单向的**：`main → App → features → shared`。
`features` 之间**不互相 import** —— chat 不知道 settings 存在；需要通信就由 `App.vue` 传 props / 收 emit。

为什么按功能分，而不是 `components/` `composables/` `utils/` 按类型分：

| | 按类型分（老办法） | 按功能分（这里） |
|---|---|---|
| 加一个功能 | 在 4 个目录各扔一个文件 | 新建一个文件夹，全部放里面 |
| 删一个功能 | 到处翻，容易留死代码 | `rm -rf features/xxx` |
| 新人接手 | 得靠文件名猜它属于谁 | 目录名就是功能名 |

别名（`vite.config.ts` + `tsconfig.json` 两处必须同时改）：

| 别名 | 指向 | 为什么 |
|---|---|---|
| `@/` | `Vue/src/` | 组件挪目录不会断 import |
| `@img/` | `image/` | 两个版本共用同一份素材，不复制副本 |

## 改造原则

1. **原版不动** —— `index.html` 与 `TS/*.ts` 保持原样，作为对照基准和回退方案。
2. **一步一个可运行状态** —— 每步结束 `pet-vue.html` 都能跑，不做"半截工程"。
3. **按需求学，不按课程目录学** —— 遇到什么讲什么，讲完立刻用在项目里。
4. ~~每删一个 `id` = 完成一处迁移~~ —— `id` 锚点制度已退休：改成组件后不再有 `getElementById`，
   边界由**文件夹 + props/emit** 界定。

## 进度

| 步 | 内容 | 用到的 Vue 知识 | 状态 |
|:--:|---|---|:--:|
| 1 | 首屏 ↔ 舞台切换 | `createApp` / `ref` / `v-show` / `@click` | ✅ |
| 2 | 消息列表渲染 | `v-for` / `:key` / 数组响应式 | ✅ |
| 3 | 输入框与发送 | `v-model` / `:disabled` / 事件修饰符 | ⬜ |
| 4 | 气泡显隐 + 自动收起 | `watch` / `onUnmounted` / `nextTick` | ⬜ |
| 5 | 设置面板开合 | `v-if` vs `v-show` | ⬜ |
| 6 | 设置表单（人设 / API / 滑条） | `v-model` 修饰符 / `computed` | ⬜ |
| 7 | 形象上传与恢复 | 事件参数 / `FileReader` | ⬜ |
| 8 | 拆成组件 + 按功能分目录 | 组件边界 / `props` / `emit` / 别名 | ✅ |
| 9 | 跨组件共享（人设、配置） | `provide/inject` | ⬜ |
| 10 | 全局状态收口 | Pinia（或 composable） | ⬜ |
| 11 | 清空 / 导出 / 持久化 | 生命周期 / `watchEffect` | ⬜ |

> 第 8 步提前做了：先把"规矩"立起来，后面每迁一块都直接放进对应的 features 目录，
> 省得先堆成 500 行的 App.vue 再拆一次。

## 第 8 步做了什么（本次）

**改前**：`Vue/App.vue` 一个文件装下首屏 + 舞台 + 对话框 + 90 行设置面板 + 全部状态。

**改后**：6 个文件，每个都有明确的一件事。行为**零变化**（还是只有「生成桌宠 / 退出」能点）。

| 文件 | 只负责 |
|---|---|
| `App.vue` | `screen` 一个变量 + 两个事件处理 |
| `features/home/HomeScreen.vue` | 首屏，`emit('enter')` |
| `features/pet/PetStage.vue` | 形象 + 控件，`emit('exit')` |
| `features/chat/ChatBubble.vue` | 把 `messages` 画出来（只读 props） |
| `features/chat/useChat.ts` | `messages` / `add()` / `clear()` |
| `features/settings/SettingsPanel.vue` | 四段表单（本步还没接线） |

**一个必须记住的坑**：`useChat()` 只能在 `App.vue` 调**一次**。
如果 ChatBubble 和 PetStage 各调一次，会得到两份互不相干的消息数组 ——
状态被复制了，改一个另一个不知道。composable 不是"随用随取的工具函数"，
它是**状态的持有者**，持有者只能有一个。

## 踩过的坑

| 坑 | 现象 | 原因 / 解法 |
|---|---|---|
| 图片 404 | 桌宠形象显示成 alt 文字 | `.vue` 里 `src="./image/x.png"` 被 Vite 解析成**相对组件文件**的路径 → 现在统一 `import petImage from '@img/idle-1.png'`，由编译期解析 |
| `.hidden` 与 `v-show` 冲突 | 元素该显示时不显示 | `.hidden` 带 `!important`，会压过 `v-show` 的内联 `display:none` → Vue 版**不写** `.hidden` 类（设置面板临时例外，第 5 步改掉） |
| 别名生效了但 tsc 报错 | 编辑器红线、`npm run build` 挂 | `vite.config.ts` 的 `resolve.alias` 和 `tsconfig.json` 的 `paths` 是两套，**必须同时改** |
| tsc 不认 `.vue` | `Cannot find module './App.vue'` | tsc 只认 `.ts`，用 `src/env.d.ts` 里的 `declare module '*.vue'` 补形状；真正的解析交给 Vite |
