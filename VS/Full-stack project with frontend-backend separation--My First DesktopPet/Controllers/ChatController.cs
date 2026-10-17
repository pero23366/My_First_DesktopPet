using Microsoft.AspNetCore.Mvc;
using PetApi.Models;
using PetApi.Services;

namespace PetApi.Controllers;

/// <summary>
/// POST /api/chat —— 桌宠真正"说话"的地方。
/// 请求：{ "message": "今天好累" }
/// 响应：{ "reply": "那就先停一下。停不是输。", "source": "rules", "receivedAt": "..." }
/// </summary>
[ApiController]
[Route("api/chat")]
public class ChatController : ControllerBase
{
    private readonly IChatService _chat;

    // 构造函数注入：ASP.NET Core 会自己把注册过的实现塞进来。
    // 这就是 Program.cs 里 AddSingleton&lt;IChatService, RuleBasedChatService&gt;() 的作用。
    public ChatController(IChatService chat)
    {
        _chat = chat;
    }

    [HttpPost]
    public ActionResult<ChatReply> Post([FromBody] ChatRequest request)
    {
        var text = request.Message.Trim();

        // [ApiController] + 数据注解其实已经拦掉了 null、空串、全空格、超长（自动 400，见实测），
        // 这里保留一层防御：万一哪天去掉了注解，服务层也不会被空话打穿。
        if (text.Length == 0)
        {
            return BadRequest(new { error = "消息不能为空" });
        }

        return Ok(new ChatReply
        {
            Reply = _chat.Reply(text),
            ReceivedAt = DateTimeOffset.Now
        });
    }
}
