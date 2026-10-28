# 后端（ASP.NET Core）

桌宠的服务端。当前是**规则表实现**：不调大模型，按关键词返回固定句子。它的价值不是"让小沃变聪明"（那是前端直连 DeepSeek 在做的事），而是练一套真的能跑的 HTTP 服务：路由、控制器、依赖注入、CORS、参数校验。

## 怎么跑

前置：**.NET 10 SDK**。

```bash
# 方式一：命令行（在仓库根执行）
dotnet run --project "VS/Full-stack project with frontend-backend separation--My First DesktopPet"

# 方式二：Visual Studio 打开 .slnx，选 http profile，F5
```

默认地址 **http://localhost:5003**（见 `Properties/launchSettings.json`）。
`https` profile 会额外占用 7190，本地自签名证书会被浏览器拦，**开发时用 http**。

自检：

```bash
curl http://localhost:5003/api/health
```

## 接口

| 方法 | 路径 | 请求体 | 响应 |
|---|---|---|---|
| GET | `/api/health` | — | `{ status, service, serverTime, uptimeSeconds }` |
| POST | `/api/chat` | `{ "message": "今天好累" }` | `{ reply, source, receivedAt }` |

`message` 受 `[Required]` + `[StringLength(1,500)]` 约束，配合 `[ApiController]` 自动返回 400（实测：全空格也会被判无效）。

```bash
curl -X POST http://localhost:5003/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"message\":\"今天好累\"}"
```

## 跨域

`Program.cs` 里策略 `PetFrontend` 放行三个来源：`localhost` 与 `127.0.0.1` 的 **5173**（Vite dev）、**4173**（vite preview）、**5500**（VS Code Live Server）。

两个坑都踩过，写在这里省得再踩：

1. `app.UseCors("PetFrontend")` 必须在 `app.MapControllers()` **前面**，否则预检过了、实际请求仍被拦。
2. `app.UseHttpsRedirection()` 本地要注释掉 —— 自签名证书会让 `fetch` 直接失败，而不是"降级成 http"。

## 目录

```
Controllers/    HealthController（健康检查）、ChatController（POST /api/chat）
Models/         ChatRequest（入参校验）、ChatReply（出参）
Services/       IChatService 接口 + RuleBasedChatService 规则表实现（单例注册）
Program.cs      服务注册、CORS、控制器映射
```

`IChatService` 是给"以后换成真模型"留的接口：只要再写一个 `DeepSeekChatService` 实现它，`Program.cs` 换一行注册即可，控制器不用动。

## 现在的边界（诚实版）

- 没有接真 LLM：真的对话在前端/客户端直连 DeepSeek，Key 由用户自带。
- 没有数据库、没有登录：对话记录都存在用户本机。
- 没有部署：本地跑。要上线可以容器化后丢到 Render / Fly.io，但在上面这些边界没变之前，多一台服务器只是多一个休眠的进程。

这些取舍的原因写在 [`docs/Solution/安全与隐私决策-API-Key与对话记忆.md`](../../docs/Solution/安全与隐私决策-API-Key与对话记忆.md)。
