using System.ComponentModel.DataAnnotations;

namespace PetApi.Models;

/// <summary>
/// 前端发过来的请求体。前端这样发：
/// { "message": "你好" }
/// </summary>
public class ChatRequest
{
    // [Required] 管的是 null 和空字符串之外的情况，[StringLength] 管长度。
    // 配合控制器上的 [ApiController]，校验不通过会自动返回 400，不用自己写 if。
    [Required(ErrorMessage = "message 不能为空")]
    [StringLength(500, MinimumLength = 1, ErrorMessage = "message 长度要在 1~500 之间")]
    public string Message { get; set; } = "";
}
