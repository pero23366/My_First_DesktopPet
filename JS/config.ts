// ============================================================
// config.ts —— 配置层
// 只有常量和类型安全的取值函数，不写业务逻辑。
// ============================================================

/** DeepSeek 的接口根地址。V1 只打这一家，不做多供应商切换。 */
export const LLM_BASE_URL = 'https://api.deepseek.com'

/** 对话接口路径，拼在 base 后面。 */
export const LLM_CHAT_PATH = '/chat/completions'

/** 默认模型。deepseek-chat 便宜、够用；想更强可改 deepseek-reasoner。 */
export const LLM_MODEL_DEFAULT = 'deepseek-chat'

/**
 * Key 存 sessionStorage：刷新还在，关标签页即焚。
 * 这是 BYO-Key 方案里"泄露面最小"和"能刷新不重填"之间的折中。
 * 注意：不要改成 localStorage —— 它会跨会话长期驻留，风险大得多。
 */
export const KEY_STORAGE = 'pet.apiKey'

/** 模型名不是秘密，可以放 localStorage。 */
export const MODEL_STORAGE = 'pet.model'

/** 单次回复的最大 token。小沃话少，给多了纯属浪费钱。 */
export const MAX_TOKENS = 200

/** 带多少轮历史。一轮 = 用户 1 条 + 助手 1 条，所以数组长度是这个数 × 2。 */
export const HISTORY_TURNS = 6

/** 对话请求超时。DeepSeek 偶尔慢，给 30 秒。 */
export const CHAT_TIMEOUT_MS = 30000

/** 测试 Key 的超时，比对话短一些。 */
export const TEST_TIMEOUT_MS = 15000

/** 气泡自动隐藏延迟，对标前作 WPF 的 10 秒 DispatcherTimer。 */
export const AUTO_HIDE_DELAY_MS = 10000

/** 用户上传形象的体积上限（原始文件）。超过就提示，不去猜用户想不想等。 */
export const IMAGE_MAX_BYTES = 8 * 1024 * 1024

/** 导出配置的格式版本。桌面端靠它判断认不认识这个文件。 */
export const CONFIG_FORMAT = 'desktop-pet/1'
