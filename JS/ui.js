// ============================================================
// ui.js —— 视图层
// 只做两件事：把 DOM 节点集中管理起来；提供"改界面"的小函数。
// 这一层不发请求、不懂业务，只认「要显示什么」。
// 对应 CSS 里的 common.css：任何功能都能拿来就用。
// ============================================================

import { AUTO_HIDE_DELAY_MS } from './config.js'

const $ = (selector) => document.querySelector(selector)

/**
 * 全站用到的节点，在这里一次性抓齐。
 * 好处：① DOM 只查一次；② 以后改 id，只需改这一处；
 *      ③ 其它模块 `ui.dom.xxx` 一眼就知道动的是哪个元素。
 */
export const dom = {
  home: $('#home'),
  pet: $('#pet'),

  bubble: $('#bubble'),
  chatLog: $('#chatLog'),

  createPetBtn: $('#createPetBtn'),
  exitBtn: $('#exitBtn'),

  inputBox: $('#inputBox'),
  sendBtn: $('#sendBtn'),

  settingsBtn: $('#settingsBtn'),
  settingsPanel: $('#settingsPanel'),
  autoHideToggle: $('#autoHideToggle'),
  clearBtn: $('#clearBtn'),

  apiBase: $('#apiBase'),
  apiTestBtn: $('#apiTestBtn'),
  apiSaveBtn: $('#apiSaveBtn'),
  apiStatus: $('#apiStatus'),
}

// ---------- 消息气泡 ----------

/**
 * 往对话框里追加一条消息。
 * @param {string} text
 * @param {'me'|'pet'} from
 * @returns {HTMLLIElement} 返回这一条，调用方后面可以就地改文字（比如把「…」换成真回复）
 */
export function addMessage(text, from) {
  const li = document.createElement('li')
  li.className = 'pet__msg pet__msg--' + from
  li.textContent = text // 用 textContent：用户输入不会被当成 HTML 解析（防 XSS）

  dom.chatLog.append(li)
  dom.bubble.classList.remove('hidden') // 有新消息就把气泡拉回来
  dom.chatLog.scrollTop = dom.chatLog.scrollHeight // 滚到底，新消息永远看得见

  return li
}

export function clearMessages() {
  dom.chatLog.innerHTML = ''
}

// ---------- 输入框 ----------

export function readInput() {
  return dom.inputBox.value.trim()
}

export function clearInput() {
  dom.inputBox.value = ''
}

export function focusInput() {
  dom.inputBox.focus()
}

/** 请求期间锁住输入框和发送键：防连点，也顺带告诉用户「正在处理」 */
export function setBusy(busy) {
  dom.inputBox.disabled = busy
  dom.sendBtn.disabled = busy
  if (!busy) dom.inputBox.focus()
}

// ---------- 首屏 / 舞台切换 ----------

export function showPet() {
  dom.home.classList.add('hidden')
  dom.pet.classList.remove('hidden')
}

export function showHome() {
  dom.pet.classList.add('hidden')
  dom.settingsPanel.classList.add('hidden')
  dom.home.classList.remove('hidden')
  clearInput()
}

// ---------- 气泡自动隐藏（对标 WPF 的 DispatcherTimer 10 秒）----------

let hideTimer = null
let autoHideEnabled = true

/** 开关自动隐藏。设置面板的复选框通过它生效。 */
export function setAutoHideEnabled(enabled) {
  autoHideEnabled = Boolean(enabled)
  if (!autoHideEnabled) cancelAutoHide()
}

/** 每次有新消息就调一次：先撤销上一次，再重新计时 */
export function scheduleAutoHide() {
  cancelAutoHide() // 不清掉上一次，定时器会越叠越多
  if (!autoHideEnabled) return

  hideTimer = setTimeout(() => {
    dom.bubble.classList.add('hidden')
  }, AUTO_HIDE_DELAY_MS)
}

export function cancelAutoHide() {
  clearTimeout(hideTimer)
  hideTimer = null
}

// ---------- 设置面板里的状态行 ----------

/**
 * @param {string} text
 * @param {boolean|null} ok true 绿 / false 红 / null 灰（进行中）
 */
export function showApiStatus(text, ok) {
  dom.apiStatus.textContent = text
  dom.apiStatus.classList.toggle('pet__api-status--ok', ok === true)
  dom.apiStatus.classList.toggle('pet__api-status--err', ok === false)
}
