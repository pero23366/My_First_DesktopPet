# A 方案落地：桌面版分发链路

> **确立时间**：2026-10-18 22:50
> **决策**：网页 + 桌面**双入口**（A 方案），先解决「把 WPF 桌宠送到用户电脑上」，暂不做 WebView2 混合壳
> **相关文档**：[安全与隐私决策-API-Key与对话记忆.md](./安全与隐私决策-API-Key与对话记忆.md)

---

## 一、这个方案解决什么

之前论证过：浏览器**永远做不到**三件事 —— 窗口透明、拖动窗口本身、窗口置顶。这正是 `AI桌宠_V1.0.0`（WPF）早就实现的东西：

| 能力 | WPF 实现证据 |
|---|---|
| 透明镂空 | `WindowStyle="None"` + `AllowsTransparency="True"` + `Background="Transparent"` |
| 窗口置顶 | `Topmost="True"` |
| 拖动整个窗口 | `MainWindow.xaml.cs:128-130` → `MouseButtonState.Pressed → DragMove()` |
| 不占任务栏 | `ShowInTaskbar="False"` |

所以 A 方案的分工是：

- **网页版**：一起学习（白噪音、番茄钟、笔记）—— 需要联网、需要跨设备的那些
- **桌面版**：桌宠形态 —— 透明、置顶、能拖

两个入口，一套产品。

## 二、必须先接受的一条硬限制

**浏览器不允许"点一下就自动安装并运行本地程序"。** 这是沙箱规则，不是技术没做到 —— 从 IE 的 ActiveX 时代结束后，任何网站都不能静默执行 exe。

所以真实流程只能是：

```
点「下载桌面版」 → 浏览器下载 zip → 用户解压 → 双击 exe
                                        └→ SmartScreen 拦截 → 「更多信息 → 仍要运行」
```

这三步流失率高，但**没有绕过的方法**。谁跟你说能绕过，那是在教你怎么写恶意软件。

## 三、体积怎么定的（实测，不是估的）

| 发布方式 | 体积 | 用户还要装什么 |
|---|---|---|
| `--self-contained -p:PublishSingleFile=true` | **137 MB** | 无 |
| `--self-contained false` | **4.0 MB** | **.NET 10 Desktop Runtime（约 55MB，Win10/11 不自带）** |

**选了 137MB 自包含。** 原因：目标框架是 `net10.0-windows`，而 Windows 只自带 .NET Framework 4.8，不自带 .NET 10。4MB 方案等于要求用户先去微软官网找对版本、下载、安装 —— 普通用户在这步基本放弃。**"能跑"比"体积小"重要。**

（中期优化方向：把 WPF 项目回退到 `net48`，体积可降到约 6MB 且零运行时依赖。等确认有人真用再做。）

## 四、为什么不把 zip 放进 git 仓库

**GitHub 单文件上限 100MB**，这个 zip 是 137MB，直接 `git add` 会被拒。正确做法：

- 产物放 `release/`（已进 `.gitignore`）
- 二进制作为 **GitHub Releases 附件**上传（上限 2GB）
- 仓库里只留脚本和文档

## 五、发布流程（每发一版都走这个）

```powershell
# 1. 打包
powershell -ExecutionPolicy Bypass -File .\tools\publish-desktop.ps1 -Version 1.0.1

# 2. 产物在 release/ 下：
#    xiaowo-desktop-v1.0.1-win-x64.zip
#    xiaowo-desktop-v1.0.1-win-x64.zip.sha256

# 3. 打开 https://github.com/pero23366/My_First_DesktopPet/releases/new
#    Tag: v1.0.1  标题: 小沃桌宠 v1.0.1
#    把 zip 和 .sha256 拖进附件区 → 先存草稿检查 → Publish release
```

**网页端不用改任何代码。** 首页那个链接指向 `releases/latest`，发完新版本自动生效。

脚本里几个参数不是随手写的：

| 参数 | 为什么要加 |
|---|---|
| `--self-contained true` | 用户不需要装 .NET 运行时 |
| `-p:PublishSingleFile=true` | 一个 exe，用户不会面对一堆 dll 发懵 |
| `-p:IncludeNativeLibrariesForSelfExtract=true` | WPF 少了这句会运行时报找不到 hostfxr |
| `-p:DebugType=none` | 省体积，也别把本地路径信息带出去 |
| 产物名用 ASCII | 中文名在部分解压工具里乱码 |

## 六、SHA256 是干嘛的

`release/` 里会同时生成一个 `.sha256` 文件。因为 **exe 没有代码签名**，Windows 会弹「已保护你的电脑」，用户有理由怀疑这是个病毒。校验值的意义是：

> 别人可以自己算一遍哈希，和 Release 页面上的对上，就说明文件在传给他的路上没被"加料"。

配套要在 Release 说明里写清楚：这是开源项目、未签名、源码在同一个仓库。

## 七、已知风险（会咬人的地方）

| 风险 | 触发条件 | 缓解 |
|---|---|---|
| SmartScreen 拦截 | 未签名 exe 首次运行 | 网页与视频里演示「更多信息 → 仍要运行」 |
| 杀毒误报 | 未签名 + 自解压 + 小体积 | 提供源码仓库地址；必要时在 Release 里注明误报情况 |
| 只支持 Windows x64 | Mac/Linux 用户 | 下载入口文案必须写明，别让人白下 137MB |
| GitHub 下载慢 | 国内网络 | 中期可挂 Cloudflare 反代或 Gitee 镜像 |
| 用户永远停在旧版 | 无自动更新 | 桌面版启动时查 `api.github.com/.../releases/latest` 提示更新（下一步） |
| 两端数据不通 | 桌宠版与网页版各自本地存储 | 接受；真要同步得上后端 + 端到端加密 |

## 八、后续三步（按顺序）

1. **桌面版加 key 输入界面**：现在 `DeepseekService._apiKey` 只能由代码 `SetApiKey()` 设置，普通用户没法填。要用 WPF 窗口 + DPAPI（`ProtectedData`）加密存在本地
2. **自动更新**：启动时问一次 Release 最新版，有新版就提示
3. **压缩素材**：`Images/小沃_待机empty.png` 是 2.4MB 未压缩 PNG，转 WebP 后能省 80%。对 137MB 无感，但对将来 6MB 的 net48 版是 40% 的体积
