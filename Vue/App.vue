<!--
  App.vue —— Vue 版根组件

  【第 1 步 · 只做一件事】把「首屏 ↔ 桌宠舞台」的切换从"手改 class"换成"改一个变量"。

  对照原版（TS/ui.ts）：
    showPet()  → dom.home.classList.add('hidden')
                 dom.pet.classList.remove('hidden')      ← 2 行，手改 2 个元素
    showHome() → 反过来，再加 closeSettings()/closeBubble()/clearInput()

  在 Vue 里这两屏的显隐不再是"操作"，而是"screen 这个变量的投影"：
    <main  v-show="screen === 'home'">
    <section v-show="screen === 'pet'">

  ⚠️ 本步范围内，除「生成桌宠 / 退出」外的按钮都还没接线 —— 点了没反应是预期的。
  ⚠️ 文件里的 id 是临时保留的"对照锚点"，每迁移一个控件就删掉一个，删完即迁移完成。
-->
<script setup lang="ts">
import { ref } from 'vue'

// ═══════════════════════════════════════════════════════════════
// 第 2 步 · 消息列表
// 对照原版 TS/ui.ts 的 addMessage()：手工 createElement + append + 算 scrollTop
// ═══════════════════════════════════════════════════════════════

// ① 一条消息长什么样
//    ⚠️ from 的取值必须和 CSS 类名对上：CSS 里只有 .pet__msg--me / .pet__msg--pet，
//       写成 'user' 不会报错，只是那一条气泡样式丢失（我第一版就写错了）
//    （原版 TS/types.ts 里这个类型叫 BubbleFrom，第 8 步合并时统一）
interface Message {
  id: number
  text: string
  from: 'me' | 'pet'
}

// ② 整个对话 = 一个数组。没有 <li>，没有 appendChild
const messages = ref<Message[]>([])
let nextId = 1

// ③ 加一条 = 往数组里 push 一个对象。DOM 由模板生成，不用你管
function addMessage(text: string, from: Message['from']) {
  messages.value.push({ id: nextId++, text, from })
}

// 全页面唯一的状态：现在在哪一屏
const screen = ref<'home' | 'pet'>('home')

function enterPet() {
  screen.value = 'pet'
  // ④ 原版 main.ts 的逻辑：只在第一次登场时打招呼，来回切不重复刷屏
  if (messages.value.length === 0) {
    addMessage('我在这儿。想聊点什么？', 'pet')
  }
}

function backHome() {
  screen.value = 'home'
}
</script>

<template>
  <!-- 首屏 -->
  <main v-show="screen === 'home'" class="home">
    <h1 class="home__title">My First DestopPet</h1>
    <p class="home__subtitle">在浏览器里，养一只会聊天的 AI 桌宠</p>
    <button class="home__btn" type="button" @click="enterPet">生成桌宠</button>

    <a class="home__download" href="https://github.com/pero23366/My_First_DesktopPet/releases/latest"
      target="_blank" rel="noopener noreferrer">下载桌面版 · Windows x64</a>
    <p class="home__download-hint">
      桌面版可以拖动、可以一直浮在窗口最上层。<br />
      首次运行若被 Windows 拦截，点「更多信息 → 仍要运行」。
    </p>
  </main>

  <!-- 桌宠舞台。注意：原版是 class="pet hidden" 靠 .hidden 藏，
       这里去掉 .hidden，改用 v-show —— 否则 !important 会和 v-show 的内联 display 打架 -->
  <section v-show="screen === 'pet'" class="pet">
    <!-- 左边：对话框 -->
    <div class="pet__bubble" id="bubble">
      <button class="pet__icon pet__icon--bubble-close" id="bubbleCloseBtn" type="button" title="收起对话">✕</button>
      <!-- ⑤ 列表渲染：只写"每一条长什么样"，不写"怎么加进去"。
           :key 用 m.id 而不是下标 —— 理由见第 2 步笔记 -->
      <ul class="pet__log" id="chatLog">
        <li v-for="m in messages" :key="m.id" :class="`pet__msg pet__msg--${m.from}`">{{ m.text }}</li>
      </ul>
    </div>

    <!-- 右边：形象 + 底部一排控件 -->
    <div class="pet__stage">
      <img class="pet__image" id="petImage" src="../image/idle-1.png" alt="桌宠形象" />

      <div class="pet__controls">
        <button class="pet__btn" id="settingsBtn" type="button">⚙ 设置</button>

        <div class="pet__row">
          <button class="pet__icon pet__icon--exit" type="button" title="退出" @click="backHome">✕</button>
          <input class="pet__input" id="inputBox" type="text" maxlength="200" placeholder="说点什么…" />
          <button class="pet__icon pet__icon--send" id="sendBtn" type="button" title="发送">↑</button>
        </div>

        <!-- 设置面板：居中弹层，内容多了自己滚动 -->
        <div class="pet__settings hidden" id="settingsPanel">

          <div class="pet__settings-head">
            <p class="pet__settings-title">设置</p>
            <button class="pet__icon pet__icon--close" id="settingsCloseBtn" type="button" title="关闭">✕</button>
          </div>

          <!-- ========== 形象 ========== -->
          <p class="pet__settings-title">形象</p>
          <input class="pet__file" id="imageInput" type="file" accept="image/*" />
          <div class="pet__settings-row">
            <span class="pet__hint" id="imageName">默认形象</span>
            <button class="pet__btn pet__btn--tiny" id="imageResetBtn" type="button">恢复默认</button>
          </div>

          <div class="pet__settings-sep"></div>

          <!-- ========== 人设 ========== -->
          <p class="pet__settings-title">人设</p>
          <label class="pet__field">
            <span class="pet__field-label">名字</span>
            <input class="pet__field-input" id="petName" type="text" maxlength="12" placeholder="小沃" />
          </label>

          <div class="pet__field-grid">
            <label class="pet__field">
              <span class="pet__field-label">性格</span>
              <select class="pet__field-input" id="selPersonality"></select>
            </label>
            <label class="pet__field">
              <span class="pet__field-label">语气</span>
              <select class="pet__field-input" id="selTone"></select>
            </label>
            <label class="pet__field">
              <span class="pet__field-label">称呼</span>
              <select class="pet__field-input" id="selAddress"></select>
            </label>
          </div>

          <button class="pet__btn pet__btn--wide" id="genPromptBtn" type="button">生成提示词</button>

          <label class="pet__field">
            <span class="pet__field-label">提示词（可直接手改）</span>
            <textarea class="pet__textarea" id="personaPrompt" rows="6" spellcheck="false"></textarea>
          </label>

          <div class="pet__settings-sep"></div>

          <!-- ========== API ========== -->
          <p class="pet__settings-title">DeepSeek API</p>
          <label class="pet__field">
            <span class="pet__field-label">API Key（只存在本标签页，关掉即消失）</span>
            <input class="pet__field-input" id="apiKey" type="password" autocomplete="off" spellcheck="false"
              placeholder="sk-…" />
          </label>
          <label class="pet__field">
            <span class="pet__field-label">模型</span>
            <input class="pet__field-input" id="apiModel" type="text" spellcheck="false" placeholder="deepseek-chat" />
          </label>
          <button class="pet__btn pet__btn--wide" id="apiTestBtn" type="button">测试 Key</button>
          <p class="pet__api-status" id="apiStatus">还没填 Key</p>

          <div class="pet__settings-sep"></div>

          <!-- ========== 其他 ========== -->
          <label class="pet__settings-item">
            <input type="checkbox" id="autoHideToggle" />
            <span>对话自动收起（默认不收起）</span>
          </label>
          <label class="pet__field">
            <span class="pet__field-label">收起时间：<b id="autoHideValue">20</b> 秒</span>
            <input class="pet__range" id="autoHideRange" type="range" min="10" max="60" step="5" />
          </label>
          <p class="pet__warn" id="autoHideWarn">注意，网页版如果选了此项，对话消失后，不可找回！！！</p>
          <button class="pet__btn pet__btn--wide" id="clearBtn" type="button">清空对话</button>
          <button class="pet__btn pet__btn--wide" id="exportBtn" type="button">下载配置（.pet.json）</button>
        </div>
      </div>
    </div>
  </section>
</template>
