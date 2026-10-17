using PetApi.Services;

var builder = WebApplication.CreateBuilder(args);

// ==================== 服务注册 ====================
// 这一段是「往依赖注入容器里放东西」，此时还没开始处理任何请求。

builder.Services.AddControllers();

// 「小沃怎么说话」做成服务，控制器只依赖接口。
// Singleton：无状态、没有 per-request 数据，整个程序一个实例就够（也最省内存）。
// 以后换成接大模型，只把这一行的实现类换掉，控制器一行都不用动。
builder.Services.AddSingleton<IChatService, RuleBasedChatService>();

// 跨域（CORS）：浏览器默认禁止 A 源（前端 5173）读 B 源（后端 5003）的响应。
// 后端必须显式声明「我允许谁读」，否则前端 fetch 会直接抛错。
const string CorsPolicy = "PetFrontend";

builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicy, policy =>
    {
        policy.WithOrigins(
                    "http://localhost:5173", "http://127.0.0.1:5173", // Vite dev server（npm run dev）
                    "http://localhost:4173", "http://127.0.0.1:4173", // Vite preview（npm run preview）
                    "http://localhost:5500", "http://127.0.0.1:5500") // VS Code Live Server 的默认端口
              .AllowAnyHeader()
              .AllowAnyMethod();
        // 不用 AllowAnyOrigin：那等于任何网站都能读你的接口。
        // 也不放 "null"（file://）：本项目的 index.html 用了 type="module"，
        // 双击打开本来就会被浏览器的模块 CORS 规则拦掉，加了也没用。
    });
});

builder.Services.AddOpenApi();

var app = builder.Build();

// ==================== 请求管道 ====================
// 这一段是「请求进来后按顺序过哪些关卡」，所以顺序本身就是逻辑。

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi(); // /openapi/v1.json，VS 里可以直接看接口文档
}

// 本地前后端分离调试时不要强制跳 HTTPS：
// 一跳到 https 就会撞自签名证书，前端看到的只是「连不上」，非常难查。
// 等真部署到公网再加回来。
// app.UseHttpsRedirection();

// UseCors 必须排在 MapControllers 前面，
// 否则浏览器的预检请求（OPTIONS）走不到 CORS 中间件，响应里就没有 Allow-Origin 头。
app.UseCors(CorsPolicy);

app.UseAuthorization();

app.MapControllers();

app.Run();
