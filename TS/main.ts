// ============================================================
// main.ts —— 入口 / 装配层
// 只做两件事：按顺序调 init，处理「首屏 ↔ 桌宠舞台」的最外层切换。
//
// 依赖方向（单向，不允许反过来）：
//   config ← store ← chat
//   config ← api ← chat
//   config ← ui ← chat / settings / main
//   main 依赖所有人，没有模块依赖 main
// ============================================================

import { initChat } from './chat'
import { ensurePersona, initSettings } from './settings'
import * as ui from './ui'

// 顺序有讲究：人设要先有默认值，settings 才能把它灌进表单；
// chat 绑定事件最晚，确保发送时读到的 store 已经是初始化过的。
ensurePersona()
initSettings()
initChat()

ui.dom.createPetBtn.addEventListener('click', () => {
  ui.showPet()

  // 只在第一次登场时打招呼，来回切不重复刷屏
  if (ui.dom.chatLog.children.length === 0) {
    ui.addMessage('我在这儿。想聊点什么？', 'pet')
    // 招呼也算一次「有新消息」：开了自动收起的话，从这一刻开始计时
    ui.scheduleAutoHide()
  }

  ui.focusInput()
})

ui.dom.exitBtn.addEventListener('click', () => {
  ui.showHome()
})
