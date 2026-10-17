namespace PetApi.Models;

/// <summary>
/// 返回给前端的结构。属性名到了前端会自动变成 camelCase：
/// Reply → reply，Source → source，ReceivedAt → receivedAt。
/// </summary>
public class ChatReply
{
    public string Reply { get; set; } = "";

    /// <summary>这条回复是谁产生的。现在是 rules，以后接上大模型就是 llm。</summary>
    public string Source { get; set; } = "rules";

    public DateTimeOffset ReceivedAt { get; set; } = DateTimeOffset.Now;
}
