<!--
  features/chat/ChatBubble.vue —— 对话框（消息列表 + 收起键）

  职责边界：只负责「把拿到的 messages 画出来」，不持有状态、不发请求。
  props 只读 —— 想改消息必须回到 useChat 里的 add/clear。
  这就是"数据向下流，事件向上走"：子组件不偷改父组件的东西。

  ⚠️ 收起键目前还没接线（第 4 步）。按钮保留是为了让样式和布局与原版一致。
-->
<script setup lang="ts">
import type { Message } from '@/shared/types'

// defineProps 是编译宏，不需要 import；泛型写法直接给 props 定类型
defineProps<{
  messages: Message[]
}>()
</script>

<template>
  <div class="pet__bubble">
    <button class="pet__icon pet__icon--bubble-close" type="button" title="收起对话">✕</button>

    <ul class="pet__log">
      <!-- v-for 只声明"每一条长什么样"，不写"怎么加进去"；
           :key 用稳定 id，否则插入/删除时 Vue 会复用错元素（输入框内容会串行） -->
      <li v-for="m in messages" :key="m.id" :class="`pet__msg pet__msg--${m.from}`">{{ m.text }}</li>
    </ul>
  </div>
</template>
