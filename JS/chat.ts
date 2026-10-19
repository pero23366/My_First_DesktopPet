// ============================================================
// chat.ts —— 对话业务
// 完整流程：读输入 → 上屏 → 拼 messages → 请求 → 回填 → 解锁。
// 只依赖 store（数据）、api（网络）、ui（显示）。
// ============================================================

import { HISTORY_TURNS } from './config'
import { requestCompletion, type ChatFailure } from './api'
import { store } from './store'
import type { ChatMessage } from './types'
import * as ui from './ui'

/** 对话历史。只放 user / assistant，system 每次请求时临时拼在最前面。 */
const history: ChatMessage[] = []

let isSending = false

export function initChat(): void {
  ui.dom.sendBtn.addEventListener('click', send)

  ui.dom.inputBox.addEventListener('keydown', (event: KeyboardEvent) => {
    // 中文输入法还在选词时按回车，那是"上屏"不是"发送"
    if (event.isComposing) return
    if (event.key === 'Enter') void send()
  })
}

export function clearHistory(): void {
  history.length = 0
}

async function send(): Promise<void> {
  const text = ui.readInput()
  if (text === '') return
  if (isSending) return

  ui.addMessage(text, 'me')
  ui.clearInput()
  ui.scheduleAutoHide()

  // 没填 Key 就别白跑一次请求，直接把用户送到该去的地方
  if (!store.apiKey) {
    ui.addMessage('（我还没拿到说话的能力，去设置里填一下 Key）', 'pet')
    ui.dom.settingsPanel.classList.remove('hidden')
    ui.focusInput()
    return
  }

  // 先占位再替换：用户立刻看到反应，不会以为卡住了
  const pending = ui.addMessage('…', 'pet')
  setSending(true)

  // system 只带一次，放在最前面；后面跟着最近的若干轮历史
  const messages: ChatMessage[] = [
    { role: 'system', content: store.persona.prompt },
    ...history.slice(-HISTORY_TURNS * 2),
    { role: 'user', content: text },
  ]

  const result = await requestCompletion(messages, {
    apiKey: store.apiKey,
    model: store.model,
  })

  if (result.ok) {
    pending.textContent = result.content
    // 只有成功的对话才进历史 —— 失败的占位文案不该被模型当成自己说过的话
    history.push({ role: 'user', content: text })
    history.push({ role: 'assistant', content: result.content })
  } else {
    pending.textContent = failureText(result.failure)
    console.error('请求失败：', result.failure)
  }

  setSending(false)
  ui.scheduleAutoHide()
}

function setSending(value: boolean): void {
  isSending = value
  ui.setBusy(value)
}

/** 把失败类别翻译成小沃能说的话。翻译在这一层，api 层只说事实。 */
function failureText(failure: ChatFailure): string {
  switch (failure.kind) {
    case 'auth':
      return '（Key 好像不对，去设置里看一下）'
    case 'balance':
      return '（账户没钱了，充一点我才能继续说）'
    case 'rate':
      return '（说得太快了，等一会儿再来）'
    case 'timeout':
      return '（想太久了……先不说这个）'
    case 'network':
      return '（连不上 DeepSeek，检查一下网络）'
    case 'empty':
      return '（它没说话）'
    default:
      return `（服务端出错了${failure.status ? ` ${failure.status}` : ''}）`
  }
}
