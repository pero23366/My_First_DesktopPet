// ============================================================
// main.js —— 入口 / 装配层
// 这里不写业务，只负责两件事：
//   1. 把各模块的初始化函数按顺序调一遍；
//   2. 处理「首屏 ↔ 桌宠舞台」这个最外层的切换。
//
// 模块依赖是单向的，不要反过来：
//   config ← api ← chat
//   config ← ui ← chat / settings
//   main 依赖所有人，但没有任何模块依赖 main。
// ============================================================

import * as ui from './ui.js'
import { initChat } from './chat.js'
import { initSettings } from './settings.js'

// 先设置、后对话：initSettings 会把后端地址同步给 api.js，
// 顺序反了的话，用户一上来发的第一句会打到默认地址上。
initSettings()
initChat()

// ---------- 首屏 ↔ 舞台 ----------

ui.dom.createPetBtn.addEventListener('click', () => {
  ui.showPet()

  // 只在小沃第一次登场时说一句，来回切不重复刷屏
  if (ui.dom.chatLog.children.length === 0) {
    ui.addMessage('我在这儿。想聊点什么？', 'pet')
  }

  ui.focusInput()
})

ui.dom.exitBtn.addEventListener('click', () => {
  ui.showHome() // 内部会顺手关掉设置面板、清空输入框
  ui.cancelAutoHide()
})
