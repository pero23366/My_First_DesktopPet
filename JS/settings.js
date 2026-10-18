// ============================================================
// settings.js —— 设置面板业务
// 面板开合、自动隐藏开关、清空对话、后端 API 配置（保存 / 测试连接）。
// 地址存在 localStorage 里：改了不用动代码，刷新页面也还在。
// ============================================================

import * as ui from './ui.js'
import { API_DEFAULT, API_STORAGE_KEY } from './config.js'
import { normalizeBase, setBase, checkHealth } from './api.js'

/** 绑定设置面板的所有交互。入口文件调一次即可。 */
export function initSettings() {
  ui.dom.settingsBtn.addEventListener('click', () => {
    ui.dom.settingsPanel.classList.toggle('hidden')
  })

  ui.dom.clearBtn.addEventListener('click', () => {
    ui.clearMessages()
    ui.cancelAutoHide()
  })

  ui.dom.autoHideToggle.addEventListener('change', (event) => {
    ui.setAutoHideEnabled(event.target.checked)
  })

  // 让 ui 里的状态和 HTML 上复选框的初始勾选状态对齐
  ui.setAutoHideEnabled(ui.dom.autoHideToggle.checked)

  loadSavedBase()

  ui.dom.apiSaveBtn.addEventListener('click', onSave)
  ui.dom.apiTestBtn.addEventListener('click', onTest)
}

/** 启动时把上次存的地址灌进输入框，同时同步给接口层 */
function loadSavedBase() {
  // localStorage 只能存字符串，取不到就是 null（不是 undefined）
  const saved = localStorage.getItem(API_STORAGE_KEY)
  const base = saved || API_DEFAULT

  ui.dom.apiBase.value = base
  setBase(base) // 很关键：接口层一开始就得知道打哪个地址

  if (saved) ui.showApiStatus('已保存：' + saved)
}

function onSave() {
  const base = normalizeBase(ui.dom.apiBase.value)

  if (base === '') {
    ui.showApiStatus('地址不能为空', false)
    return
  }

  ui.dom.apiBase.value = base // 回填规整后的结果，让用户看到实际存了什么
  setBase(base)
  localStorage.setItem(API_STORAGE_KEY, base)
  ui.showApiStatus('已保存', true)
}

/** 测的是输入框里当前写的地址（可能还没保存），所以显式传进去 */
async function onTest() {
  const typed = normalizeBase(ui.dom.apiBase.value)

  ui.showApiStatus('连接中…', null)

  const result = await checkHealth(typed || API_DEFAULT)

  if (result.ok) {
    ui.showApiStatus('已连接 · ' + result.status, true)
    return
  }

  ui.showApiStatus(reasonText(result), false)
}

/** 把接口层的结构化失败翻译成人话。翻译放在这一层，api.js 保持"只说事实" */
function reasonText(result) {
  if (result.kind === 'timeout') return '超时（5 秒），后端没响应'
  if (result.kind === 'http') return 'HTTP ' + result.status + '（地址不对或接口不存在）'
  return '连不上，确认后端已启动且允许跨域'
}
