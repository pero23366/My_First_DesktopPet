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

  return li // 把这一条返回出去，调用方后面可以就地改它的文字（比如把"…"换成真回复）
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

// ---------- 4. 发消息（真正走后端） ----------
let isSending = false // 防止连按回车重复发同一句

async function send() {
  const text = inputBox.value.trim()
  if (text === '') return // 空消息不发
  if (isSending) return // 上一句还没回来，忽略这次

  addMessage(text, 'me')
  inputBox.value = ''
  scheduleAutoHide()

  // 先把「…」占位放进去，等真回复回来再就地替换 —— 这样用户立刻看到反应，不会以为卡住了
  const pending = addMessage('…', 'pet')
  setBusy(true)

  try {
    pending.textContent = await postChat(text)
  } catch (err) {
    // abort 是我们自己掐的超时，其它基本都是网络 / CORS / 后端没起
    pending.textContent =
      err.name === 'AbortError'
        ? '（想太久了……先不说这个）'
        : '（我连不上后端，去设置里看看 API 地址）'
    console.error('发送失败：', err)
  } finally {
    setBusy(false)
    scheduleAutoHide() // 从「回复到达」这一秒开始重新计时 10 秒
  }
}

// 请求期间锁住输入框和发送键：避免用户连点，也顺带告诉他们"正在处理"
function setBusy(busy) {
  isSending = busy
  inputBox.disabled = busy
  sendBtn.disabled = busy
  if (!busy) inputBox.focus()
}

// POST /api/chat，返回小沃那句话
async function postChat(message) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000) // 后端要是挂了，别让界面永远转

  try {
    const res = await fetch(getApiBase() + '/api/chat', {
      method: 'POST',
      // 带了 Content-Type: application/json 就会触发 CORS 预检（OPTIONS），
      // 后端的 UseCors 必须排在 MapControllers 前面，否则这一步直接失败。
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }), // 键名必须和后端 ChatRequest.Message 对上
      signal: controller.signal,
    })

    if (!res.ok) throw new Error('HTTP ' + res.status)

    const data = await res.json()
    return data.reply // 后端是 Reply，JSON 序列化后就是 reply
  } finally {
    clearTimeout(timer)
  }
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

// 当前生效的后端地址：以输入框里的内容为准，空着就退回默认值。
// 发消息和测试连接都走这一个函数，避免两处各算各的。
function getApiBase() {
  return normalizeBase(apiBaseInput.value) || API_DEFAULT
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
  const base = getApiBase()

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
