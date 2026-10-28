<!--
  features/home/HomeScreen.vue —— 首屏

  一个"纯展示 + 一个出口"的组件：它不知道自己会被谁用，只知道
  「用户点了生成桌宠」这件事要往上报告。所以它 emit 一个 enter，
  由 App.vue 决定"enter 之后干什么"（切屏、招呼语……）。

  这就是把"我要做什么"和"谁让我做"拆开：以后想加登录、加引导页，
  改 App.vue 就行，这个文件不用动。
-->
<script setup lang="ts">
// 声明本组件会发出哪些事件。写清楚之后，父组件用错事件名 TS 会报错
defineEmits<{
  enter: []
}>()
</script>

<template>
  <main class="home">
    <h1 class="home__title">My First DestopPet</h1>
    <p class="home__subtitle">在浏览器里，养一只会聊天的 AI 桌宠</p>
    <button class="home__btn" type="button" @click="$emit('enter')">生成桌宠</button>

    <!-- 桌面版入口：主按钮走国内镜像（实测比 GitHub 直连快 10~30 倍），
         官方原链接放在提示行里做兜底。链接文案与原版 index.html 保持一致。 -->
    <a class="home__download"
      href="https://ghfast.top/https://github.com/pero23366/My_First_DesktopPet/releases/latest/download/xiaowo-desktop-v1.0.0-win-x64.zip"
      target="_blank" rel="noopener noreferrer">下载桌面版 · Windows x64（59MB）</a>
    <p class="home__download-hint">
      桌面版可以拖动、可以一直浮在窗口最上层。<br />
      首次运行若被 Windows 拦截，点「更多信息 → 仍要运行」。<br />
      下不动就走<a href="https://github.com/pero23366/My_First_DesktopPet/releases/latest"
        target="_blank" rel="noopener noreferrer">官方原链接</a>（国内可能很慢，支持断点续传）
    </p>
  </main>
</template>
