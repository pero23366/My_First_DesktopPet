// 小步 2：点「生成桌宠」→ 一只静态小鲨鱼出现，并带一套最小交互。
// 没有动画、没有后端，所有状态都只活在这个页面里。

// ---------- 1. 先把要操作的节点一次性抓齐 ----------
// 好处：DOM 只查一次，回调里直接用变量，也顺手能看出这步一共动了哪些元素。
const home = document.querySelector('#home')
const pet = document.querySelector('#pet')
const bubble = document.querySelector('#bubble')
const chatLog = document.querySelector('#chatLog')

const createPetBtn = document.querySelector('#createPetBtn')
const exitBtn = document.querySelector('#exitBtn')
const inputBox = document.querySelector('#inputBox')
const sendBtn = document.querySelector('#sendBtn')

const settingsBtn = document.querySelector('#settingsBtn')
const settingsPanel = document.querySelector('#settingsPanel')
const autoHideToggle = document.querySelector('#autoHideToggle')
const clearBtn = document.querySelector('#clearBtn')

// ---------- 2. 小工具：往对话框里追加一条消息 ----------
function addMessage(text, from) {
  const li = document.createElement('li')
  li.className = 'pet__msg pet__msg--' + from // from 只传 'me' 或 'pet'
  li.textContent = text // 用 textContent 而不是 innerHTML：用户输入不会被当成标签解析
  chatLog.append(li)

  bubble.classList.remove('hidden') // 有新消息就把气泡拉回来
  chatLog.scrollTop = chatLog.scrollHeight // 滚到底，新消息永远看得见
}

// ---------- 3. 生成 / 退出 ----------
createPetBtn.addEventListener('click', () => {
  home.classList.add('hidden')
  pet.classList.remove('hidden')

  // 只在小鲨鱼第一次登场时说一句，来回切不重复刷屏
  if (chatLog.children.length === 0) {
    addMessage('我在这儿。想聊点什么？', 'pet')
  }

  inputBox.focus()
})

exitBtn.addEventListener('click', () => {
  pet.classList.add('hidden')
  settingsPanel.classList.add('hidden')
  home.classList.remove('hidden')
  inputBox.value = ''
  clearTimeout(hideTimer)
})

// ---------- 4. 发消息 ----------
function send() {
  const text = inputBox.value.trim()
  if (text === '') return // 空消息不发

  addMessage(text, 'me')
  inputBox.value = ''
  inputBox.focus()

  // 后端还没接，先给一句固定回复占位。接入后这里换成 fetch。
  addMessage('（这是占位回复，等后端接上就换成真的）', 'pet')

  scheduleAutoHide()
}

sendBtn.addEventListener('click', send)

inputBox.addEventListener('keydown', (event) => {
  // 中文输入法还在选词时按回车，不应该发送 —— 前作 WPF 的经典坑
  if (event.isComposing) return
  if (event.key === 'Enter') send()
})

// ---------- 5. 设置面板 ----------
settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.toggle('hidden')
})

clearBtn.addEventListener('click', () => {
  chatLog.innerHTML = ''
})

// ---------- 6. 气泡自动隐藏（对应 WPF 里的 DispatcherTimer 10 秒）----------
let hideTimer = null

function scheduleAutoHide() {
  clearTimeout(hideTimer) // 先撤销上一次，避免越叠越多
  if (!autoHideToggle.checked) return
  hideTimer = setTimeout(() => {
    bubble.classList.add('hidden')
  }, 10000)
}
