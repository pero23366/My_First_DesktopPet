// ============================================================
// types.ts —— 类型定义集中放这里
// 好处：改一处字段名，所有用到的地方都会立刻报错（这才是 TS 的用法）
// ============================================================

/** 发给模型的消息。注意只有 OpenAI 协议里的三种 role，界面上的 "me/pet" 不属于这一层。 */
export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

/** 界面上一条气泡的来源。 */
export type BubbleFrom = 'me' | 'pet'

/** 结构化人设的三个可选项。key 是中文选项名，value 是当前选中的值。 */
export interface PersonaOptions {
  personality: string
  tone: string
  address: string
}

/** 人设 = 名字 + 选项 + 最终拼出来的提示词。 */
export interface Persona {
  name: string
  options: PersonaOptions
  prompt: string
}

/** 导出给桌面版的文件结构，字段名一旦定下就不要改。 */
export interface PetConfigFile {
  format: string
  savedAt: string
  persona: Persona
  /** data:image/...;base64,... —— 没换过形象时为 null */
  image: string | null
}

/** 请求失败的分类。上层拿它翻译成人话，接口层只说事实。 */
export type RequestFailureKind = 'auth' | 'balance' | 'rate' | 'timeout' | 'network' | 'http' | 'empty'
