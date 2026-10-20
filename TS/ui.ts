// ============================================================
// ui.ts —— 视图层
// 集中管理 DOM，提供"改界面"的小函数。不发请求、不做决策。
// ============================================================

import { AUTO_HIDE_DEFAULT_S } from './config'
import type { BubbleFrom } from './types'

/**
 * querySelector 的类型安全版：找不到就直接抛错。
 * 比到处写 `!` 好 —— 出错时能立刻知道是哪个选择器写挂了，而不是等后面某行报 null。
 */
function must<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector)
  if (!el) throw new Error(`找不到元素：${selector}`)
  return el
}

export const dom = {
  home: must<HTMLElement>('#home'),
  pet: must<HTMLElement>('#pet'),

  bubble: must<HTMLElement>('#bubble'),
  chatLog: must<HTMLUListElement>('#chatLog'),

  createPetBtn: must<HTMLButtonElement>('#createPetBtn'),
  exitBtn: must<HTMLButtonElement>('#exitBtn'),

  inputBox: must<HTMLInputElement>('#inputBox'),
  sendBtn: must<HTMLButtonElement>('#sendBtn'),

  settingsBtn: must<HTMLButtonElement>('#settingsBtn'),
  settingsPanel: must<HTMLElement>('#settingsPanel'),
  settingsCloseBtn: must<HTMLButtonElement>('#settingsCloseBtn'),
  bubbleCloseBtn: must<HTMLButtonElement>('#bubbleCloseBtn'),
  autoHideToggle: must<HTMLInputElement>('#autoHideToggle'),
  autoHideRange: must<HTMLInputElement>('#autoHideRange'),
  autoHideValue: must<HTMLElement>('#autoHideValue'),
  clearBtn: must<HTMLButtonElement>('#clearBtn'),
  exportBtn: must<HTMLButtonElement>('#exportBtn'),

  petImage: must<HTMLImageElement>('#petImage'),
  imageInput: must<HTMLInputElement>('#imageInput'),
  imageName: must<HTMLElement>('#imageName'),
  imageResetBtn: must<HTMLButtonElement>('#imageResetBtn'),

  petName: must<HTMLInputElement>('#petName'),
  selPersonality: must<HTMLSelectElement>('#selPersonality'),
  selTone: must<HTMLSelectElement>('#selTone'),
  selAddress: must<HTMLSelectElement>('#selAddress'),
  genPromptBtn: must<HTMLButtonElement>('#genPromptBtn'),
  personaPrompt: must<HTMLTextAreaElement>('#personaPrompt'),

  apiKey: must<HTMLInputElement>('#apiKey'),
  apiModel: must<HTMLInputElement>('#apiModel'),
  apiTestBtn: must<HTMLButtonElement>('#apiTestBtn'),
  apiStatus: must<HTMLElement>('#apiStatus'),
}

// ---------- 消息气泡 ----------

/** 追加一条消息，返回这一条，调用方可以就地改它的文字（把「…」换成真回复） */
export function addMessage(text: string, from: BubbleFrom): HTMLLIElement {
  const li = document.createElement('li')
  li.className = `pet__msg pet__msg--${from}`
  li.textContent = text // 用 textContent：用户输入不会被当成 HTML 解析

  dom.chatLog.append(li)
  showBubble() // 有新消息就把气泡拉回来（哪怕用户刚手动收起过）
  dom.chatLog.scrollTop = dom.chatLog.scrollHeight

  return li
}

export function clearMessages(): void {
  dom.chatLog.innerHTML = ''
}

// ---------- 输入框 ----------

export function readInput(): string {
  return dom.inputBox.value.trim()
}

export function clearInput(): void {
  dom.inputBox.value = ''
}

export function focusInput(): void {
  dom.inputBox.focus()
}

export function setBusy(busy: boolean): void {
  dom.inputBox.disabled = busy
  dom.sendBtn.disabled = busy
  if (!busy) dom.inputBox.focus()
}

// ---------- 首屏 / 舞台 ----------

export function showPet(): void {
  dom.home.classList.add('hidden')
  dom.pet.classList.remove('hidden')
  showBubble() // 回到舞台时对话框一定在 —— 它是这个页面的主体，不该继承上次的收起状态
}

export function showHome(): void {
  dom.pet.classList.add('hidden')
  closeSettings()
  closeBubble()
  dom.home.classList.remove('hidden')
  clearInput()
}

// ---------- 设置面板开合 ----------

export function openSettings(): void {
  dom.settingsPanel.classList.remove('hidden')
}

export function closeSettings(): void {
  dom.settingsPanel.classList.add('hidden')
}

export function toggleSettings(): void {
  dom.settingsPanel.classList.toggle('hidden')
}

export function isSettingsOpen(): boolean {
  return !dom.settingsPanel.classList.contains('hidden')
}

// ---------- 对话气泡显隐 ----------

export function showBubble(): void {
  dom.bubble.classList.remove('hidden')
}

/** 收起气泡，但要顺手撤掉定时器 —— 否则它会在已经藏起来之后再多"藏"一次 */
export function closeBubble(): void {
  cancelAutoHide()
  dom.bubble.classList.add('hidden')
}

// ---------- 形象 ----------

export function setPetImage(src: string): void {
  dom.petImage.src = src
}

export function setImageName(text: string): void {
  dom.imageName.textContent = text
}

// ---------- 状态行 ----------

/** @param ok true 绿 / false 红 / null 灰（进行中） */
export function showStatus(text: string, ok: boolean | null): void {
  dom.apiStatus.textContent = text
  dom.apiStatus.classList.toggle('pet__api-status--ok', ok === true)
  dom.apiStatus.classList.toggle('pet__api-status--err', ok === false)
}

// ---------- 气泡自动收起（对标 WPF 的 DispatcherTimer）----------

/**
 * 默认「不收起」：对话框是桌宠的主体，一进来就看到历史才符合直觉。
 * 想让它自己收起来，去设置里勾上并拖时长（10~60 秒）。
 */
let autoHideEnabled = false
let autoHideDelayMs = AUTO_HIDE_DEFAULT_S * 1000
let hideTimer: number | null = null

export function setAutoHideEnabled(enabled: boolean): void {
  autoHideEnabled = enabled
  if (!enabled) {
    cancelAutoHide()
    return
  }
  // 刚打开就按新时长排一次，不用等用户再发一条消息才生效
  scheduleAutoHide()
}

/** 改时长。正在计时的话立刻按新时长重排，否则用户会以为"改了没用" */
export function setAutoHideDelay(seconds: number): void {
  autoHideDelayMs = seconds * 1000
  if (autoHideEnabled) scheduleAutoHide()
}

export function scheduleAutoHide(): void {
  cancelAutoHide()
  if (!autoHideEnabled) return

  hideTimer = window.setTimeout(() => {
    dom.bubble.classList.add('hidden')
  }, autoHideDelayMs)
}

export function cancelAutoHide(): void {
  if (hideTimer !== null) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

// ---------- 下载文件 ----------

/**
 * 把对象存成本地文件。
 * 用 Blob + a[download] 而不是开新窗口 —— 不依赖任何后端，也不会有弹窗被拦。
 */
export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()

  // 立刻回收，否则这份数据会一直占着内存直到刷新
  URL.revokeObjectURL(url)
}
