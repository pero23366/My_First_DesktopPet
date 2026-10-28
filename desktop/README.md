# 桌面版（WPF）

无边框、背景透明、永远置顶的桌宠窗口。相对网页版的差别只有一个：**它真的是一个窗口**，所以能被鼠标拖到屏幕任何位置，也能盖在任何程序上面。

## 这是什么

- 技术栈：.NET 10 / WPF（`net10.0-windows`）+ Newtonsoft.Json
- 窗口样式：`WindowStyle="None"` + `AllowsTransparency="True"` + `Topmost="True"` + `ShowInTaskbar="False"`
- 交互：左键拖动 = `DragMove()`；`Esc` 退出；功能栏 `▾` 可整条收起
- 对话：DeepSeek 直连，三层存储（全量流水 / 最近 6 轮上下文 / 压缩后的记忆）

## 怎么跑

前置：**.NET 10 SDK**（`dotnet --version` 应 ≥ 10）。

```bash
# 方式一：命令行
dotnet run --project desktop

# 方式二：Visual Studio 打开 desktop/AI桌宠_V1.0.0.csproj，F5
```

首次运行会在 **exe 同级目录**生成 `pet_settings.json`，需要自己填 DeepSeek API Key（界面 ⚙ 设置 → DeepSeek API）。

## 怎么打包成可下载的 zip

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\publish-desktop.ps1
# 换版本号：-Version 1.1.0
```

脚本做四件事：`dotnet publish`（自包含单文件 + 原生库内嵌）→ `Compress-Archive` → 算 SHA256 → 打印发布步骤。
产物落在 `release/`（已被 `.gitignore` 排除：单文件 137MB 超过 GitHub 100MB 限制，只能作为 Release 附件）。

## 本地运行时会生成的文件（都不进仓库）

| 文件 | 内容 |
|---|---|
| `pet_settings.json` | API Key、模型、人设、自动收起秒数、桌宠大小 |
| `conversation.json` | 全量对话流水 + `memory`（压缩后的长期记忆） |
| `pet_image.png` | 从网页版导入的自定义形象 |

删掉这三个文件 = 恢复出厂状态。

## 代码结构

| 文件 | 职责 |
|---|---|
| `MainWindow.xaml(.cs)` | 窗口本体：待机三帧动画、气泡、思考动画、拖动、缩放、功能栏收起 |
| `SettingsWindow.xaml(.cs)` | 设置窗口：形象 / 人设 / API / 对话四段，草稿式保存（点保存才落盘） |
| `HistoryWindow.xaml(.cs)` | 只读历史记录 + 顶部"小沃记得的事" |
| `ConversationStore.cs` | 三层对话存储、上下文拼装、超长压缩成 memory |
| `DeepseekService.cs` | DeepSeek HTTP 调用；失败返回文案而不抛异常 |
| `PetSettings.cs` / `DefaultPersona.cs` | 设置模型与默认人设（通用版，不含任何具体个人信息） |
| `WebPetConfig.cs` | 读网页版导出的 `.pet.json` |

## 两个已知限制

1. **API Key 是明文**存在 `pet_settings.json`（没有走 DPAPI 加密）。它只在本机、只对能读到这个文件的人暴露；要更稳可以加 `System.Security.Cryptography.ProtectedData`。
2. **只能导入不能导出** `.pet.json`，网页版有导出、桌面版没有对称实现。
