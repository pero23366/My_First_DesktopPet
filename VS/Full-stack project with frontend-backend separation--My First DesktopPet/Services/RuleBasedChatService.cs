namespace PetApi.Services;

/// <summary>
/// 规则版的小沃。不接大模型，先让「前端 → 后端 → 前端」这条链路真的能跑通。
/// 人设基调：短句、有点丧、但很温柔；不装熟、不超过两行。
/// </summary>
public class RuleBasedChatService : IChatService
{
    // 规则表：命中任意一个关键词，就从对应的一组回答里挑一句。
    // 用数组而不是 if-else 链，是为了加规则时只改数据、不改逻辑。
    private static readonly (string[] Keywords, string[] Replies)[] Rules =
    [
        (
            ["你好", "在吗", "嗨", "哈喽", "hello", "hi"],
            ["在。我一直在水里。", "我在。你来了我就浮上来。", "在呢，尾巴刚摆了一下。"]
        ),
        (
            ["你是谁", "你叫什么", "名字", "介绍一下"],
            ["我是小沃，一条住在屏幕里、陪你干活的鲨鱼。", "小沃。不会咬人，咬也咬不动。"]
        ),
        (
            ["学习", "写代码", "作业", "复习", "考试", "看书", "工作", "加班", "debug", "报错"],
            [
                "那就一起吧。你敲一行，我摆一下尾巴。",
                "慢慢来。写不完的代码，明天也还在；但今天的你只有一个。",
                "卡住的时候先起来走两步。我在这儿等你回来。"
            ]
        ),
        (
            ["累", "困", "撑不住", "想放弃", "好难"],
            ["那就先停一下。停不是输。", "累了就靠一会儿，我不催你。", "嗯，我知道。你已经很努力了。"]
        ),
        (
            ["难过", "伤心", "emo", "不开心", "烦", "焦虑"],
            ["不用说清楚。我陪你待一会儿就行。", "水底很安静，你也可以安静一会儿。"]
        ),
        (
            ["晚安", "睡了", "睡觉", "休息"],
            ["晚安。灯我留着，你想回来随时。", "去睡吧。我把水面看着。"]
        ),
        (
            ["饿", "吃", "饭", "奶茶", "外卖"],
            ["饿了就去吃。鱼会自己找食，人别学鱼。", "吃点东西吧，胃比代码重要。"]
        ),
        (
            ["谢谢", "感谢", "多谢", "谢了"],
            ["不用谢。你愿意回来找我说话，就够了。", "嗯。别客气，我本来就该在这儿。"]
        ),
        (
            ["再见", "拜拜", "走了", "下线"],
            ["去吧。我不会走。", "拜拜。我在水底，不吵你。"]
        )
    ];

    // 没命中任何关键词时用这几句兜底。
    private static readonly string[] Fallbacks =
    [
        "……我在。",
        "这个我不太懂，但我在听。",
        "嗯，然后呢？",
        "你说的我记下了。",
        "水里消息很慢，但我收到了。"
    ];

    public string Reply(string message)
    {
        // 防御：控制器已经校验过，但服务层不假设调用方一定守规矩。
        if (string.IsNullOrWhiteSpace(message))
        {
            return "你不说话，我就当你只是来看看我。";
        }

        var text = message.Trim();

        foreach (var (keywords, replies) in Rules)
        {
            foreach (var keyword in keywords)
            {
                // 中文没有空格分词，Contains 是最省事也够用的做法。
                // 要注意它不区分大小写，所以 "Hi" 也能命中 "hi"。
                if (text.Contains(keyword, StringComparison.OrdinalIgnoreCase))
                {
                    // 不用 Random：同样的话得到同样的回应，方便你复现问题。
                    // 取长度做下标，能让不同的句子拿到不同的一句。
                    return replies[text.Length % replies.Length];
                }
            }
        }

        return Fallbacks[text.Length % Fallbacks.Length];
    }
}
