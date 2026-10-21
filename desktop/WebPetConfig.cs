using System;
using System.IO;
using System.Windows.Media.Imaging;
using Newtonsoft.Json;

namespace AI桌宠_V1._0._0
{
    /// <summary>网页版 .pet.json 里 persona 那一段。</summary>
    public class WebPersonaPayload
    {
        [JsonProperty("name")] public string Name { get; set; } = "";

        /// <summary>网页版已经拼好的完整提示词。桌面端直接用，不参与拼装。</summary>
        [JsonProperty("prompt")] public string Prompt { get; set; } = "";
    }

    /// <summary>
    /// 网页版「下载配置（.pet.json）」导出的文件结构。
    /// 字段名必须和 TS/types.ts 里的 PetConfigFile 一一对应，改一边就要改另一边。
    /// </summary>
    public class WebPetConfig
    {
        /// <summary>格式版本。网页版写死的值，桌面端靠它判断认不认识这个文件。</summary>
        public const string SupportedFormat = "desktop-pet/1";

        [JsonProperty("format")] public string Format { get; set; } = "";
        [JsonProperty("savedAt")] public string SavedAt { get; set; } = "";
        [JsonProperty("persona")] public WebPersonaPayload Persona { get; set; } = new WebPersonaPayload();

        /// <summary>data URL（data:image/png;base64,...）。没上传过形象时是 null。</summary>
        [JsonProperty("image")] public string? Image { get; set; }
    }

    public static class WebPetConfigLoader
    {
        /// <summary>
        /// 读一个 .pet.json。返回 false 时 error 里是能直接显示给用户的中文原因。
        /// 这里刻意不抛异常：配置文件是用户选的，选错文件很常见。
        /// </summary>
        public static bool TryLoad(string path, out WebPetConfig config, out string error)
        {
            config = new WebPetConfig();
            error = "";

            // 先反序列化到可空变量：文件里写个 "null" 也算合法 JSON，
            // 那种情况要单独给一句"文件是空的"，而不是掉到格式检查里去
            WebPetConfig? parsed;

            try
            {
                parsed = JsonConvert.DeserializeObject<WebPetConfig>(File.ReadAllText(path));
            }
            catch (Exception ex)
            {
                error = "这个文件不是合法的 JSON：" + ex.Message;
                return false;
            }

            if (parsed is null)
            {
                error = "文件是空的";
                return false;
            }

            config = parsed;

            if (config.Format != WebPetConfig.SupportedFormat)
            {
                error = $"不认识这个格式（读到 “{config.Format}”），需要 {WebPetConfig.SupportedFormat}";
                return false;
            }

            if (string.IsNullOrWhiteSpace(config.Persona?.Prompt))
            {
                error = "文件里没有提示词";
                return false;
            }

            return true;
        }

        /// <summary>把 data URL 解成位图。失败返回 null，调用方自己决定怎么提示。</summary>
        public static BitmapImage? DecodeImage(string dataUrl)
        {
            if (string.IsNullOrWhiteSpace(dataUrl)) return null;

            int comma = dataUrl.IndexOf(',');
            if (comma < 0) return null;

            try
            {
                byte[] bytes = Convert.FromBase64String(dataUrl.Substring(comma + 1));

                var image = new BitmapImage();
                image.BeginInit();
                // OnLoad：立刻把流读进内存，否则关掉流之后图片会变空白
                image.CacheOption = BitmapCacheOption.OnLoad;
                image.StreamSource = new MemoryStream(bytes);
                image.EndInit();
                image.Freeze(); // 冻结后才能跨线程/重复使用
                return image;
            }
            catch
            {
                return null;
            }
        }

        /// <summary>
        /// 把 data URL 里的图片落到磁盘，供下次启动直接读。
        /// 不存进 json：一张 8MB 的图 base64 之后十几 MB，每次读写配置都要搬一遍。
        /// </summary>
        public static bool TrySaveImage(string dataUrl, string targetPath, out string error)
        {
            error = "";

            if (string.IsNullOrWhiteSpace(dataUrl)) return false;

            int comma = dataUrl.IndexOf(',');
            if (comma < 0)
            {
                error = "图片数据格式不对";
                return false;
            }

            try
            {
                byte[] bytes = Convert.FromBase64String(dataUrl.Substring(comma + 1));
                File.WriteAllBytes(targetPath, bytes);
                return true;
            }
            catch (Exception ex)
            {
                error = "图片存不下来：" + ex.Message;
                return false;
            }
        }
    }
}
