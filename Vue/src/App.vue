<!--
  App.vue —— 只做两件事：①现在在哪一屏 ②谁往哪一屏发事件

  刻意保持"薄"：它不该知道消息怎么渲染、设置面板长什么样。
  根组件一旦开始写业务，所有功能的改动都会汇到这里变成冲突。
-->
<script setup lang="ts">
import { ref } from 'vue'
import HomeScreen from '@/features/home/HomeScreen.vue'
import PetStage from '@/features/pet/PetStage.vue'
import ChatBubble from '@/features/chat/ChatBubble.vue'
import { useChat } from '@/features/chat/useChat'

// 全页面唯一的"导航状态"
const screen = ref<'home' | 'pet'>('home')

// 对话状态在这里创建一次，自己留 messages、把 add/clear 也用得上；
// 拆解出来写是为了在模板里直接写 messages（setup 顶层绑定会自动解包 ref）
const { messages, add } = useChat()

function enterPet(): void {
  screen.value = 'pet'
  // 只在第一次登场时打招呼，来回切不重复刷屏
  if (messages.value.length === 0) {
    add('我在这儿。想聊点什么？', 'pet')
  }
}

function backHome(): void {
  screen.value = 'home'
}
</script>

<template>
  <HomeScreen v-show="screen === 'home'" @enter="enterPet" />

  <!-- 桌宠舞台：原版是 class="pet hidden" 靠 .hidden 藏，
       这里去掉 .hidden、改用 v-show —— 否则 !important 会和 v-show 的内联 display 打架 -->
  <section v-show="screen === 'pet'" class="pet">
    <ChatBubble :messages="messages" />
    <PetStage @exit="backHome" />
  </section>
</template>
