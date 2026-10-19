// ============================================================
// settings.ts —— 设置面板业务
// 面板开合、Key / 模型、人设编辑、形象上传、导出配置。
// ============================================================

import { CONFIG_FORMAT, IMAGE_MAX_BYTES } from './config'
import { testKey } from './api'
import { PERSONA_GROUPS, buildPrompt, defaultPersona } from './persona'
import { saveKey, saveModel, savePersona, store } from './store'
import { clearHistory } from './chat'
import type { PetConfigFile, PersonaOptions } from './types'
import * as ui from './ui'

/** 默认形象。换掉三帧动画之后，只用这一张。 */
const DEFAULT_IMAGE = './image/idle-1.png'

export function initSettings(): void {
  ui.dom.settingsBtn.addEventListener('click', () => {
    ui.dom.settingsPanel.classList.toggle('hidden')
  })

  initApiSection()
  initPersonaSection()
  initImageSection()
  initMiscSection()
}

// ---------- API：Key + 模型 ----------

function initApiSection(): void {
  ui.dom.apiKey.value = store.apiKey
  ui.dom.apiModel.value = store.model

  // 边输边存：这样刷新页面不用重填，关掉标签页又自动消失
  ui.dom.apiKey.addEventListener('input', () => saveKey(ui.dom.apiKey.value))
  ui.dom.apiModel.addEventListener('change', () => saveModel(ui.dom.apiModel.value))

  if (store.apiKey) {
    ui.showStatus('已填入 Key（只保存在本标签页）', true)
  } else {
    ui.showStatus('还没填 Key', null)
  }

  ui.dom.apiTestBtn.addEventListener('click', () => void onTestKey())
}

async function onTestKey(): Promise<void> {
  const key = ui.dom.apiKey.value.trim()
  const model = ui.dom.apiModel.value.trim()

  if (!key) {
    ui.showStatus('先填 Key 再测试', false)
    return
  }

  ui.showStatus('测试中…', null)
  saveKey(key)
  saveModel(model)

  const result = await testKey(key, model)

  if (result.ok) {
    ui.showStatus(`Key 可用 · ${model}`, true)
    return
  }

  ui.showStatus(failureText(result.failure.kind, result.failure.status), false)
}

function failureText(kind: string, status?: number): string {
  if (kind === 'auth') return 'Key 无效（401）'
  if (kind === 'balance') return '账户余额不足（402）'
  if (kind === 'rate') return '请求太频繁（429），等会儿再试'
  if (kind === 'timeout') return '超时了，网络太慢或代理没通'
  if (kind === 'network') return '连不上 api.deepseek.com，检查网络'
  return `请求失败（${status ?? '未知'}）`
}

// ---------- 人设：选项 → 提示词 ----------

function initPersonaSection(): void {
  // 选项用数据生成，不写死在 HTML 里 —— 以后加一个性格只改 persona.ts
  fillSelect(ui.dom.selPersonality, 'personality')
  fillSelect(ui.dom.selTone, 'tone')
  fillSelect(ui.dom.selAddress, 'address')

  ui.dom.petName.value = store.persona.name
  ui.dom.personaPrompt.value = store.persona.prompt

  ui.dom.genPromptBtn.addEventListener('click', () => {
    regeneratePrompt()
    ui.showStatus('提示词已重新生成', true)
  })

  // 手改提示词要立刻生效：人设文本才是最终事实，选项只是生成它的快捷方式
  ui.dom.personaPrompt.addEventListener('input', () => {
    savePersona({ ...store.persona, prompt: ui.dom.personaPrompt.value })
  })

  ui.dom.petName.addEventListener('input', () => {
    savePersona({ ...store.persona, name: ui.dom.petName.value })
  })
}

function fillSelect(select: HTMLSelectElement, key: keyof PersonaOptions): void {
  const group = PERSONA_GROUPS.find((g) => g.key === key)
  if (!group) return

  select.innerHTML = ''
  for (const value of group.options) {
    const option = document.createElement('option')
    option.value = value
    option.textContent = value
    if (value === store.persona.options[key]) option.selected = true
    select.append(option)
  }
  // 注意：这里故意不监听 change 自动重拼提示词。
  // 用户可能已经手改过提示词，改个下拉就把它冲掉，是最让人恼火的一种"贴心"。
  // 想重新生成，点「生成提示词」按钮。
}

/** 按当前选项拼提示词，并回写到 textarea + store */
function regeneratePrompt(): void {
  const options: PersonaOptions = {
    personality: ui.dom.selPersonality.value,
    tone: ui.dom.selTone.value,
    address: ui.dom.selAddress.value,
  }

  const name = ui.dom.petName.value.trim() || '小沃'
  const prompt = buildPrompt(name, options)

  ui.dom.personaPrompt.value = prompt
  savePersona({ name, options, prompt })
}

// ---------- 形象上传 ----------

function initImageSection(): void {
  ui.setImageName('默认形象')

  ui.dom.imageInput.addEventListener('change', () => {
    const file = ui.dom.imageInput.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      ui.setImageName('这个文件不是图片')
      return
    }
    if (file.size > IMAGE_MAX_BYTES) {
      ui.setImageName(`图片太大了（上限 ${IMAGE_MAX_BYTES / 1024 / 1024}MB）`)
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      store.imageDataUrl = dataUrl
      ui.setPetImage(dataUrl)
      ui.setImageName(file.name)
    }
    reader.onerror = () => ui.setImageName('读取失败，换一张试试')
    // 转成 data URL 而不是 ObjectURL：导出配置时要内嵌进 JSON，
    // ObjectURL 一出页面就失效，没法写进文件
    reader.readAsDataURL(file)
  })

  ui.dom.imageResetBtn.addEventListener('click', () => {
    store.imageDataUrl = null
    ui.setPetImage(DEFAULT_IMAGE)
    ui.setImageName('默认形象')
    ui.dom.imageInput.value = ''
  })
}

// ---------- 其他 ----------

function initMiscSection(): void {
  ui.dom.autoHideToggle.addEventListener('change', () => {
    ui.setAutoHideEnabled(ui.dom.autoHideToggle.checked)
  })
  ui.setAutoHideEnabled(ui.dom.autoHideToggle.checked)

  ui.dom.clearBtn.addEventListener('click', () => {
    ui.clearMessages()
    clearHistory()
    ui.cancelAutoHide()
  })

  ui.dom.exportBtn.addEventListener('click', onExport)
}

function onExport(): void {
  const persona = store.persona

  const file: PetConfigFile = {
    format: CONFIG_FORMAT,
    savedAt: new Date().toISOString(),
    persona: {
      name: persona.name.trim() || '小沃',
      options: { ...persona.options },
      // 存最终拼好的文本，不存选项：桌面端不依赖网页这边的拼装规则
      prompt: ui.dom.personaPrompt.value,
    },
    image: store.imageDataUrl,
  }

  const safeName = file.persona.name.replace(/[\\/:*?"<>|]/g, '_')
  ui.downloadJson(`${safeName}.pet.json`, file)
  ui.showStatus('配置已导出', true)
}

/** 第一次进入时，把默认人设灌进 store（避免别处拿到空值） */
export function ensurePersona(): void {
  if (!store.persona.prompt) {
    savePersona(defaultPersona())
  }
}
