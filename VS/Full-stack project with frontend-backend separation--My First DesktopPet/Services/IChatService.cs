namespace PetApi.Services;

/// <summary>
/// 「小沃怎么说话」这件事，先用一个接口框起来。
/// 为什么要接口：以后换成接大模型（LLM）时，只要再写一个实现类，
/// 控制器一行都不用改 —— 这就是依赖注入真正省钱的地方。
/// </summary>
public interface IChatService
{
    /// <summary>给一句话，返回小沃的回答。</summary>
    string Reply(string message);
}
