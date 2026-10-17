# 03 · 代码体检（CSS 三层重构后）

> **记录日期**：2026-10-17 17:05
> **对应小步**：小步 2 之后的结构整理（CSS 拆成 base / common / style 三层）
> **体检范围**：`index.html`、`CSS/base.css`、`CSS/common.css`、`CSS/style.css`、`JS/main.js`
> **验证方式**：实跑 `vite dev`（端口 5201–5204）+ 实跑 `vite build`

---

## 〇、先更正一个错判

上一轮（14:56）我说 `href="../CSS/style.css"` 会让样式 404、`src="../JS/main.js"` 会让 JS 404。

**这个判断是错的。** 实测结果：

| 场景 | `../CSS/style.css` | `../JS/main.js` |
|---|---|---|
| `vite dev`（浏览器访问 `http://localhost:5173/`） | ✅ 200，4176 字节（已注入 HMR） | ✅ 200，17004 字节 |
| `vite build` | ⚠️ 警告，原样保留 | ❌ **构建直接失败** |

**原因**：浏览器解析相对路径时，参照的是 **URL**，不是文件系统。
页面地址是 `http://localhost:5173/`，路径部分是 `/`，对它再往上走 `..` 还是 `/`（根之上没有更上层）——
所以 `../CSS/style.css` 被"吃掉"变成了 `/CSS/style.css`，正好命中。

但这只是**侥幸**：一旦页面被放到子路径（`/pet/`）、或部署时带 `base`，`..` 就会真的往上走一级，届时全断。

---

## 一、这次改了什么

### 1. CSS 拆成三层

| 文件 | 职责 | 判定标准 |
|---|---|---|
| `base.css` | 设计变量 / 全局清零 / 全站工具类 | 换任何项目都能用 |
| `common.css` | 组件（按钮、输入框、消息气泡） | 搬到另一个页面还成立吗？成立留这 |
| `style.css` | 页面布局（哪里摆什么、多大、多宽） | 只对这一个页面成立 |

加载顺序在 `index.html` 里锁死：`base → common → style`，靠"后加载覆盖先加载"实现层次。
文件头注释已经把这套约定写清楚了，这个自解释做得很好。

### 2. 其他改动

| 项 | 改动 | 评价 |
|---|---|---|
| `body` | 不再负责 flex 居中，只留 `min-height` / 背景 / 字色 / 字体 | ✅ 更对。居中交给各自的页面块，body 不该管某个页面的排版 |
| `.home` | 自己 `min-height:100vh` + flex 居中 | ✅ |
| `.pet` | 同样 `min-height:100vh` + `padding:24px` | ⚠️ 引发一个定位回归，见三-1 |
| `.pet__bubble` | `display:flex`，子级 `.pet__log` 用 `flex:1` 替掉 `height:100%` | ✅ 更耐改：以后调 padding 不会把高度算错 |
| `.pet__btn` | `width:88px` → `min-width:88px; padding:0 14px` | ✅ 文案变长（"⚙ 设置" → "⚙ 高级设置"）也不会挤爆 |
| `.pet__input` 宽度 | 从组件层挪到 `.pet__row .pet__input` | ✅ 分层正确：宽度是布局，不是零件长相 |
| `*` 清零 | 加了 `::before` / `::after` | ✅ 补得对。伪元素不写在选择器里就吃不到 `border-box` |
| 圆角 / 阴影 | 抽成 `--radius-*` / `--shadow-*` 档位 | ✅ 比散着写 12px/16px/20px 好维护 |

---

## 二、做得对、值得保留的地方

1. **`.hidden` 的 `!important` 是必需品，不是坏味道。**
   `.pet`（style.css:53）和 `.pet__settings`（style.css:126）都显式写了 `display: flex`，
   而它们定义在 `base.css` 之后。同一个元素同时命中 `.hidden` 和 `.pet` 时，两者特异性相同（各一个类），
   **后加载的 `.pet` 会赢** → 不加 `!important` 面板永远关不掉。base.css 的注释里也写明了这一点。

2. **`.pet__log` 的 `min-height: 0`** 是 flex 里的经典防御：flex 子项的 `min-height` 默认是 `auto`
   （不允许小于内容高），写成 0 才能让它在需要时缩下去、正常触发滚动条。

3. **组件层不写死布局宽度**，把 `width: 220px` 交给 `.pet__row .pet__input` —— 这是分层意识的体现。

4. **common.css 里承认"前缀暂时还是 `.pet__`"**，并写明等第二个页面出现再统一改通用名。这个"知道是债、但先不还"的判断是对的，符合 V1 只练核心的目标。

---

## 三、必须修的

### P0-1 · `vite build` 直接失败（已实测）

```
$ node node_modules/vite/bin/vite.js build
vite v5.4.21 building for production...
../CSS/style.css doesn't exist at build time, it will remain unchanged to be resolved at runtime
✓ 2 modules transformed.
x Build failed in 43ms
error during build:
Could not resolve "../JS/main.js" from "index.html"
```

**为什么 dev 能过、build 不能过**：
- dev 是浏览器在解析 URL，`..` 在根上被吞掉，看起来"对了"；
- build 是 **Rollup 在文件系统上解析**，`../JS/main.js` = `My First DesktopPet/JS/main.js` —— 那个目录不存在，直接报错。

**怎么改**：三处 `../` 全去掉，改成从项目根算。Vite 下最稳的是 `./` 开头：

```html
<link rel="stylesheet" href="./CSS/base.css" />
<link rel="stylesheet" href="./CSS/common.css" />
<link rel="stylesheet" href="./CSS/style.css" />
<img class="pet__image" src="./image/shark.png" alt="小鲨鱼" />
<script type="module" src="./JS/main.js"></script>
```

### P0-2 · `package.json` 还在 `JSON/` 目录

`npm run dev` 是在**当前目录**找 `package.json` 的。它在 `JSON/` 里，所以根目录跑 `npm run dev` 必然报错
（你现在大概是手动 `node node_modules/vite/bin/vite.js` 在跑）。
`package-lock.json` 要跟着一起搬回根目录，否则以后 `npm install` 会在 `JSON/` 里另建一份 `node_modules`。

### P1-1 · 设置面板跑到屏幕右上角了（本次重构引入的回归）

```css
.pet { min-height: 100vh; ... }        /* ← 重构后：.pet 撑满整个视口 */
.pet__settings {
  position: absolute;
  right: 24px;
  bottom: 92px;                         /* ← 相对 .pet 定位 = 相对视口右下角 */
}
```

重构前 `.pet` 只是个内容宽的盒子（body 负责居中），`right:0` 是贴着盒子右边，面板就在小鲨鱼旁边。
现在 `.pet` 变成 100vh 满屏，`right:24px` 就变成了**贴着浏览器窗口右边缘**。
1440 宽的屏上，小鲨鱼在中间，设置面板飘到最右边 —— 视觉上彻底脱节。

**修法二选一**：
- 简单版：把 `.pet__settings` 挪进 `.pet__stage` 内部，让 `relative` 参照物变成小鲨鱼那一栏；
- 稳妥版：给 `.pet` 内部再包一个 `position:relative` 的内容容器，面板挂在它身上。

### P1-2 · 退出再进，对话框消失（JS 真 bug）

复现步骤：
1. 点「生成桌宠」→ 小鲨鱼 + 对话框都在
2. 什么都不做，等 10 秒 → 气泡自动隐藏（`bubble` 被加上 `.hidden`）
3. 点 ✕ 退出 → 回首页
4. 再点「生成桌宠」→ **小鲨鱼在，对话框没了**

原因：`exitBtn` 的处理器里复位了 `pet`、`settingsPanel`、`inputBox.value`，**唯独没有复位 `bubble`**。
`createPetBtn` 里也只在 `chatLog` 为空时才调 `addMessage`（而 `addMessage` 才是那个 `remove('hidden')` 的地方）——
所以有历史消息时，气泡会一直保持隐藏，直到你再发一条消息。

**修法**：`createPetBtn` 的处理器里补一行

```js
bubble.classList.remove('hidden')
```

### P1-3 · 首图 2.43 MB

`image/shark.png` = **2,432,328 字节**。这就是准则里记的技术债 #8（WPF 前作首帧 2.4MB 未压缩）。
本地 dev 看不出问题（走的是本机磁盘），一旦部署到公网，首屏就要干等好几秒。

**修法**：转 WebP（同尺寸通常能压到 100–200KB），或先用 squoosh / `sharp` 压一版 PNG。

---

## 四、可以先放着的

| # | 项 | 说明 |
|---|---|---|
| 1 | 设置面板点外面不关 | 目前只能再点一次 ⚙ 关掉。V1 可接受，加 `document` 级 click 监听时注意用 `stopPropagation` |
| 2 | `.pet__btn` 的 `border: 1px solid #ccc` | base.css 已经有 `--border: #d8dbe6`，这里硬编码 `#ccc`，色值体系不统一 |
| 3 | `addMessage` 里的 `'pet__msg--' + from` | 字符串拼接，`from` 传错会静默产生无效类名，消息变成无样式。用 `classList.add()` 更稳 |
| 4 | `chatLog.innerHTML = ''` | 可换 `chatLog.replaceChildren()`，不触发 HTML 解析，更快也更安全 |
| 5 | `word-break: break-word` | 非标准值（浏览器都支持）。标准写法是 `overflow-wrap: anywhere` |

### 一个还没爆的坑：`isComposing` 挡不住所有情况

```js
if (event.isComposing) return
if (event.key === 'Enter') send()
```

`isComposing` 只覆盖"正在组合中"。但在 Chrome / Safari 上，**用回车确认候选词的那一下**，
`isComposing` 可能已经是 `false` 了 —— 结果就是选词的同时把半截拼音发出去了。

更稳的写法是再补一层老判断：

```js
if (event.isComposing || event.keyCode === 229) return
```

`keyCode` 虽然已废弃，但各浏览器对 IME 仍会设成 229，是业界通行的兜底。
这正好是准则 §四「WPF 技术债 #3」在 Web 端的续集 —— 目前算**防了一半**。

---

## 五、自己怎么验证

```bash
# 1. 确认 dev 能跑（这条现在是通的）
node node_modules/vite/bin/vite.js

# 2. 确认 build 会炸（这条是 P0）
node node_modules/vite/bin/vite.js build
#    → 期望看到：Could not resolve "../JS/main.js" from "index.html"

# 3. 改完三处 ../ 后再跑一遍 build，
#    → 期望看到：✓ built in xxx ms，并且 dist/ 里有 3 个 css + 1 个 js + 1 张图
```

浏览器侧验证 P1-2（气泡不复位）：
进桌宠 → 等 10 秒 → 点 ✕ → 再点生成 → 看对话框在不在。

---

## 六、总结

- **拆分思路是对的**，三层职责、加载顺序、`!important` 的必要性都写进了注释，属于"以后自己回来能看懂"的写法。
- **最大的坑不在 CSS，在路径**：`../` 在 dev 下靠 URL 规则侥幸通过，`vite build` 一定炸。这件事越早修越好，越晚改越容易漏。
- **重构会带来回归**：设置面板跑偏就是典型 —— 改了 `.pet` 的尺寸语义，却没跟着检查依赖它定位的子元素。以后每次动容器，都要问一句"谁 absolute 挂在它身上"。
- **JS 那部分基本没动**，上一轮指出的气泡复位 bug 还在，正好并到这一轮一起修。

---

## 六、修复记录（17:12 核实）

| 编号 | 问题 | 状态 | 做法 |
|---|---|---|---|
| P0-1 | `../` 导致 `vite build` 失败 | ✅ **已修** | `index.html` 五处 `../` 全改 `./`：3 个 `<link>`、`<img>`、`<script>`。实测 `vite build` → `✓ built in 213ms`，产出 `dist/index.html` + `assets/{index.css, index.js, shark.png}` |
| P1-1 | 设置面板跑到视口右下角 | ✅ **已修** | 比"简单版"更紧：面板从 `.pet` 挪进 `.pet__controls`，`.pet__controls` 加 `position:relative`，面板改 `right:0; bottom:100%; margin-bottom:10px` → 永远贴着「⚙ 设置」正上方，换成任何屏宽都不脱节 |
| P0-2 | `package.json` 在 `JSON/` | ⏳ 未动 | 仍待你拍板。当前跑法 `node node_modules/vite/bin/vite.js` |
| P1-2 | 退出再进对话框消失 | ⏳ 未动 | 一行 `bubble.classList.remove('hidden')`，属 JS 范围，建议单独一小步 |
| P1-3 | 首图 2.43MB | ⏳ 未动 | 建议转 WebP |

一次性提交：`e623b61 refactor: CSS 拆为 base / common / style 三层`

> 另：`.gitignore` 追加了 `*.log`，避免本地探测日志进仓库。
