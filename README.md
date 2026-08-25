# 現代藝術｜單機網頁遊戲

一位真人玩家對戰 2～4 位本機 AI 的 Vue 3 網頁遊戲。遊戲規則、牌組與金流以 [`docs/GAME_RULES.md`](./docs/GAME_RULES.md) 為準。

## 開發環境

- Node.js 22+
- pnpm 11+
- VS Code（建議安裝工作區推薦 extensions）

## 開始開發

```bash
pnpm install
pnpm dev
```

預設開發網址為 `http://localhost:5173`。

## 品質檢查

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## 主要目錄

- `src/domain/`：遊戲狀態、牌組與規則引擎。
- `src/ai/`：AI 估值與行動決策。
- `src/stores/`：Pinia 遊戲協調與 AI 執行流程。
- `src/components/`：遊戲桌與共用元件。
- `src/views/`：首頁與遊戲頁。
- `tests/unit/`：牌組、規則與完整牌局模擬測試。
- `docs/`：架構與 canonical rules。

## 存檔

每次合法遊戲動作後會自動保存到瀏覽器 LocalStorage。回到首頁後可選擇繼續上次牌局。

## 美術資產

目前牌面採原創 CSS 幾何構圖，不包含實體桌遊的卡面或受保護畫作。公開發佈前仍應確認遊戲名稱與品牌授權。
