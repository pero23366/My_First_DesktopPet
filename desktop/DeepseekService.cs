using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Data;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace AI桌宠_V1._0._0
{
    // 定义聊天消息的结构
    public class ChatMessage
    {
        //C# 里的属性名，我们按照规范
        //写成了大写的 Role 和 Content。
       // 但是，API 规定的 JSON 格式要求
       // 全小写的 role 和 content。
        [JsonProperty("role")] 
        // 强制打包成小写的 role
        public string Role { get; set; } = ""; // "user" 或 "assistant" 或 "system"
        [JsonProperty("content")] 
        // 强制打包成小写的 content
        public string Content { get; set; } = "";
    }

    public class DeepSeekService
    {
        // HttpClient
        //C# 程序里的“浏览器”或者“邮递员”
        // 只要创建一次 HttpClient 就够了，不要每次发消息都新建
        private static readonly HttpClient client = new HttpClient();

        // 你的 API Key
        private string _apiKey = "";
        // ⭐ 新增：提供一个小门，允许外部覆盖这个 Key
        public void SetApiKey(string newKey)
        {
            if (!string.IsNullOrWhiteSpace(newKey))
            {
                _apiKey = newKey;
            }
        }
        public async
            /*async：异步。
             * 这是一个魔法关键字。
             * 一般网络请求很慢（可能要等2秒），
             * 如果不用 async，
             * 你的整个桌面程序就会卡死2秒
             * （点不了、拖不动）。加上它，
             * 程序就会在后台默默等，界面依然丝滑。
             */
            Task<string>
           /*Task<string>：返回值类型。
            * Task 代表“一个正在进行的任务”
            * ，<string> 代表这个任务最终
            * 会交给你一个字符串（也就是 AI 的回复）。
            */
          
            GetResponseAsync(List<ChatMessage> history, string model = "deepseek-chat")
        {
            if (string.IsNullOrWhiteSpace(_apiKey))
            {
                return "小沃还没有你的 API Key 呢 (｡•́︿•̀｡)\n请点击底部的 ⚙ 设置 按钮，填入你自己的 Key 哦～";
            }
            try
            {
                // 1. 准备信封：
                // 收件地址是 DeepSeek 的 API 网址，
                // 方式是 POST
                //POST：像把信装进信封里。
                //你把数据打包放在“信封”（请求体）里发出去。
                //你现在的聊天记录（可能很长）、
                //你的 API Key 都不会暴露在网址上，
                //所以调用 AI 必须用 POST。
                var request = new HttpRequestMessage
                    (HttpMethod.Post, "https://api.deepseek.com/chat/completions");
                //// 贴上专属邮票（你的 API Key）

                request.Headers.Add("Authorization", $"Bearer {_apiKey}");
                // 2. 准备信纸内容
                //（打包成 JSON 格式）
                // DeepSeek 的服务器只听得懂 JSON 格式
                // 构建请求体
                var body = new
                {
                    model = model,
                    messages = history 
                    // 这里直接把历史记录整个丢过去，实现上下文联系
                };
                //  把 C# 对象变成字符串（打包）
                string jsonBody = JsonConvert.SerializeObject(body);
                request.Content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

                // // 3. 邮递员出发！送信，
                // 并 await（异步等待）回信
                // 发送请求
                var response = await client.SendAsync(request);
                //4. 把回信拆开，读成字符串
                // 读取返回内容
                string responseString = await response.Content.ReadAsStringAsync();
                // 5. 解析 JSON（把回复的文本变成 C# 对象）
                // 解析返回的 JSON
                dynamic? result = JsonConvert.DeserializeObject(responseString);

                // 如果 API 报错（比如 Key 不对），抛出异常
                if (result is null)
                {
                    return "接口返回了空内容";
                }

                if (result.error != null)
                {
                    return $"API报错：{result.error.message}";
                }

                // 返回 AI 的回复
                return result.choices[0].message.content.ToString();
            }
            catch (Exception ex)
            {
                return $"网络请求失败：{ex.Message}";
            }
        }

    }
}