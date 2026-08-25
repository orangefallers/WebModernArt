<script setup lang="ts">
defineEmits<{ close: [] }>()
</script>

<template>
  <div class="modal-backdrop" role="presentation" @click.self="$emit('close')">
    <section class="rules-modal" role="dialog" aria-modal="true" aria-labelledby="rules-title">
      <button class="modal-close" aria-label="關閉規則" @click="$emit('close')">×</button>
      <span class="eyebrow">Field guide</span>
      <h2 id="rules-title">拍賣會指南</h2>
      <div class="rules-columns">
        <article>
          <b>01 · 目標</b>
          <p>四輪結束後，持有最多現金的畫商獲勝。每輪熱門前三名會替作品累積市場價值。</p>
        </article>
        <article>
          <b>02 · 結束一輪</b>
          <p>同一藝術家的第 5 張作品打出時，該輪立即結束。第 5 張不拍賣，但會計入人氣。</p>
        </article>
        <article>
          <b>03 · 五種拍賣</b>
          <p>公開喊價、一圈出價、秘密投標、一口定價，以及兩張同藝術家作品的聯合拍賣。</p>
        </article>
        <article>
          <b>04 · 市場價值</b>
          <p>每輪前三名增加 $30k、$20k、$10k。只有當輪進入前三名，歷史價值才能一起兌現。</p>
        </article>
      </div>
      <button class="button button--primary button--wide" @click="$emit('close')">開始鑑賞</button>
    </section>
  </div>
</template>
