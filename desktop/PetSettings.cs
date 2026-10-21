using System;
using System.IO;
using Newtonsoft.Json;

namespace AI桌宠_V1._0._0
{
    /// <summary>
    /// 桌面版的本地设置。
    ///
    /// 为什么不再用 apikey.txt：现在要存的不止 Key —— 还有模型、人设提示词、
    /// 自动收起的开关和秒数。一个键一个文件最后会散成一地，
    /// 统一成 pet_settings.json，要加字段只改这个类。
    ///
    /// 兼容旧版：启动时如果发现 apikey.txt 而 json 里没有 Key，自动迁移一次。
    /// </summary>
    public class PetSettings
    {
        // 与网页版保持同一区间：10~60 秒
        public const int AutoHideMinSeconds = 10;
        public const int AutoHideMaxSeconds = 60;

        // 桌宠大小：0.5 = 一半，1.5 = 一倍半。上限不敢再大，
        // 因为窗口是整套 UI 等比放大，1.5 倍已经 1050×675，再大会顶出屏幕。
        public const double PetScaleMin = 0.5;
        public const double PetScaleMax = 1.5;

        /// <summary>
        /// 人设版本。老文件里没有这个字段，反序列化后就是 0 —— 正好当"还没检查过"。
        /// 注意别给它写字段初始值，否则老文件会被当成新版本，迁移就失效了。
        /// </summary>
        public int PersonaVersion { get; set; }

        /// <summary>单条消息的 Key。保存位置就在 exe 同级的 json 里，别把它提交到仓库。</summary>
        public string ApiKey { get; set; } = "";

        /// <summary>deepseek-chat 或 deepseek-reasoner，和主界面的「聊天 / 思考」按钮同步。</summary>
        public string Model { get; set; } = "deepseek-chat";

        public string PersonaName { get; set; } = DefaultPersona.Name;

        /// <summary>最终生效的人设文本。网页版导出的 .pet.json 就是往这里写。</summary>
        public string PersonaPrompt { get; set; } = DefaultPersona.Prompt;

        /// <summary>默认 false = 回复气泡一直留着。对齐网页版需求 4。</summary>
        public bool AutoHideEnabled { get; set; } = false;

        /// <summary>自动收起的秒数，10~60。</summary>
        public int AutoHideSeconds { get; set; } = 20;

        /// <summary>桌宠整体大小，0.5~1.5。1.0 = 设计稿的 700×450。</summary>
        public double PetScale { get; set; } = 1.0;

        /// <summary>true 时用 pet_image.png 替换三帧待机动画（用户从网页导入的形象）。</summary>
        public bool UseCustomImage { get; set; } = false;

        public static string SettingsPath => "pet_settings.json";
        public static string CustomImagePath => "pet_image.png";

        /// <summary>把秒数夹回合法区间。文件是明文，用户手改也不会把定时器弄疯。</summary>
        public void ClampAutoHideSeconds()
        {
            if (AutoHideSeconds < AutoHideMinSeconds) AutoHideSeconds = AutoHideMinSeconds;
            if (AutoHideSeconds > AutoHideMaxSeconds) AutoHideSeconds = AutoHideMaxSeconds;
        }

        /// <summary>同样防手改：0 或 20 这种值会让窗口直接消失或者铺满屏幕。</summary>
        public void ClampPetScale()
        {
            if (double.IsNaN(PetScale) || PetScale <= 0) PetScale = 1.0;
            if (PetScale < PetScaleMin) PetScale = PetScaleMin;
            if (PetScale > PetScaleMax) PetScale = PetScaleMax;
        }

        public static PetSettings Load()
        {
            PetSettings? settings = null;

            try
            {
                if (File.Exists(SettingsPath))
                {
                    settings = JsonConvert.DeserializeObject<PetSettings>(File.ReadAllText(SettingsPath));
                }
            }
            catch
            {
                // 文件被改坏就当没有，用默认值启动 —— 一个坏配置不该让桌宠起不来
                settings = null;
            }

            settings ??= new PetSettings();

            // 老版本只存了 Key 的纯文本，迁移一次，迁完就把旧文件改名留底
            if (string.IsNullOrWhiteSpace(settings.ApiKey) && File.Exists("apikey.txt"))
            {
                try
                {
                    settings.ApiKey = File.ReadAllText("apikey.txt").Trim();
                    settings.Save();
                    File.Move("apikey.txt", "apikey.txt.bak", true);
                }
                catch
                {
                    // 迁移失败不影响启动，下次再试
                }
            }

            if (string.IsNullOrWhiteSpace(settings.PersonaPrompt))
            {
                settings.PersonaPrompt = DefaultPersona.Prompt;
            }
            else if (settings.PersonaVersion < DefaultPersona.Version
                     && settings.PersonaPrompt.Contains(DefaultPersona.LegacyPrivateMarker))
            {
                // 老版本的内置人设里写死了具体某个人的学校、经历 —— 那是私人记忆，不能跟着程序发给别人。
                // 只在"确认这段是内置文本"时才替换；用户自己敲进去的提示词一个字都不动。
                settings.PersonaPrompt = DefaultPersona.Prompt;
            }

            settings.PersonaVersion = DefaultPersona.Version;
            settings.ClampAutoHideSeconds();
            settings.ClampPetScale();
            return settings;
        }

        public void Save()
        {
            try
            {
                ClampAutoHideSeconds();
                ClampPetScale();
                File.WriteAllText(SettingsPath, JsonConvert.SerializeObject(this, Formatting.Indented));
            }
            catch
            {
                // 保存失败不该打断用户聊天，内存里的设置这次仍然有效
            }
        }
    }
}
