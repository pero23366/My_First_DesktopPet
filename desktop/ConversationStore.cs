using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace AI桌宠_V1._0._0
{
    /// <summary>一条已经存下来的对话，比 ChatMessage 多一个时间戳（历史窗口要显示）。</summary>
    public class StoredMessage
    {
        [JsonProperty("role")] public string Role { get; set; } = "";
        [JsonProperty("content")] public string Content { get; set; } = "";
        [JsonProperty("time")] public DateTime Time { get; set; } = DateTime.Now;
    }

    /// <summary>落盘结构。messages 是全量流水，memory 是被压缩过的旧对话摘要。</summary>
    public class ConversationFile
    {
        [JsonProperty("memory")] public string Memory { get; set; } = "";

        /// <summary>messages 里前多少条已经进了 memory。压缩只处理它之后的那些。</summary>
        [JsonProperty("covered")] public int Covered { get; set; }

        [JsonProperty("messages")] public List<StoredMessage> Messages { get; set; } = new List<StoredMessage>();
    }

    /// <summary>
    /// 对话存储。三个职责，刻意分开，因为它们的生命周期完全不同：
    ///
    /// 1. **全量流水**（messages）：只增不删，给「历史记录」窗口看。用户要能翻到所有说过的话。
    /// 2. **上下文窗口**（BuildContext）：只取最近 6 轮 + memory，发给模型。
    ///    全量流水绝不能直接塞给模型 —— 聊一个月就是几万 token，又贵又慢还会跑题。
    /// 3. **记忆摘要**（memory）：旧对话被压缩成一小段，替掉那些再也用不上的原文。
    ///    这就是"不让模型读全部历史，但它依然记得你"的做法。
    /// </summary>
    public class ConversationStore
    {
        /// <summary>发给模型的最近轮数。一轮 = 用户 1 条 + 小沃 1 条。</summary>
        public const int ContextTurns = 6;

        /// <summary>未压缩的消息攒够这么多条就压一次。</summary>
        public const int CompressAfter = 12;

        /// <summary>压缩时留最近这么多条不动，免得把刚说的话也碾成摘要。</summary>
        public const int KeepRecentOutsideMemory = 6;

        /// <summary>memory 的目标字数上限，写进提示词里让模型自己收。</summary>
        private const int MemoryMaxChars = 150;

        private static readonly string[] FileNames = { "conversation.json" };

        private ConversationFile _file = new ConversationFile();

        public IReadOnlyList<StoredMessage> Messages => _file.Messages;
        public string Memory => _file.Memory;

        /// <summary>还有多少条没被压进 memory。</summary>
        public int UncoveredCount => Math.Max(0, _file.Messages.Count - _file.Covered);

        public bool NeedsCompress => UncoveredCount >= CompressAfter;

        private static string FilePath => FileNames[0];

        // ---------- 读写 ----------

        public static ConversationStore Load()
        {
            var store = new ConversationStore();

            try
            {
                if (File.Exists(FilePath))
                {
                    var loaded = JsonConvert.DeserializeObject<ConversationFile>(File.ReadAllText(FilePath));
                    if (loaded != null)
                    {
                        store._file = loaded;
                        store._file.Messages ??= new List<StoredMessage>();
                    }
                }
                else
                {
                    store.MigrateFromOldHistory();
                }
            }
            catch
            {
                // 文件坏了就从空的开始，别让一个坏文件把桌宠卡死
                store._file = new ConversationFile();
            }

            return store;
        }

        /// <summary>
        /// 老版本把上下文存在 chat_history.json 里（一个纯数组，第一条是 system 人设）。
        /// 迁过来之后把旧文件改名留底，用户之前聊过的东西不会凭空消失。
        /// </summary>
        private void MigrateFromOldHistory()
        {
            const string oldPath = "chat_history.json";
            if (!File.Exists(oldPath)) return;

            try
            {
                var old = JsonConvert.DeserializeObject<List<ChatMessage>>(File.ReadAllText(oldPath));
                if (old != null)
                {
                    foreach (var message in old)
                    {
                        // system 是拼进去的人设，不是用户说的话，历史窗口里不该出现
                        if (message.Role == "system") continue;

                        _file.Messages.Add(new StoredMessage
                        {
                            Role = message.Role,
                            Content = message.Content,
                            Time = DateTime.Now
                        });
                    }
                }

                File.Move(oldPath, oldPath + ".bak", true);
                Save();
            }
            catch
            {
                // 迁移失败就当没有旧数据
            }
        }

        public void Save()
        {
            try
            {
                File.WriteAllText(FilePath, JsonConvert.SerializeObject(_file, Formatting.Indented));
            }
            catch
            {
                // 存不下来不该打断聊天
            }
        }

        public void Append(string role, string content)
        {
            _file.Messages.Add(new StoredMessage { Role = role, Content = content, Time = DateTime.Now });
        }

        public void Clear()
        {
            _file = new ConversationFile();
            Save();
        }

        // ---------- 给模型看的上下文 ----------

        /// <summary>
        /// 人设 + 记忆 + 最近 6 轮。顺序有讲究：
        /// 人设在最前（角色不能变），记忆紧随其后（长期背景），最近对话最后（当前话题）。
        /// </summary>
        public List<ChatMessage> BuildContext(string personaPrompt)
        {
            var context = new List<ChatMessage>
            {
                new ChatMessage { Role = "system", Content = personaPrompt }
            };

            if (!string.IsNullOrWhiteSpace(_file.Memory))
            {
                context.Add(new ChatMessage
                {
                    Role = "system",
                    Content = "【你对枕头过去的记忆（已压缩，来自更早的对话）】\n" + _file.Memory
                });
            }

            int skip = Math.Max(0, _file.Messages.Count - ContextTurns * 2);
            foreach (var message in _file.Messages.Skip(skip))
            {
                context.Add(new ChatMessage { Role = message.Role, Content = message.Content });
            }

            return context;
        }

        // ---------- 压缩 ----------

        /// <summary>
        /// DeepSeekService 出错时是把错误当作正常字符串返回的，
        /// 所以存历史、写记忆前都得先问一句"这是不是错误文案"。
        /// </summary>
        public static bool IsErrorReply(string text)
        {
            return string.IsNullOrWhiteSpace(text)
                || text.StartsWith("API报错")
                || text.StartsWith("网络请求失败")
                || text.StartsWith("小沃还没有")
                || text.StartsWith("接口返回了空内容");
        }

        /// <summary>
        /// 把最早的一批未压缩消息揉进 memory。返回 true 表示成功更新了记忆。
        /// 失败（没 Key、网络挂、余额不足）就原样返回 false，旧消息留在流水里，下次再试。
        /// </summary>
        public async Task<bool> CompressAsync(DeepSeekService service, string model)
        {
            int end = _file.Messages.Count - KeepRecentOutsideMemory;
            if (end <= _file.Covered) return false;

            var batch = _file.Messages.Skip(_file.Covered).Take(end - _file.Covered).ToList();
            if (batch.Count == 0) return false;

            var transcript = string.Join("\n", batch.Select(m =>
                (m.Role == "user" ? "枕头" : "小沃") + "：" + m.Content));

            string existing = string.IsNullOrWhiteSpace(_file.Memory) ? "（还没有）" : _file.Memory;

            string prompt =
                "你是对话记忆压缩器。任务：把下面这段新对话并进已有记忆，输出一段更新后的记忆。\n" +
                $"要求：\n1. 用中文，不超过 {MemoryMaxChars} 字；\n" +
                "2. 只保留长期有用的信息：枕头的偏好、性格、近况、在意的人和事、你答应过的事；\n" +
                "3. 不要复述寒暄、语气词、一次性的闲聊；不要评论，只陈述；\n" +
                "4. 如果新对话没有值得记的内容，就原样返回已有记忆。\n\n" +
                $"【已有记忆】\n{existing}\n\n【新对话】\n{transcript}\n\n" +
                "直接输出记忆正文，不要任何前缀或解释。";

            var messages = new List<ChatMessage> { new ChatMessage { Role = "user", Content = prompt } };
            string result = await service.GetResponseAsync(messages, model);

            // DeepSeekService 出错时是把错误当普通字符串返回的，所以这里要自己识别
            if (IsErrorReply(result)) return false;

            _file.Memory = result.Trim();
            _file.Covered = end;
            Save();
            return true;
        }
    }
}
