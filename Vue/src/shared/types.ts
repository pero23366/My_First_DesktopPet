// ============================================================
// shared/types.ts —— 跨功能共用的「形状」
//
// 为什么单独放：chat 造消息、pet 显示消息、以后 settings 可能要导出消息，
// 三处都要知道"一条消息长什么样"。类型放在任何一方都会被另外两方反向依赖。
//
// 这一层是叶子：它不 import 任何人，谁都可以 import 它。
// ============================================================

/** 一条消息是谁说的。取值直接和 CSS 类名对齐：.pet__msg--me / .pet__msg--pet */
export type BubbleFrom = 'me' | 'pet'

export interface Message {
  /** 稳定自增 id。用它当 v-for 的 key，不要用数组下标 */
  id: number
  text: string
  from: BubbleFrom
}
