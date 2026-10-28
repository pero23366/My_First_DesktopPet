// ============================================================
// features/chat/useChat.ts —— 对话状态与动作（composable）
//
// 这是一个「组合式函数」：它不渲染任何东西，只返回一堆 ref 和函数。
// 好处是同一份状态可以被任意组件拿到，而且不需要 Pinia —— 现在只有一个地方用，
// 引入全局状态库是"为将来的假设付现在的成本"。
//
// 状态的所有者必须唯一：由 App.vue 调一次 useChat()，再把结果传下去。
// 如果 ChatBubble 和 PetStage 各调一次，就会出现两份互不相干的消息数组
// —— 这是新手在 composable 上最容易踩的坑。
// ============================================================

import { ref } from 'vue'
import type { BubbleFrom, Message } from '@/shared/types'

export function useChat() {
  // ref<Message[]>：数组本身是响应式的，push/splice 都会被追踪
  const messages = ref<Message[]>([])

  let nextId = 1

  function add(text: string, from: BubbleFrom): void {
    messages.value.push({ id: nextId++, text, from })
  }

  function clear(): void {
    messages.value = []
    nextId = 1
  }

  return { messages, add, clear }
}

/** 把"useChat 返回的东西"做成一个类型，方便往下传 props 时直接标注 */
export type ChatStore = ReturnType<typeof useChat>
