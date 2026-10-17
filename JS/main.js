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
/*最后一条消息之后 10 秒才隐藏  */
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

// ---------- 7. 后端 API 配置 ----------
// 地址存在 localStorage 里：改了不用动代码，刷新页面也还在。
const API_KEY = 'pet.apiBase' // 键名带前缀，避免和别的项目撞车
const API_DEFAULT = 'http://localhost:5003' // 与后端 launchSettings.json 的 http 配置一致

const apiBaseInput = document.querySelector('#apiBase')
const apiTestBtn = document.querySelector('#apiTestBtn')
const apiSaveBtn = document.querySelector('#apiSaveBtn')
const apiStatus = document.querySelector('#apiStatus')

// 统一规整：去掉首尾空格和所有结尾斜杠，否则会拼出 //api/health
function normalizeBase(raw) {
  return raw.trim().replace(/\/+$/, '')
}

function showApiStatus(text, ok) {
  apiStatus.textContent = text
  apiStatus.classList.toggle('pet__api-status--ok', ok === true)
  apiStatus.classList.toggle('pet__api-status--err', ok === false)
}

// localStorage 只能存字符串，取不到就是 null（不是 undefined）
const savedBase = localStorage.getItem(API_KEY)
apiBaseInput.value = savedBase || API_DEFAULT
if (savedBase) showApiStatus('已保存：' + savedBase)

apiSaveBtn.addEventListener('click', () => {
  const base = normalizeBase(apiBaseInput.value)
  if (base === '') {
    showApiStatus('地址不能为空', false)
    return
  }
  apiBaseInput.value = base // 把规整后的结果回填，让用户看到实际存的是什么
  localStorage.setItem(API_KEY, base)
  showApiStatus('已保存', true)
})

// 测试连接：打一个 /api/health，能通就说明地址和后端 CORS 都对
apiTestBtn.addEventListener('click', async () => {
  const base = normalizeBase(apiBaseInput.value)
  if (base === '') {
    showApiStatus('地址不能为空', false)
    return
  }

  showApiStatus('连接中…', null)

  // fetch 本身不会超时，必须自己拿 AbortController 掐断，否则后端起不来时会一直转
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)

  try {
    const res = await fetch(base + '/api/health', { signal: controller.signal })
    if (!res.ok) {
      showApiStatus('HTTP ' + res.status + '（地址不对或接口不存在）', false)
      return
    }
    const data = await res.json()
    showApiStatus('已连接 · ' + (data.status || 'ok'), true)
  } catch (err) {
    // AbortError 是我们自己超时掐的，其它一律当网络/跨域问题
    showApiStatus(
      err.name === 'AbortError' ? '超时（5 秒），后端没响应' : '连不上，确认后端已启动且允许跨域',
      false
    )
  } finally {
    clearTimeout(timer) // 成功/失败都要清，不然定时器会一直挂到 5 秒才结束
  }
})
