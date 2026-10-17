using Microsoft.AspNetCore.Mvc;

namespace PetApi.Controllers;

/// <summary>
/// /api/health —— 前端设置面板里「测试连接」按钮打的就是这个地址。
/// 只要它返回 200 + JSON，就同时证明了三件事：
///   1. 后端进程起来了；
///   2. 路由匹配对了（/api/health）；
///   3. CORS 放行了前端那个源（否则浏览器不会把响应交给 JS）。
/// </summary>
[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    // 进程启动时间只读一次，用来算 uptime。static 表示整个程序共享一份。
    private static readonly DateTimeOffset StartedAt = DateTimeOffset.Now;

    [HttpGet]
    public IActionResult Get()
    {
        // 返回匿名对象最省事，ASP.NET Core 会自动序列化成 JSON。
        // 字段名默认按 camelCase 输出，所以 C# 的 Status 到前端就是 status。
        return Ok(new
        {
            status = "ok",
            service = "My_First_DesktopPet.Api",
            serverTime = DateTimeOffset.Now,
            uptimeSeconds = (int)(DateTimeOffset.Now - StartedAt).TotalSeconds
        });
    }
}
