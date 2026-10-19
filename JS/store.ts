// ============================================================
// store.ts —— 运行时状态
// 放"当前生效的值"：Key、模型、人设、当前形象。
// settings 负责往里写，chat 负责往外读，两边谁都不用认识谁。
// ============================================================

import { KEY_STORAGE, LLM_MODEL_DEFAULT, MODEL_STORAGE } from './config'
import { defaultPersona } from './persona'
import type { Persona } from './types'

export const store = {
  /** sessionStorage 里上次填的 Key（刷新还在，关标签页就没了） */
  apiKey: sessionStorage.getItem(KEY_STORAGE) ?? '',
  model: localStorage.getItem(MODEL_STORAGE) ?? LLM_MODEL_DEFAULT,
  persona: defaultPersona() as Persona,
  /** 用户上传的形象（data URL）。null 表示用默认那三张里的一张 */
  imageDataUrl: null as string | null,
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
