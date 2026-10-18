// ============================================================
// api.js —— 接口层（唯一和网络打交道的地方）
// 这一层不碰 DOM、不弹提示、不认识"气泡"是什么。
// 它只负责：拼地址、发请求、把结果或错误原样交回去。
// 好处：以后换 fetch 为别的库、或者加统一鉴权，只改这一个文件。
// ============================================================

import { API_DEFAULT, CHAT_TIMEOUT_MS, HEALTH_TIMEOUT_MS } from './config.js'

// 模块内部状态：当前生效的后端地址。外部只能通过 setBase/getBase 动它。
let currentBase = API_DEFAULT

/** 去掉首尾空格和结尾所有斜杠，否则会拼出 http://host//api/health */
export function normalizeBase(raw) {
  return String(raw ?? '')
    .trim()
    .replace(/\/+$/, '')
}

/** 设置后端地址。传空值会退回默认地址，避免把界面搞成"没有地址可用"。 */
export function setBase(raw) {
  currentBase = normalizeBase(raw) || API_DEFAULT
  return currentBase
}

export function getBase() {
  return currentBase
}

/**
 * 底层请求。所有对外接口都走它，这样超时和 header 只写一遍。
 * @param {string} path 以 / 开头的路径，如 '/api/chat'
 * @param {{method?: string, body?: unknown, timeout?: number, base?: string}} options
 */
async function request(path, { method = 'GET', body, timeout = CHAT_TIMEOUT_MS, base } = {}) {
  const target = normalizeBase(base) || currentBase
  const controller = new AbortController()
  // fetch 本身不会超时，必须自己掐断
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    return await fetch(target + path, {
      method,
      // 只有带 body 才加 Content-Type；一加就会触发 CORS 预检，后端 UseCors 必须放行
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer) // 成功或失败都要清，不然定时器会挂到超时才结束
  }
}

/**
 * 和小沃说话。
 * @param {string} message
 * @returns {Promise<string>} 小沃的回答
 */
export async function postChat(message) {
  const res = await request('/api/chat', {
    method: 'POST',
    body: { message }, // 键名必须和后端 ChatRequest.Message 对上
  })

  if (!res.ok) throw new Error('HTTP ' + res.status)

  const data = await res.json()
  return data.reply // 后端的 Reply 序列化后就是 reply
}

/**
 * 探活。不抛异常，统一返回结构化结果，让上层自己决定怎么显示。
 * @param {string} [rawBase] 想临时测某个地址时传进来，不传就测当前地址
 * @returns {Promise<{ok: true, status: string} | {ok: false, kind: 'http'|'timeout'|'network', status?: number}>}
 */
export async function checkHealth(rawBase) {
  try {
    const res = await request('/api/health', {
      base: rawBase,
      timeout: HEALTH_TIMEOUT_MS,
    })

    if (!res.ok) {
      return { ok: false, kind: 'http', status: res.status }
    }

    const data = await res.json()
    return { ok: true, status: data.status || 'ok' }
  } catch (err) {
    // AbortError 是我们自己掐的超时，其它一律当网络 / 跨域问题
    return { ok: false, kind: err.name === 'AbortError' ? 'timeout' : 'network' }
  }
}
