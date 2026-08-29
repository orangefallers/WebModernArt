<script setup lang="ts">
defineEmits<{ close: [] }>()
</script>

<template>
  <div class="modal-backdrop" role="presentation" @click.self="$emit('close')">
    <section class="rules-modal" role="dialog" aria-modal="true" aria-labelledby="rules-title">
      <button class="modal-close" aria-label="關閉規則" @click="$emit('close')">×</button>
      <span class="eyebrow">Field guide</span>
      <h2 id="rules-title">拍賣會指南</h2>
      <p class="rules-intro">四輪市場、五種拍賣。先看懂作品如何成交，再決定你願意為未來付多少。</p>

      <h3 class="rules-section-title">遊戲流程</h3>
      <div class="rules-columns rules-columns--overview">
        <article>
          <b>01 · 目標</b>
          <p>四輪結束後，持有最多現金的畫商獲勝。每輪熱門前三名會替作品累積市場價值。</p>
        </article>
        <article>
          <b>02 · 結束一輪</b>
          <p>同一藝術家的第 5 張作品打出時，該輪立即結束。第 5 張不拍賣，但會計入人氣。</p>
        </article>
        <article>
          <b>03 · 市場價值</b>
          <p>每輪前三名增加 $30k、$20k、$10k。只有當輪進入前三名，歷史價值才能一起兌現。</p>
        </article>
      </div>

      <h3 class="rules-section-title">五種拍賣方式</h3>
      <div class="auction-rule-list">
        <article class="auction-rule">
          <header><span>01</span><b>公開競價</b><i aria-hidden="true">🔨</i></header>
          <p>
            所有玩家（包含拍賣官）都能自由喊價；每次新出價必須高於目前最高價，直到沒有人願意再加價。
          </p>
          <small
            ><b>成交：</b
            >最高價者得標。其他玩家得標時付款給拍賣官；拍賣官自己得標時付款給銀行。</small
          >
        </article>

        <article class="auction-rule">
          <header><span>02</span><b>一圈競價</b><i aria-hidden="true">↻</i></header>
          <p>
            依座位順序進行，每位玩家只有一次「出價」或「PASS」機會；後面的出價必須高於目前最高價。
          </p>
          <small
            ><b>成交：</b>最高價者得標。若全員
            PASS，拍賣官免費獲得畫作；拍賣官得標則付款給銀行。</small
          >
        </article>

        <article class="auction-rule">
          <header><span>03</span><b>秘密投標</b><i aria-hidden="true">◉</i></header>
          <p>所有玩家（包含拍賣官）各自秘密輸入一次金額，也可以出價 $0；所有人完成後同時揭曉。</p>
          <small
            ><b>成交：</b
            >最高價者得標；同價時，由順時針方向離拍賣官最近者勝出。付款規則與公開競價相同。</small
          >
        </article>

        <article class="auction-rule">
          <header><span>04</span><b>一口定價</b><i aria-hidden="true">$</i></header>
          <p>拍賣官先設定售價，金額不可超過自己持有的現金。其餘玩家依座位順序決定購買或 PASS。</p>
          <small
            ><b>成交：</b
            >第一位接受價格的玩家付款給拍賣官；若所有人都放棄，拍賣官必須照定價買下並付款給銀行。</small
          >
        </article>

        <article class="auction-rule auction-rule--double">
          <header><span>05</span><b>聯合拍賣</b><i aria-hidden="true">Ⅱ</i></header>
          <p>
            先打出聯合拍賣牌的玩家是次要拍賣官；補出同藝術家第二張牌的玩家成為主要拍賣官，並依第二張牌的圖標拍賣兩張作品。
          </p>
          <small
            ><b>成交：</b
            >其他玩家得標時，成交價由兩名拍賣官平分；其中一名拍賣官得標時，另一名仍取得一半，得標者依規則付款。若無人補第二張牌，原出牌者免費獲得聯合拍賣牌。</small
          >
        </article>
      </div>

      <p class="rules-payment-note">
        <b>付款原則：</b>拍賣官不能因買下自己的畫而獲得收入；自己得標的應付金額交給銀行。
      </p>
      <button class="button button--primary button--wide" @click="$emit('close')">開始鑑賞</button>
    </section>
  </div>
</template>
