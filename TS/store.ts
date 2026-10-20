// ============================================================
// store.ts —— 运行时状态
// 放"当前生效的值"：Key、模型、人设、当前形象。
// settings 负责往里写，chat 负责往外读，两边谁都不用认识谁。
// ============================================================

import {
  AUTO_HIDE_DEFAULT_S,
  AUTO_HIDE_STORAGE,
  KEY_STORAGE,
  LLM_MODEL_DEFAULT,
  MODEL_STORAGE,
  clampAutoHideSeconds,
} from './config'
import { defaultPersona } from './persona'
import type { Persona } from './types'

/** 气泡自动收起的设置。enabled 默认 false = 对话框一直留在那。 */
export interface AutoHideSetting {
  enabled: boolean
  seconds: number
}

/** 读 localStorage，读坏了就退回默认值，不让一条脏数据把整个页面搞崩。 */
function loadAutoHide(): AutoHideSetting {
  const fallback: AutoHideSetting = { enabled: false, seconds: AUTO_HIDE_DEFAULT_S }

  try {
    const raw = localStorage.getItem(AUTO_HIDE_STORAGE)
    if (!raw) return fallback

    const parsed = JSON.parse(raw) as Partial<AutoHideSetting>
    return {
      // 只有明确写了 true 才算开，避免存了个字符串 "false" 被当成真
      enabled: parsed.enabled === true,
      seconds: clampAutoHideSeconds(Number(parsed.seconds)),
    }
  } catch {
    return fallback
  }
}

export const store = {
  /** sessionStorage 里上次填的 Key（刷新还在，关标签页就没了） */
  apiKey: sessionStorage.getItem(KEY_STORAGE) ?? '',
  model: localStorage.getItem(MODEL_STORAGE) ?? LLM_MODEL_DEFAULT,
  persona: defaultPersona() as Persona,
  /** 用户上传的形象（data URL）。null 表示用默认那三张里的一张 */
  imageDataUrl: null as string | null,
  /** 对话气泡要不要自动收起、多少秒收起 */
  autoHide: loadAutoHide() as AutoHideSetting,
}

/** 改一部分算一部分：调用方只需要说自己关心的字段 */
export function saveAutoHide(patch: Partial<AutoHideSetting>): void {
  const next: AutoHideSetting = {
    enabled: patch.enabled ?? store.autoHide.enabled,
    seconds: clampAutoHideSeconds(patch.seconds ?? store.autoHide.seconds),
  }

  store.autoHide = next
  localStorage.setItem(AUTO_HIDE_STORAGE, JSON.stringify(next))
}

/** 存 Key。传空字符串表示清除 —— 顺手把 sessionStorage 里的也删掉。 */
export function saveKey(raw: string): void {
  const key = raw.trim()
  store.apiKey = key

  if (key) {
    sessionStorage.setItem(KEY_STORAGE, key)
  } else {
    sessionStorage.removeItem(KEY_STORAGE)
  }
}

export function saveModel(raw: string): void {
  const model = raw.trim() || LLM_MODEL_DEFAULT
  store.model = model
  localStorage.setItem(MODEL_STORAGE, model)
}

export function savePersona(persona: Persona): void {
  store.persona = persona
}
