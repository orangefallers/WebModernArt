# 《現代藝術》單機網頁版：開發與專案架構規格書

> 文件狀態：Draft for Review  
> 版本：0.2.0  
> 日期：2026-08-24  
> 專案根目錄：`/Users/orangefaller/WebModernArt`

## 1. 文件目的

本文件定義《現代藝術》單機網頁遊戲（1 位真人玩家對 2～4 位 AI）的技術選型、程式分層、資料模型、遊戲流程、AI 邊界、目錄結構、測試策略與開發規範，作為正式實作前的 review 基準。

本階段只規劃純前端單機版，不包含帳號、伺服器、多人連線、付費或雲端存檔。

## 2. 需求範圍

### 2.1 MVP 必須完成

- 首頁、AI 數量選擇與規則說明。
- 1 位真人玩家加 2～4 位 AI，總玩家數為 3～5 人。
- 70 張畫作牌、4 個回合、同畫家第 5 張出現時結束該回合。
- 五種拍賣：公開競價、密封出價、一圈競價、定價拍賣、聯合拍賣。
- 發牌、輪替拍賣官、出牌、競標、付款、取得畫作、回合結算及最終勝負。
- 市場價值表、玩家狀態、拍賣桌、真人手牌、事件提示與 AI 思考回饋。
- AI 動態估值、出牌策略與可重現的隨機決策。
- 遊戲重新開始、瀏覽器重新整理後繼續遊戲。
- 桌面版與平板版可操作；手機採可操作但非最佳體驗。

### 2.2 暫不納入 MVP

- 真人多人連線與觀戰。
- 後端 API、會員、排行榜與跨裝置同步。
- AI 模型服務或生成式 AI；MVP 使用本機規則式 AI。
- 商店、成就、社交與聊天。
- 完整動畫編輯器、3D 場景或 WebGL。

## 3. 技術選型

| 類別 | 選型 | 用途與決策 |
|---|---|---|
| Runtime | Node.js 22 LTS | 統一本機與 CI 執行環境 |
| 套件管理 | pnpm | 快速、鎖檔穩定；以 `packageManager` 固定版本 |
| 建置工具 | Vite | 開發伺服器、正式建置與靜態資源處理 |
| UI 框架 | Vue 3 + TypeScript | Composition API、`<script setup>`、嚴格型別 |
| 路由 | Vue Router | `/`、`/game` 與 fallback route |
| 狀態管理 | Pinia | 儲存遊戲 session 與 UI 可觀察狀態 |
| 樣式 | CSS Modules + CSS Custom Properties | 降低 class 衝突，建立主題 token；不先引入大型 UI framework |
| 驗證 | Zod | 驗證規則設定、存檔版本與 LocalStorage 資料 |
| 單元測試 | Vitest | Domain、規則、AI 與 Store 測試 |
| 元件測試 | Vue Test Utils | Vue 元件互動與狀態呈現 |
| E2E | Playwright | 完整開局、各拍賣類型、結算與續玩 |
| 程式品質 | ESLint + Prettier + vue-tsc | lint、格式、Vue/TS 型別檢查 |
| Git hooks | simple-git-hooks + lint-staged | commit 前檢查異動檔案；可在建立 Git repo 後啟用 |

### 3.1 瀏覽器支援

- 最新兩個主要版本的 Chrome、Edge、Firefox、Safari。
- 不支援 Internet Explorer。
- 所有核心操作需同時支援滑鼠與鍵盤。

## 4. 架構原則

採「UI／應用流程／領域規則／基礎設施」四層架構：

```text
Vue Views / Components
        ↓ commands / view models
Pinia Stores + Game Orchestrator
        ↓ pure domain actions
Domain Engine + Auction Strategies + AI Policy
        ↓ adapters
Persistence / Timer / Seeded RNG / Audio
```

依賴方向只能由外向內：

- Vue 元件不可直接修改遊戲 state，只能呼叫 store action。
- Pinia 不實作勝負或拍賣規則，只協調 Domain Engine 並發布畫面狀態。
- Domain 層不可 import Vue、Pinia、DOM、LocalStorage 或真實計時器。
- AI 與真人操作必須送入相同的合法動作驗證流程，避免 AI 繞過規則。
- 所有金額以整數 `Money` 儲存，單位統一為 `$1k`，不使用浮點金額。
- 隨機洗牌與 AI 擾動由 seeded RNG 提供，使錯誤與測試可重現。

## 5. 建議專案目錄

```text
WebModernArt/
├─ .vscode/
│  ├─ extensions.json
│  ├─ settings.json
│  └─ launch.json
├─ docs/
│  ├─ ModernArt_Web_Game_Architecture_Spec.md
│  ├─ GAME_RULES.md
│  └─ ADR/
├─ public/
│  ├─ favicon.svg
│  └─ audio/
├─ src/
│  ├─ app/
│  │  ├─ App.vue
│  │  ├─ main.ts
│  │  └─ router.ts
│  ├─ assets/
│  │  ├─ cards/
│  │  ├─ icons/
│  │  └─ styles/
│  │     ├─ reset.css
│  │     ├─ tokens.css
│  │     └─ global.css
│  ├─ components/
│  │  ├─ common/
│  │  ├─ game/
│  │  └─ auction/
│  ├─ views/
│  │  ├─ HomeView.vue
│  │  ├─ GameView.vue
│  │  └─ NotFoundView.vue
│  ├─ stores/
│  │  ├─ game.store.ts
│  │  ├─ auction.store.ts
│  │  ├─ players.store.ts
│  │  └─ ui.store.ts
│  ├─ domain/
│  │  ├─ model/
│  │  ├─ rules/
│  │  ├─ actions/
│  │  ├─ selectors/
│  │  ├─ auctions/
│  │  └─ errors/
│  ├─ ai/
│  │  ├─ ai-controller.ts
│  │  ├─ valuation.ts
│  │  ├─ card-strategy.ts
│  │  ├─ auction-policy.ts
│  │  └─ personalities.ts
│  ├─ services/
│  │  ├─ game-orchestrator.ts
│  │  ├─ persistence.service.ts
│  │  ├─ timer.service.ts
│  │  └─ audio.service.ts
│  ├─ config/
│  │  ├─ artists.ts
│  │  ├─ deck.ts
│  │  ├─ game-rules.ts
│  │  └─ ai.ts
│  ├─ composables/
│  ├─ types/
│  └─ utils/
├─ tests/
│  ├─ unit/
│  ├─ component/
│  ├─ integration/
│  ├─ e2e/
│  └─ fixtures/
├─ index.html
├─ package.json
├─ pnpm-lock.yaml
├─ tsconfig.json
├─ vite.config.ts
├─ vitest.config.ts
├─ playwright.config.ts
├─ eslint.config.js
├─ .prettierrc.json
├─ .editorconfig
├─ .gitignore
└─ README.md
```

### 5.1 模組責任

- `domain/`：純 TypeScript 規則核心；可在沒有瀏覽器的環境執行。
- `ai/`：只讀取 AI 可知資訊，產出 `GameAction`，不能直接改 state。
- `stores/`：讓 UI 訂閱狀態並呼叫用例，不承載複雜規則。
- `services/game-orchestrator.ts`：依 phase 推進遊戲、排程 AI 與自動結算。
- `config/`：牌組、畫家、發牌數、初始資金、動畫等待等可調參數。
- `components/`：以顯示與輸入為主，避免知道完整規則。

## 6. 核心領域模型

以下為概念型別，正式實作可拆分檔案：

```ts
type PlayerId = string
type CardId = string
type ArtistId = string
type Money = number // 單位：$1k，非負整數

type GamePhase =
  | 'setup'
  | 'round-start'
  | 'select-card'
  | 'auction'
  | 'resolve-auction'
  | 'round-scoring'
  | 'game-over'

type AuctionType =
  | 'open'
  | 'sealed'
  | 'once-around'
  | 'fixed-price'
  | 'double'

interface ArtworkCard {
  id: CardId
  artistId: ArtistId
  auctionType: AuctionType
}

interface PlayerState {
  id: PlayerId
  kind: 'human' | 'ai'
  name: string
  cash: Money
  hand: CardId[]
  gallery: GalleryEntry[]
  personality?: 'conservative' | 'balanced' | 'aggressive' | 'chaotic'
}

interface GalleryEntry {
  cardId: CardId
  acquisition: 'auction' | 'unmatched-double'
  sellableThisRound: boolean
}

interface GameState {
  schemaVersion: 1
  seed: string
  phase: GamePhase
  round: 1 | 2 | 3 | 4
  players: PlayerState[]
  activePlayerId: PlayerId
  auctioneerId: PlayerId
  deck: CardId[]
  marketHistory: RoundMarketResult[]
  tableCounts: Record<ArtistId, number>
  auction: AuctionState | null
  log: GameEvent[]
}
```

### 6.1 State 不變條件

- 任一 `CardId` 同一時間只存在於牌庫、某玩家手牌、當前拍賣或已購畫作其中一處。
- 玩家現金不得小於 0；任何出價不可超過可用現金。
- 只有目前 phase 允許的 action 才能執行。
- 只有具資格的玩家能出價、購買、補聯合拍賣牌或 pass。
- 每個已完成拍賣只能結算一次。
- Round 4 結束後只能進入 `game-over`。

## 7. 動作與狀態機

所有真人點擊、AI 決策、計時器到期都轉成明確動作：

```ts
type GameAction =
  | { type: 'START_GAME'; aiCount: 2 | 3 | 4; seed?: string }
  | { type: 'PLAY_CARD'; playerId: PlayerId; cardId: CardId }
  | { type: 'ADD_DOUBLE_CARD'; playerId: PlayerId; cardId: CardId }
  | { type: 'PLACE_BID'; playerId: PlayerId; amount: Money }
  | { type: 'PASS'; playerId: PlayerId }
  | { type: 'SET_FIXED_PRICE'; playerId: PlayerId; amount: Money }
  | { type: 'BUY_FIXED_PRICE'; playerId: PlayerId }
  | { type: 'DECLINE_FIXED_PRICE'; playerId: PlayerId }
  | { type: 'AUCTION_TIMEOUT' }
  | { type: 'CONTINUE' }
  | { type: 'RESTART_GAME' }
```

Domain API：

```ts
interface GameEngine {
  getLegalActions(state: GameState, actorId?: PlayerId): LegalAction[]
  dispatch(state: GameState, action: GameAction): GameTransition
}

interface GameTransition {
  state: GameState
  events: GameEvent[]
  effects: GameEffect[] // 排程 AI、啟動倒數、播放音效、要求存檔
}
```

### 7.1 主流程

```text
設定 → 發牌／回合開始 → 拍賣官選牌 → 執行對應拍賣
  → 付款與移轉畫作 → 是否出現同畫家第 5 張？
      ├─ 否：下一位拍賣官
      └─ 是：停止拍賣 → 排名與市場價值 → 售出本輪畫作
               → 第 4 輪？ ─ 是 → 最終排名
                            └ 否 → 清桌／補牌／下輪
```

### 7.2 拍賣策略介面

五種拍賣共用 `AuctionStrategy`，避免在單一 store 內堆積條件判斷：

```ts
interface AuctionStrategy {
  type: AuctionType
  create(context: AuctionContext): AuctionState
  legalActions(context: AuctionContext): LegalAction[]
  apply(context: AuctionContext, action: GameAction): AuctionTransition
  isComplete(state: AuctionState): boolean
  resolve(context: AuctionContext): AuctionResult
}
```

各類型要點：

- 公開競價：事件驅動的靜默倒數；每次有效加價重設倒數。AI 延遲屬 effect，不寫入規則本體。
- 密封出價：每位玩家（包含拍賣官）可提交一次非負整數出價；UI 對真人隱藏其他出價，全部完成後同時揭示。最高價同額時，由順時針距離拍賣官最近者得標，拍賣官自己也在 tie-break 順序內。
- 一圈競價：從拍賣官左手邊開始依順時針順序，每人僅一次出價或 pass，拍賣官最後行動；新出價必須嚴格高於目前最高價。全員 pass 時，拍賣官免費取得畫作。
- 定價拍賣：定價可為 `$0k`，但不得高於拍賣官現金；其他玩家從拍賣官左手邊開始依序購買或拒絕。第一位購買者付款給拍賣官；無人購買時，拍賣官以該價格買下並付款給銀行。
- 聯合拍賣：第二張必須是同畫家、非聯合拍賣類型的畫作。原拍賣官可先補牌；若不補，其他玩家依順時針順序各自決定。外部玩家補牌後成為聯合拍賣官，依第二張牌的類型拍賣，收入均分，奇數餘額歸第二張提供者。無人補牌時，原拍賣官免費取得聯合拍賣牌；該牌增加畫家本輪賣出數量，但不產生本輪出售收入。

## 8. 回合結算

`round-scoring` 以純函式執行：

1. 統計本輪各畫家在展示桌出現張數。
2. 某畫家第 5 張被打出時立即停止，不拍賣、不歸任何玩家，但要計入該畫家的本輪賣出數量。
3. 依張數決定本輪第 1、2、3 名，分別增加 `$30k`、`$20k`、`$10k`；同張數依黃色、藍色、紅色、綠色、棕色的固定優先序排名。
4. 只有本輪前 3 名畫家的畫作可出售；單張售價為該畫家「本輪價值＋所有過往輪次累計價值」。本輪未進前 3 名者即使有歷史價值也不產生收入。
5. 將玩家本輪畫作移出遊戲、更新市場歷史，再依玩家人數與輪次補牌。
6. 下一輪首位拍賣官為打出本輪第 5 張牌之玩家的下一位玩家；第四輪結算後比較現金決定名次。

結算輸入與輸出都要可 snapshot 測試，且不得由 UI 重新計算。

## 9. AI 架構

不建立 `aiStore`；AI 不是畫面狀態的權威來源，使用 `AIController` 讀取資訊並回傳合法 action。Pinia 只保存 `thinkingPlayerId` 等 UI 狀態。

```ts
interface AIController {
  decide(input: AIObservation, legalActions: LegalAction[], rng: RNG): AIDecision
}

interface AIDecision {
  action: GameAction
  rationaleCode: string // 供 debug，不直接洩漏給玩家
  delayMs: number
}
```

### 9.1 資訊邊界

- AI 可讀：市場歷史、公開展示、出價紀錄、所有玩家現金、各玩家手牌張數、自身手牌。
- AI 不可讀：其他玩家手牌內容、密封拍賣中尚未揭露的真人出價、未抽出的牌順序。
- Debug mode 可顯示 AI 估值，但正式 UI 預設關閉。

### 9.2 估值模型

```text
EV = 歷史累計價值
   + 預測本輪價值 × 排名信心
   + 自身持有該畫家畫作的組合價值
   - 回合即將結束的風險

最高出價 = clamp(EV × 性格係數 × 隨機擾動, 0, 可用現金)
```

初始人格參數：

| 人格 | 性格係數 | 擾動 | 現金保留傾向 |
|---|---:|---:|---:|
| 保守 | 0.70～0.82 | ±5% | 高 |
| 均衡 | 0.82～0.95 | ±8% | 中 |
| 激進 | 0.95～1.10 | ±10% | 低 |
| 隨機 | 0.70～1.05 | ±20% | 隨機 |

AI 思考延遲只影響呈現，不影響決策結果。E2E 測試可使用 `instantAI` 設定跳過延遲。

## 10. Pinia Store 邊界

### `gameStore`

- 持有目前 `GameState`、初始化、繼續、重開與 derived selectors。
- 呼叫 orchestrator，不直接計算結算結果。

### `auctionStore`

- 提供當前拍賣的 view model、可執行 action、真人輸入草稿與倒數顯示。
- 倒數值是 UI 資訊；超時後送出 `AUCTION_TIMEOUT`。

### `playersStore`

- 提供排序後玩家資訊、真人手牌 view model、AI 公開資訊與目前行動者。
- 敏感資料由 selector 遮罩，元件不自行隱藏 AI 手牌。

### `uiStore`

- Modal、toast、動畫偏好、音量、教學步驟、`thinkingPlayerId`。
- 不保存會影響勝負的資料。

## 11. UI 與元件規劃

### 11.1 Views

- `HomeView`：標題、開始、AI 數量、規則、繼續遊戲。
- `GameView`：桌面主佈局；依 phase 顯示拍賣、結算或遊戲結束 overlay。
- `NotFoundView`：返回首頁。

### 11.2 主要元件

- `MarketValueBoard`：四輪市場價值與當輪張數。
- `PlayerInfoPanel` / `PlayerSeat`：現金、手牌數、狀態、目前行動者。
- `AuctionTable`：畫作、類型、當前價、出價／pass／購買 controls。
- `ArtworkCard`：共用牌面；支援正面、背面、disabled、selected。
- `HumanHand`：選牌與出牌；非法牌應 disabled 並提供原因。
- `RoundGallery`：每位玩家本輪買到的畫作。
- `AuctionLog`：最近事件，協助玩家理解 AI 行動。
- `RulesDialog`、`RoundResultDialog`、`GameResultDialog`。

### 11.3 響應式版面

- `>= 1200px`：市場左、拍賣桌中、玩家右、手牌下。
- `768～1199px`：市場與玩家區可折疊，拍賣桌維持主焦點。
- `< 768px`：單欄、固定底部 action bar、手牌水平捲動。

### 11.4 無障礙

- 所有 action 可用鍵盤完成，focus 順序符合畫面流程。
- 不只依顏色表示目前玩家、勝負或 disabled 狀態。
- Dialog 要有 focus trap、Esc 關閉與正確 ARIA label。
- AI 動畫與倒數尊重 `prefers-reduced-motion`。

## 12. 存檔與恢復

- 每次成功的 domain transition 後，將可序列化 `GameState` 寫入 LocalStorage。
- key：`modern-art:solo:save:v1`；另存 UI 設定於 `modern-art:solo:prefs:v1`。
- 讀檔先經 Zod schema 驗證；無效或版本不支援時不載入並提供清除選項。
- 不持久化 `setTimeout` handle；恢復時由目前 phase 重新建立合法 effect。
- 公開競價恢復後重新開始一段完整倒數，避免背景分頁造成不公平超時。
- 存檔只作便利功能，不宣稱防竄改或安全儲存。

## 13. 錯誤處理與可觀測性

- 領域錯誤使用具 code 的 `DomainError`，例如 `BID_EXCEEDS_CASH`、`ACTION_NOT_ALLOWED`。
- 可預期錯誤轉為玩家可理解的 toast；不可預期錯誤由 error boundary 顯示重試／回首頁。
- 開發環境保留 action/event log 與 seed，方便重現。
- 正式版不輸出 AI 隱藏資訊或完整存檔到 console。

## 14. VS Code 開發規範

### 14.1 建議 extensions

- Vue - Official（Volar）
- ESLint
- Prettier
- Playwright Test for VS Code
- EditorConfig

工作區設定應啟用 format on save、ESLint fix on save，並將 Vue/TypeScript 格式化交給 Prettier。停用 Vetur，避免與 Vue - Official 衝突。

### 14.2 Scripts 介面

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "vue-tsc --noEmit",
    "lint": "eslint . --max-warnings=0",
    "format": "prettier . --write",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "check": "pnpm typecheck && pnpm lint && pnpm test && pnpm build"
  }
}
```

### 14.3 程式碼慣例

- TypeScript 開啟 `strict`、`noUncheckedIndexedAccess`。
- 檔名使用 kebab-case；Vue component 名稱使用 PascalCase。
- 測試檔與來源對應為 `*.spec.ts`；E2E 使用 `*.e2e.ts`。
- 不使用 `any`；外部輸入先以 `unknown` 接收再驗證。
- Domain function 優先使用 immutable transition；禁止元件直接 mutation。
- PR／commit 必須通過 `pnpm check`。

## 15. 測試策略

### 15.1 單元測試

- 牌組張數、唯一性、各玩家人數的發牌結果。
- 合法 action 與非法 action 拒絕。
- 五種拍賣的完整狀態轉換、資金與牌權移轉。
- 第 5 張觸發回合結束、畫家排名、tie-break、歷史價值累計。
- AI 估值邊界、現金限制、資訊遮罩、固定 seed 重現。
- 存檔 schema migration／拒絕損毀資料。

### 15.2 Integration／Component

- Store → orchestrator → domain → store 的單一 action 完整循環。
- UI 僅顯示當前合法 controls。
- AI 思考、倒數重設、modal 與 keyboard 操作。

### 15.3 E2E

- 3、4、5 人皆可開始並完成四輪。
- 每種拍賣至少一條成功與一條 pass／無人購買路徑。
- 重新整理後可繼續且不重複結算。
- 最終現金與排名畫面正確，能重新開始。
- 以固定 seeds 跑多局 smoke simulation，驗證不會 deadlock。

### 15.4 建議門檻

- `domain/`、`ai/`：line/branch coverage >= 90%。
- 全專案：line coverage >= 80%。
- 核心規則不得只以 snapshot 驗證，必須斷言金額、持牌與 phase。

## 16. 開發階段與完成定義

### Phase 0：規則定稿與基礎工程

- review 本文件與 `GAME_RULES.md`。
- 建立 Vite/Vue/TS、lint、test、VS Code、Git ignore。
- 定義牌組設定與領域型別。

### Phase 1：無 UI 規則引擎

- 發牌、回合／拍賣官輪替、五種拍賣、結算。
- 使用 CLI-style simulation 或測試完成整局。

### Phase 2：Pinia 與可操作 UI

- 首頁、遊戲桌、手牌、玩家、拍賣 controls、結果畫面。
- 完整真人操作路徑。

### Phase 3：AI 與存檔

- AI 估值、人格、決策延遲；LocalStorage 存取與恢復。
- 固定 seed 大量模擬，消除 deadlock。

### Phase 4：體驗與發佈品質

- 響應式、動畫、音效、無障礙、效能與 E2E。
- production build 無型別／lint／test 錯誤。

每個 phase 的 Definition of Done：程式、對應測試、文件同步、`pnpm check` 通過，且沒有已知的核心規則 deadlock。

## 17. 資產與命名注意事項

- 不直接複製實體桌遊的受保護畫作、卡面、商標圖樣或規則書全文。
- 開發階段使用自製 placeholder 畫作、畫家名稱與 icon；若要公開發佈，再確認品牌與美術授權。
- 規則參數與美術資料分離，之後替換合法資產不影響 Domain Engine。

## 18. 已確認的實作規則

下列原待確認項目已依 `Modern_Art_Rules_v5.md` 定稿；完整、可直接編碼的規則表見 [`docs/GAME_RULES.md`](./GAME_RULES.md)：

1. **牌組**：共 70 張。黃色 12、藍色 13、紅色 14、綠色 15、棕色 16；各拍賣類型數量依 `GAME_RULES.md` 的牌組矩陣建立並驗證。
2. **資金與發牌**：每人 `$100k`。3／4／5 人首輪分別發 10／9／8 張；第 2、3 輪分別補 6／4／3 張；第 4 輪不補牌。未使用牌留在牌庫，不要求用完 70 張。
3. **第 5 張**：被打出即立即結束該輪，不進行拍賣、不歸任何玩家，但計入該畫家的本輪數量。
4. **畫家排名平手**：黃色 > 藍色 > 紅色 > 綠色 > 棕色。
5. **一般拍賣金流**：拍賣官得標時付款給銀行；其他玩家得標時付款給拍賣官。
6. **出價邊界**：公開與一圈競價的新出價必須嚴格增加；一圈全員 pass 時拍賣官免費取得。密封出價允許 `$0k`，同額時由順時針距離拍賣官最近者得標，包含拍賣官。
7. **定價無人購買**：拍賣官按其定價自行取得並付款給銀行，因此定價不得高於拍賣官現金。
8. **聯合拍賣**：依原拍賣官、其後各玩家的順時針順序補同畫家非聯合牌；由第二張圖標決定拍賣類型。不同玩家補牌時收入均分，奇數餘額歸第二張提供者；無人補牌時原拍賣官免費取得，增加賣出數量但不產生該輪出售收入。
9. **輪間流程**：依第 2 點補牌；下一輪由打出第 5 張牌者的下一位玩家先開始。
10. **最終同額**：規則書只以總現金決定勝負，未指定第二順位。因此實作採同額並列，不自行加入額外 tie-break。

若後續規則來源改版，應先更新 `GAME_RULES.md`、對應 ADR 與測試，再修改 Domain Engine。

## 19. 本版建議決策摘要

- 採 Vue 3 + TypeScript + Pinia + Vite 的純前端 SPA。
- Domain Engine 與 Vue 完全分離，五種拍賣使用 strategy pattern。
- AI 採 controller/policy，不設 `aiStore`，並受相同合法動作驗證約束。
- 使用 seeded RNG、事件／effect 模型及 LocalStorage versioning，確保可測試與可恢復。
- 先完成無 UI 的整局模擬，再接畫面，降低回合制狀態錯誤風險。
