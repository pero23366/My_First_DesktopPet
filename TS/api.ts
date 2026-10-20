// ============================================================
// api.ts —— 接口层（唯一和网络打交道的地方）
// V1 起直接打 DeepSeek，不再经过自己的后端。
// 这一层不碰 DOM、不拼人设、不说人话，只把结果或失败原因交回去。
// ============================================================

import { CHAT_TIMEOUT_MS, LLM_BASE_URL, LLM_CHAT_PATH, MAX_TOKENS, TEST_TIMEOUT_MS } from './config'
import type { ChatMessage, RequestFailureKind } from './types'

/** 失败原因。上层拿 kind 翻译成人话，接口层只报事实。 */
export interface ChatFailure {
  kind: RequestFailureKind
  status?: number
  detail?: string
}

export type ChatOutcome =
  | { ok: true; content: string }
  | { ok: false; failure: ChatFailure }

/** DeepSeek 返回体的最小形状，只声明我们真正用到的字段。 */
interface CompletionResponse {
  choices?: Array<{ message?: { content?: string } }>
  error?: { message?: string }
}

/** 把 HTTP 状态码翻译成失败类别。这一步决定了用户看到的是"key 错了"还是"欠费了"。 */
function classifyStatus(status: number): RequestFailureKind {
  if (status === 401 || status === 403) return 'auth'
  if (status === 402) return 'balance'
  if (status === 429) return 'rate'
  return 'http'
}

interface RequestOptions {
  apiKey: string
  model: string
  timeout?: number
  maxTokens?: number
}

/**
 * 调一次 chat/completions。
 * @returns 成功给 content；失败给结构化 failure，不抛异常 —— 调用方不用写 try/catch 包一层
 */
export async function requestCompletion(
  messages: ChatMessage[],
  options: RequestOptions
): Promise<ChatOutcome> {
  const { apiKey, model, timeout = CHAT_TIMEOUT_MS, maxTokens = MAX_TOKENS } = options

  if (!apiKey.trim()) {
    return { ok: false, failure: { kind: 'auth' } }
  }

  const controller = new AbortController()
  // fetch 不会自己超时，必须自己掐断，否则后端起不来时界面会一直转
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(LLM_BASE_URL + LLM_CHAT_PATH, {
      method: 'POST',
      headers: {
        // Bearer 后面直接跟 key，中间不要多空格
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        stream: false, // V1 先做非流式，流式单独一步再加
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      // 尽量把服务端给的错误信息带回来，方便排查（但不要把它直接显示给用户）
      let detail = ''
      try {
        const body = (await res.json()) as CompletionResponse
        detail = body.error?.message ?? ''
      } catch {
        // 响应不是 JSON 就算了，状态码已经够用
      }
      return { ok: false, failure: { kind: classifyStatus(res.status), status: res.status, detail } }
    }

    const data = (await res.json()) as CompletionResponse
    const content = data.choices?.[0]?.message?.content?.trim() ?? ''

    if (!content) {
      return { ok: false, failure: { kind: 'empty' } }
    }

    return { ok: true, content }
  } catch (err) {
    // AbortError 是我们自己掐的超时，其它一律当网络问题
    const isAbort = err instanceof DOMException && err.name === 'AbortError'
    return { ok: false, failure: { kind: isAbort ? 'timeout' : 'network' } }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 测试 Key 是否有效。
 * DeepSeek 没有健康检查接口，所以真发一句最短的话（max_tokens: 1），
 * 这一步同时验证了「Key 有效」「模型名正确」「网络通」三件事。
 */
export async function testKey(
  apiKey: string,
  model: string
): Promise<{ ok: true } | { ok: false; failure: ChatFailure }> {
  const result = await requestCompletion([{ role: 'user', content: 'hi' }], {
    apiKey,
    model,
    timeout: TEST_TIMEOUT_MS,
    maxTokens: 1,
  })

  // max_tokens: 1 时可能因为截断拿不到 content，只要没报错就算通过
  if (!result.ok && result.failure.kind === 'empty') {
    return { ok: true }
  }

  return result.ok ? { ok: true } : { ok: false, failure: result.failure }
}
