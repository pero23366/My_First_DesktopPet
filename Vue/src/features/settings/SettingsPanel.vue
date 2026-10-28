<!--
  features/settings/SettingsPanel.vue —— 设置面板（四段：形象 / 人设 / API / 其他）

  本步只是"搬家"：把原来塞在 App.vue 里的 90 行结构原样搬过来，行为不变。
  面板的显隐、每个输入框的绑定（v-model）是第 5、6 步的事 —— 现在点了没反应是预期的。

  为什么要单独一个文件：
  设置面板是这套 UI 里唯一"会持续长胖"的部分（现在 4 段，以后可能 8 段）。
  把它放在 App.vue 里，根组件会被撑成 500 行，谁也看不出页面结构。

  注意：原来每个控件上的 id 已全部删掉 —— 那些 id 是给 getElementById 用的，
  Vue 版改用 v-model 后不再需要它们。「每删一个 id = 迁移一处」的制度到此退休，
  新的边界是组件。
-->
<script setup lang="ts">
// 目前没有任何逻辑，纯结构。下一步接开合时才会加 props / emit。
</script>

<template>
  <div class="pet__settings">
    <div class="pet__settings-head">
      <p class="pet__settings-title">设置</p>
      <button class="pet__icon pet__icon--close" type="button" title="关闭">✕</button>
    </div>

    <!-- ========== 形象 ========== -->
    <p class="pet__settings-title">形象</p>
    <input class="pet__file" type="file" accept="image/*" />
    <div class="pet__settings-row">
      <span class="pet__hint">默认形象</span>
      <button class="pet__btn pet__btn--tiny" type="button">恢复默认</button>
    </div>

    <div class="pet__settings-sep"></div>

    <!-- ========== 人设 ========== -->
    <p class="pet__settings-title">人设</p>
    <label class="pet__field">
      <span class="pet__field-label">名字</span>
      <input class="pet__field-input" type="text" maxlength="12" placeholder="小沃" />
    </label>

    <div class="pet__field-grid">
      <label class="pet__field">
        <span class="pet__field-label">性格</span>
        <select class="pet__field-input"></select>
      </label>
      <label class="pet__field">
        <span class="pet__field-label">语气</span>
        <select class="pet__field-input"></select>
      </label>
      <label class="pet__field">
        <span class="pet__field-label">称呼</span>
        <select class="pet__field-input"></select>
      </label>
    </div>

    <button class="pet__btn pet__btn--wide" type="button">生成提示词</button>

    <label class="pet__field">
      <span class="pet__field-label">提示词（可直接手改）</span>
      <textarea class="pet__textarea" rows="6" spellcheck="false"></textarea>
    </label>

    <div class="pet__settings-sep"></div>

    <!-- ========== API ========== -->
    <p class="pet__settings-title">DeepSeek API</p>
    <label class="pet__field">
      <span class="pet__field-label">API Key（只存在本标签页，关掉即消失）</span>
      <input class="pet__field-input" type="password" autocomplete="off" spellcheck="false" placeholder="sk-…" />
    </label>
    <label class="pet__field">
      <span class="pet__field-label">模型</span>
      <input class="pet__field-input" type="text" spellcheck="false" placeholder="deepseek-chat" />
    </label>
    <button class="pet__btn pet__btn--wide" type="button">测试 Key</button>
    <p class="pet__api-status">还没填 Key</p>

    <div class="pet__settings-sep"></div>

    <!-- ========== 其他 ========== -->
    <label class="pet__settings-item">
      <input type="checkbox" />
      <span>对话自动收起（默认不收起）</span>
    </label>
    <label class="pet__field">
      <span class="pet__field-label">收起时间：<b>20</b> 秒</span>
      <input class="pet__range" type="range" min="10" max="60" step="5" />
    </label>
    <p class="pet__warn">注意，网页版如果选了此项，对话消失后，不可找回！！！</p>
    <button class="pet__btn pet__btn--wide" type="button">清空对话</button>
    <button class="pet__btn pet__btn--wide" type="button">下载配置（.pet.json）</button>
  </div>
</template>
