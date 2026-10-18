// ============================================================
// chat.js —— 对话业务
// 「发消息」这件事的完整流程：读输入 → 上屏 → 请求 → 回填 → 解锁。
// 它只依赖 ui（怎么显示）和 api（怎么请求），不知道地址从哪来。
// ============================================================

import * as ui from './ui.js'
import { postChat } from './api.js'

let isSending = false // 防止连按回车重复发同一句

/** 绑定发送相关的 DOM 事件。入口文件调一次即可。 */
export function initChat() {
  ui.dom.sendBtn.addEventListener('click', send)

  ui.dom.inputBox.addEventListener('keydown', (event) => {
    // 中文输入法还在选词时按回车，那是「上屏」不是「发送」—— 前作 WPF 的经典坑
    if (event.isComposing) return
    if (event.key === 'Enter') send()
  })
}

async function send() {
  const text = ui.readInput()
  if (text === '') return // 空消息不发
  if (isSending) return // 上一句还没回来，忽略这次

  ui.addMessage(text, 'me')
  ui.clearInput()
  ui.scheduleAutoHide()

  // 先占位再替换：用户立刻看到反应，不会以为卡住了
  const pending = ui.addMessage('…', 'pet')
  setSending(true)

  try {
    pending.textContent = await postChat(text)
  } catch (err) {
    // AbortError 是我们自己掐的超时，其它基本都是网络 / CORS / 后端没起
    pending.textContent =
      err.name === 'AbortError'
        ? '（想太久了……先不说这个）'
        : '（我连不上后端，去设置里看看 API 地址）'
    console.error('发送失败：', err)
  } finally {
    setSending(false)
    ui.scheduleAutoHide() // 从「回复到达」这一秒重新计时 10 秒
  }
}

function setSending(value) {
  isSending = value
  ui.setBusy(value)
}
