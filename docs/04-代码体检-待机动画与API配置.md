# 04 · 代码体检（待机动画 + 后端 API 配置）

> **记录日期**：2026-10-17 23:20
> **体检范围**：`index.html`、`CSS/base.css`、`CSS/common.css`、`CSS/style.css`、`JS/main.js`、`image/*.png`
> **验证方式**：实跑 `vite build`（通过）+ 读取 PNG 头拿真实尺寸

---

## 一、这一轮改了什么（对比 03）

| 提交 | 内容 |
|---|---|
| `e623b61` | CSS 拆成 base / common / style 三层 |
| `c1e4406` | 补修复记录（P0-1 / P1-1 已修） |
| `35eece9` | `package.json` 回根目录，引用路径改回 `./` |
| `1612ed1` | 待机动画：三帧往返（1→2→3→2→1，每拍 600ms） |
| `8a6dd43` | 设置面板新增后端 API 配置（地址 / 保存 / 测试连接） |

---

## 二、上一轮的问题，已经修掉的

| 编号 | 问题 | 现在 |
|---|---|---|
| P0-1 | `vite build` 失败 | ✅ 全部改成 `./CSS/…` `./JS/…` `./image/…` |
| P0-2 | `package.json` 在 `JSON/` | ✅ 已回根目录，`package-lock.json` 也回来了 |
| P1-1 | 设置面板贴视口右缘 | ✅ 面板挪进 `.pet__controls`，`.pet__controls` 加 `position:relative`，面板 `right:0; bottom:100%` 压在控件正上方 |
| — | `.vite/` 未忽略 | ✅ `.gitignore` 已加 `.vite/` 和 `*.log` |

**`vite build` 实测通过**：

```
✓ 6 modules transformed.
dist/index.html                      3.08 kB │ gzip: 1.61 kB
dist/assets/idle-2-CHEIKfgv.png    343.07 kB
dist/assets/idle-3-CGtsB90t.png    367.19 kB
dist/assets/idle-1-DPv42G5-.png  2,432.33 kB
dist/assets/index-DYz-tSrm.css       5.23 kB │ gzip: 1.67 kB
dist/assets/index-BJVvjlRM.js        3.08 kB │ gzip: 1.52 kB
✓ built in 674ms
```

---

## 三、动画实现复核：逻辑是对的

先把节奏捋一遍，确认和注释里写的一致。

### 3.1 为什么用三张叠图而不是换 `src`

换 `src` 会触发一次图片加载，即使命中缓存也要走一遍解码 + 布局，慢的时候会闪白。
三张图全部提前解码叠在同一位置、只切 `opacity`，切换是纯合成操作，不掉帧。

### 3.2 `steps(1, end)` 到底做了什么

默认的 `ease` 会在两个关键帧之间**插值**，`opacity` 从 1 到 0 会经过 0.7、0.5、0.3 —— 看起来是一个半透明的残影。
`steps(1, end)` 的意思是：**这一整段只保持"起点值"，到段末才跳到终点值**，等于硬切。

### 3.3 5 拍时序逐帧核对

关键点：**某个关键帧没写，浏览器会用属性本身的计算值补**。
`.pet__frame` 上写了 `opacity: 0`，所以缺失的 `100%` 一律按 0 补。

| 帧 | 关键帧 | 实际可见区间 |
|---|---|---|
| 1 | `0%:1 → 20%:0 → 80%:1 → (100% 补 0)` | **0–20%** 和 **80–100%** |
| 2 | `0:0 → 20:1 → 40:0 → 60:1 → 80:0 → 100:0` | **20–40%** 和 **60–80%** |
| 3 | `0:0 → 40:1 → 60:0 → 100:0` | **40–60%** |

按 `animation-duration: 3s` 换成年份：0–0.6s 是 1 号，0.6–1.2s 是 2 号，1.2–1.8s 是 3 号，1.8–2.4s 回到 2 号，2.4–3.0s 回到 1 号。

✅ **正是 `1 → 2 → 3 → 2 → 1`，5 拍 × 600ms = 3s，跟前作 WPF 的 `DispatcherTimer(600ms)` 往返完全一致。**
相邻帧在边界上取值一致，所以接缝处不会闪。

`prefers-reduced-motion` 那段也对：`animation: none` 之后 `.pet__frame--1 { opacity: 1 }` 在后面，
特异性相同、后写胜出，所以停在第 1 帧而不是全透明。

---

## 四、新发现的问题

### P1-1 · 三帧画布尺寸完全不同（这是最该修的）

实测三张 PNG 的真实尺寸：

| 文件 | 画布尺寸 | 文件大小 |
|---|---|---|
| `idle-1.png` | **2048 × 2048** | 2,375 KB |
| `idle-2.png` | 618 × 609 | 335 KB |
| `idle-3.png` | 666 × 636 | 359 KB |

而 CSS 里写的是：

```css
.pet__frame {
  width: 100%; height: 100%;
  object-fit: contain;   /* 每张图各自等比缩放到这个 260×260 的框里 */
}
.pet__frame--2 { transform: translate(-1.3%, 3.8%) scale(0.905); }
.pet__frame--3 { transform: translate(-2.1%, 2.3%) scale(0.943); }
```

**问题**：`object-fit: contain` 是**每张图各自**去适配那个框。三张图画布尺寸差 3 倍多、长宽比也不一样
（2048×2048 是正方，618×609 偏矮，666×636 又不同），所以"鲨鱼占画面的比例"只要在导出时有一点差别，
切换帧时鲨鱼的**大小就会跳一下**。

而那两行手工 `scale(0.905)` / `scale(0.943)` 恰恰是证据 —— 它们是"数值调出来的补丁"，
说明三张图本来就没对齐。这正是准则 §四「WPF 技术债 #6：`idleScales` 定义但未使用」的 Web 版续集：
**根因是导出时没用统一画布，而不是播放器不够聪明。**

**从源头修**：三张图导到同一个画布（比如 640×640），内容按同一基准居中对齐。改完之后
`--2` / `--3` 上的 `transform` 可以直接删掉，代码变短，也不会再随缩放窗口失效。

### P1-2 · `idle-1.png` 还是 2.4 MB / 2048²

- 下载：2.4 MB，占了首页资源总量的 78%
- 解码：2048 × 2048 = **419 万像素**，展开成 RGBA 约 **16.8 MB** 内存
- 而它最终只显示成 **260 × 260**

也就是说用 8 倍的分辨率换 2.4 MB 流量和 16.8 MB 内存，屏幕上一点看不出来。
另外两张已经压到 335 KB / 359 KB，只有第一张没压 —— 明显是漏了。

**修**：统一裁到 640×640 后转 WebP/压缩 PNG，三帧合计应能压到 150 KB 以内。

### P1-3 · 退出再进，对话框消失（上一轮提过，仍在）

`createPetBtn` 的处理器里复位了 `home` / `pet`，`exitBtn` 里复位了 `pet` / `settingsPanel` / `inputBox.value`，
**两个地方都没有复位 `bubble`**。

复现：进桌宠 → 等 10 秒让气泡自动隐藏 → 点 ✕ → 再点「生成桌宠」→ 小鲨鱼在，对话框没了。
（因为欢迎语只在 `chatLog` 为空时才补，而"把气泡显示回来"这一步写在 `addMessage` 里。）

修法仍然是补一行：

```js
createPetBtn.addEventListener('click', () => {
  home.classList.add('hidden')
  pet.classList.remove('hidden')
  bubble.classList.remove('hidden')   // ← 补这行
  …
})
```

### P2-1 · 地址没写协议，`fetch` 会给出莫名其妙的错

`normalizeBase()` 只做了 trim 和去尾部斜杠。如果用户填的是 `localhost:5080`（漏了 `http://`），
`fetch('localhost:5080/api/health')` 会被 URL 解析器当成一个**未知协议**，直接抛 `TypeError`，
最后显示成「连不上，确认后端已启动且允许跨域」——**和真实原因完全无关**，很难查。

**修**：规整时顺手补协议

```js
function normalizeBase(raw) {
  let base = raw.trim().replace(/\/+$/, '')
  if (base && !/^https?:\/\//i.test(base)) base = 'http://' + base
  return base
}
```

### P2-2 · `res.json()` 失败也被报成「连不上」

```js
const data = await res.json()   // 后端返回的不是 JSON 时，这里抛 SyntaxError
```

`catch` 里只区分了 `AbortError` 和其它，把 `SyntaxError` 也算进了"网络/跨域"。
实际情况可能是"接口通了但返回了一坨 HTML 错误页"。建议在 `catch` 里再分一支：

```js
err instanceof SyntaxError → '连上了，但返回的不是 JSON（后端可能报错了）'
```

### P2-3 · 「测试连接」成功不会保存

现在测试和保存是两个独立按钮，测通了不点保存，刷新就没了。可以在测试成功后顺手落盘，
或者把状态文案改成「已连接（未保存）」。

### P2-4 · 命名不一致：`aria-label="小沃"` vs 全站「小鲨鱼」

`<div class="pet__image" role="img" aria-label="小沃">` —— 小沃是 WPF 前作的名字，
这一版图片、placeholder、注释里都叫小鲨鱼。读屏软件会念出"小沃"。统一一下。

### P2-5 · 之前提过、这轮没动的

- `.pet__btn` 的 `border: 1px solid #ccc` 仍没走 `--border` 变量
- `li.className = 'pet__msg pet__msg--' + from` 仍是字符串拼接
- `chatLog.innerHTML = ''` 仍是 `innerHTML`（可换 `replaceChildren()`）
- `word-break: break-word` 非标准值
- `isComposing` 仍只挡一半，建议补 `|| event.keyCode === 229`

---

## 五、这一段必须停下来讲：`fetch` / `async` / `AbortController`

`apiTestBtn` 的处理函数是整份代码里**技术密度最高**的地方：

```js
apiTestBtn.addEventListener('click', async () => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(base + '/api/health', { signal: controller.signal })
    if (!res.ok) return showApiStatus('HTTP ' + res.status + '…', false)
    const data = await res.json()
    showApiStatus('已连接 · ' + (data.status || 'ok'), true)
  } catch (err) { … } finally { clearTimeout(timer) }
})
```

这里面同时出现了 **7 个**准则里标为红灯或半步缺口的东西：

| 点 | 为什么必须讲透 |
|---|---|
| `fetch()` 返回的是 Promise 不是数据 | 用户自述"当黑箱用过"，这是第一个黑箱入口 |
| `await` 为什么挡住代码却不挡线程 | 单线程 + 事件循环 + 微任务队列 |
| `res.ok` 与 `res.status` | WPF 前作技术债 #4：`dynamic` 解析、不看状态码，这里正好补上 |
| `res.json()` 也是异步 | 为什么要 `await` 两次 |
| `try / catch / finally` 包 `await` | 对标 C# 的同类结构 |
| `AbortController` + `signal` | 对标 C# 的 `CancellationToken`，这是**纯新知识点** |
| `async () => {}` 作为事件回调 | 回调返回 Promise，没人接它的异常 → 失败要自己 catch |

**建议**：这一步的代码可以先"能跑就放着"，但必须单独安排一轮把上面 7 点拆开讲一遍，
否则这个文件会变成第二个黑箱 —— 而它恰好是整个 V1 前后端联通的命脉。

---

## 六、总结与下一步

**这一轮整体是进步最大的：** 三个 P0/P1 全修掉了，`vite build` 从报错变成 674ms 通过；
动画的时序设计（叠帧 + `steps(1,end)` + 5 拍往返）思路正确、和 WPF 前作一一对应。

**剩下三件事按优先级：**

1. **统一三帧画布 + 压缩首帧**（P1-1 / P1-2）—— 视觉跳变和 2.4MB 是同一个根因：导出时没统一基准。修一次两件都好。
2. **补 `bubble.classList.remove('hidden')`**（P1-3）—— 一行代码，修一个明显的 bug。
3. **专门讲一轮 `fetch` / async**（第五节）—— 不修代码，但要补认知。

**下一小步的功能方向**，两条路都合理，需要用户拍板：
- 先把 `send()` 里的占位回复换成真 `fetch`（走已配好的 API 地址）—— 直接打通链条，但会一次性压在红灯缺口上；
- 先做一个本地 ASP.NET Core 的 `/api/health` + `/api/chat` 空壳，再回来接前端 —— 步子更小，前后端都能验证。
