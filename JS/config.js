// ============================================================
// config.js —— 配置层
// 只放「数值和常量」，一行逻辑都不写。
// 对应 CSS 里的 base.css：改主题色去那里，改超时时间来这里。
// ============================================================

/** 后端默认地址。与后端 launchSettings.json 里 http profile 的端口一致。 */
export const API_DEFAULT = 'http://localhost:5003'

/** localStorage 的键名。带项目前缀，避免和别的网页撞车。 */
export const API_STORAGE_KEY = 'pet.apiBase'

/** 发对话请求的超时（毫秒）。后端挂了也不会让界面一直转。 */
export const CHAT_TIMEOUT_MS = 15000

/** 健康检查的超时，比对话短：只是探活，没必要等太久。 */
export const HEALTH_TIMEOUT_MS = 5000

/** 气泡自动隐藏的延迟，对标前作 WPF 里的 10 秒 DispatcherTimer。 */
export const AUTO_HIDE_DELAY_MS = 10000
