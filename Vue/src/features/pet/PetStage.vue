<!--
  features/pet/PetStage.vue —— 桌宠舞台（形象 + 底部控件 + 设置面板）

  对照原版：原版这一整块是 index.html 里写死的静态结构，靠 TS/ui.ts 用
  querySelector 一个个抓出来操作。现在它只是一个组件，做的事只有"把形状画出来"。

  emit 出口：
    exit → 父组件决定是回首屏还是别的（本组件不关心）
-->
<script setup lang="ts">
import SettingsPanel from '@/features/settings/SettingsPanel.vue'
import petImage from '@img/idle-1.png'

defineEmits<{
  exit: []
}>()
</script>

<template>
  <div class="pet__stage">
    <!-- 图片用 import 拿到的 URL，而不是写 '../image/x.png'。
         理由：写在模板里的相对路径是按「当前 .vue 文件」解析的，
         组件一旦挪目录就会 404；import 由 Vite 在编译期解析，挪到哪都对。 -->
    <img class="pet__image" :src="petImage" alt="桌宠形象" />

    <div class="pet__controls">
      <button class="pet__btn" type="button">⚙ 设置</button>

      <div class="pet__row">
        <button class="pet__icon pet__icon--exit" type="button" title="退出" @click="$emit('exit')">✕</button>
        <input class="pet__input" type="text" maxlength="200" placeholder="说点什么…" />
        <button class="pet__icon pet__icon--send" type="button" title="发送">↑</button>
      </div>

      <!-- 设置面板：第 5 步之前先用手写的 .hidden 藏起来（.hidden 带 !important，
           能压过组件根元素的 display，等接 v-show 时再把它去掉） -->
      <SettingsPanel class="hidden" />
    </div>
  </div>
</template>
