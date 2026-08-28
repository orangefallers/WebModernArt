# 《現代藝術》Firebase 多人連線遊戲程式架構規劃

## 文件資訊

- 專案：WebModernArt
- 文件狀態：Draft for Review
- 版本：0.1.0
- 日期：2026-08-27
- 現有前端：Vue 3、TypeScript、Pinia、Vue Router、Vite
- 雲端平台：Firebase Authentication、Cloud Firestore、Cloud Functions、Realtime Database、App Check
- 本文件用途：定義多人連線架構與實作階段，不代表已開始安裝或部署 Firebase

## 1. 目標

在保留現有單機遊戲的前提下，新增 3～5 位真人玩家的線上多人模式，並確保：

- 所有玩家看到一致的牌局狀態。
- 牌庫、其他玩家手牌、密封出價及隨機種子不會洩漏。
- 玩家不能直接修改現金、手牌、得標結果或市場結算。
- 同時出價或重複送出動作時，不會重複扣款或結算。
- 斷線後可使用同一帳號重新加入原牌局。
- 單機模式仍可離線運作，不依賴 Firebase。
- 完成多人牌局後，可安全銜接未來的成就與排行榜。

## 2. 第一版建議範圍

### 2.1 建議納入

- 3～5 位已登入真人玩家。
- 建立私人房間。
- 使用 6 碼房間代碼加入。
- 房主可設定藝術家名稱並開始遊戲。
- 玩家自訂畫廊名稱。
- 大廳顯示玩家、房主、準備與連線狀態。
- 五種拍賣完整連線流程。
- 即時同步牌局、拍賣狀態、畫商席位、市場行情及拍賣動態。
- 玩家只能看見自己的手牌。
- 密封出價在全部完成前只顯示「已封標」，不顯示金額。
- 重新整理、短暫斷線及換頁後可回到牌局。
- 遊戲結束後保存最終排名與摘要。

### 2.2 建議暫不納入

- AI 與真人混合房間。
- 觀戰者。
- 公開房間列表與自動配對。
- 遊戲內聊天、好友、邀請通知。
- 中途加入正在進行的遊戲。
- 中途由新玩家取代離線玩家。
- 語音或視訊。
- 每回合強制倒數及自動代打。
- 排名賽、積分與競賽獎勵。

## 3. 核心架構決策：伺服器權威

多人版不可讓任何瀏覽器成為牌局資料的唯一權威。

推薦資料流：

```text
Vue UI
  │
  ├─ 讀取 ── Cloud Firestore onSnapshot
  │           ├─ 公開牌局狀態
  │           ├─ 公開玩家狀態
  │           ├─ 自己的私有手牌
  │           └─ 結構化遊戲事件
  │
  ├─ 行動 ── Cloud Functions HTTPS Callable
  │           ├─ 驗證 Firebase Auth
  │           ├─ 驗證房間成員與目前行動者
  │           ├─ 驗證 actionId、auctionId、stateVersion
  │           ├─ Firestore Transaction 讀取伺服器完整狀態
  │           ├─ 呼叫共用 Game Core 套用規則
  │           └─ 原子更新伺服器狀態與玩家可見投影
  │
  └─ Presence ─ Firebase Realtime Database
              ├─ online/offline
              ├─ onDisconnect
              └─ 多分頁 connectionId
```

### 3.1 為什麼不能由前端直接寫完整 GameState

目前單機版的 `GameState` 包含：

- 完整牌庫。
- 所有玩家手牌。
- 密封出價金額。
- 洗牌 seed 與 RNG 狀態。
- 玩家現金與結算結果。

如果將完整 `GameState` 放在所有玩家都能讀取的 Firestore Document，即使 UI 不顯示，玩家仍可從瀏覽器開發工具或 Firebase API 讀取秘密資料。

因此多人版必須拆成：

1. 只有 Cloud Functions 可讀寫的 Server State。
2. 所有房間成員可讀的 Public Projection。
3. 每位玩家只能讀取自己的 Private Projection。

## 4. Firebase 服務分工

| Firebase 功能 | 用途 | 是否為第一版必要 |
| --- | --- | --- |
| Firebase Authentication | 玩家 UID、登入、重新連線身分 | 必要 |
| Cloud Firestore | 房間、大廳、公開牌局、私有手牌、事件及結果 | 必要 |
| Cloud Functions 2nd gen | 建房、加入、開始、動作驗證、結算及資料投影 | 必要 |
| Realtime Database | 原生 Presence、`onDisconnect`、多分頁連線狀態 | 必要 |
| Firebase App Check | 降低腳本濫用 Functions 與資料庫 | 正式上線前必要 |
| Local Emulator Suite | 本機測試 Auth、Firestore、RTDB、Functions 與 Rules | 必要 |
| Firebase Hosting | 靜態網站部署 | 可選；可繼續使用 GitHub Pages |
| Cloud Storage | 圖片、附件 | 第一版不需要 |
| Analytics | 使用分析 | 第一版不需要 |

## 5. Firebase 區域與計費建議

### 5.1 區域

主要玩家若位於台灣，建議：

| 服務 | 建議區域 | 原因 |
| --- | --- | --- |
| Cloud Firestore | `asia-east1`（台灣） | 降低主要牌局狀態讀寫延遲 |
| Cloud Functions 2nd gen | `asia-east1`（台灣） | 與 Firestore 同區，降低交易延遲 |
| Realtime Database | `asia-southeast1`（新加坡） | RTDB 亞洲可選區域中最接近台灣 |

Firestore 與 RTDB 建立後都不能直接修改資料庫位置，必須在建立前 Review。

### 5.2 計費

部署 Cloud Functions 需要 Firebase Blaze 方案，因此正式開發多人版前需要：

- 綁定 Google Cloud Billing Account。
- 設定月預算與 50%、80%、100% 警示。
- 限制 Functions 最大執行個體數。
- 監控 Firestore reads、writes、Functions invocation 與 RTDB bandwidth。
- Development 與 Production 使用不同 Firebase Project，避免測試流量污染正式資料。

## 6. 建議專案結構

不需要立刻搬動整個 Vue 專案。建議在目前根目錄新增 pnpm workspace：

```text
WebModernArt/
├─ src/                              # 現有 Vue Web App
│  ├─ features/
│  │  └─ multiplayer/
│  │     ├─ components/
│  │     ├─ composables/
│  │     ├─ services/
│  │     │  ├─ room.service.ts
│  │     │  ├─ multiplayer-game.service.ts
│  │     │  └─ presence.service.ts
│  │     ├─ stores/
│  │     │  ├─ lobby.store.ts
│  │     │  ├─ multiplayer-game.store.ts
│  │     │  └─ connection.store.ts
│  │     ├─ types/
│  │     └─ views/
│  ├─ config/
│  │  └─ firebase.ts
│  └─ stores/
│     └─ auth.store.ts
├─ packages/
│  └─ game-core/                     # Web 與 Functions 共用的純 TypeScript 規則
│     ├─ src/
│     │  ├─ model.ts
│     │  ├─ actions.ts
│     │  ├─ engine.ts
│     │  ├─ deck.ts
│     │  ├─ random.ts
│     │  ├─ events.ts
│     │  ├─ projections.ts
│     │  └─ validation.ts
│     ├─ tests/
│     └─ package.json
├─ functions/
│  ├─ src/
│  │  ├─ callable/
│  │  │  ├─ create-room.ts
│  │  │  ├─ join-room.ts
│  │  │  ├─ update-lobby.ts
│  │  │  ├─ start-game.ts
│  │  │  ├─ submit-game-action.ts
│  │  │  └─ leave-room.ts
│  │  ├─ triggers/
│  │  │  ├─ expire-room.ts
│  │  │  └─ sync-presence-membership.ts
│  │  ├─ repositories/
│  │  │  ├─ room.repository.ts
│  │  │  └─ game.repository.ts
│  │  ├─ security/
│  │  │  ├─ require-auth.ts
│  │  │  └─ rate-limit.ts
│  │  ├─ config.ts
│  │  └─ index.ts
│  ├─ tests/
│  └─ package.json
├─ tests/
│  ├─ integration/
│  └─ e2e/
├─ firebase.json
├─ .firebaserc
├─ firestore.rules
├─ firestore.indexes.json
├─ database.rules.json
├─ pnpm-workspace.yaml
└─ .env.example
```

Functions 建議使用：

- TypeScript。
- Node.js 22。
- ECMAScript Modules。
- Cloud Functions 2nd gen。
- `asia-east1` 作為統一 Functions region。

## 7. Game Core 重構計畫

目前 `src/domain/game-engine.ts` 已具備多數規則，但在多人化前必須整理成真正可共用的純領域套件。

### 7.1 必須保持的原則

- 不 import Vue、Pinia、Firebase、DOM 或 LocalStorage。
- 不讀取前端環境變數。
- 不使用 `Math.random()` 或真實時間作為規則來源。
- 所有隨機結果由明確 seed 與 RNG state 控制。
- 所有真人、AI 與網路動作使用同一個合法動作驗證流程。
- 金額仍使用 `$1k` 整數單位。
- 每個狀態轉換可重現並能被單元測試。

### 7.2 需要調整的項目

1. 將目前字串型 `log.message` 改為結構化 Domain Event。
2. Game Core 不直接讀取自訂藝術家名稱。
3. UI 根據 Event type、playerId、artistId 與 amount 組合繁體中文訊息。
4. 多人 action 不接受可偽造的 `playerId`；Cloud Function 從 `request.auth.uid` 注入 actorId。
5. Server State 保存完整 deck、hands、sealed bids 與 RNG state。
6. Projection function 產生每位玩家可見的不同資料。

結構化事件範例：

```ts
type GameEvent =
  | {
      type: 'AUCTION_WON'
      round: number
      winnerId: string
      amount: number
      cardIds: string[]
    }
  | {
      type: 'PLAYER_PASSED'
      round: number
      playerId: string
      auctionId: string
    }
  | {
      type: 'ROUND_ENDED'
      round: number
      lastPlayerId: string
    }
```

## 8. Firestore 資料模型

### 8.1 建議路徑

```text
roomCodes/{ROOM_CODE}

rooms/{roomId}
rooms/{roomId}/members/{uid}
rooms/{roomId}/public/state
rooms/{roomId}/players/{uid}
rooms/{roomId}/privatePlayers/{uid}
rooms/{roomId}/events/{version}
rooms/{roomId}/actions/{actionId}
rooms/{roomId}/server/state
rooms/{roomId}/results/final
```

### 8.2 `rooms/{roomId}`

```ts
interface RoomDocument {
  roomCode: string
  status: 'lobby' | 'playing' | 'round-result' | 'finished' | 'abandoned'
  hostUid: string
  minPlayers: 3
  maxPlayers: 5
  memberCount: number
  settings: {
    artistNames: Record<string, string>
  }
  createdAt: Timestamp
  updatedAt: Timestamp
  expiresAt: Timestamp
}
```

房間代碼只是方便加入，不是授權憑證。所有加入與讀取仍必須驗證 Firebase Auth 及房間成員資格。

### 8.3 `members/{uid}`

```ts
interface RoomMemberDocument {
  uid: string
  role: 'host' | 'player'
  galleryName: string
  seatIndex: number
  ready: boolean
  joinedAt: Timestamp
}
```

### 8.4 `public/state`

所有房間成員可讀，但只有 Cloud Functions 可寫：

```ts
interface PublicGameState {
  schemaVersion: number
  stateVersion: number
  auctionId: string | null
  round: 1 | 2 | 3 | 4
  phase: string
  currentActorId: string | null
  auctioneerIds: string[]
  roundCounts: Record<string, number>
  marketHistory: unknown[]
  auction: PublicAuctionState | null
  lastAuctionResult: PublicAuctionResult | null
  roundResult: PublicRoundResult | null
  updatedAt: Timestamp
}
```

公開狀態禁止包含：

- 未發出的牌庫。
- RNG seed 或 RNG state。
- 其他玩家手牌內容。
- 尚未揭示的密封出價。
- Server-only action receipts。

### 8.5 `players/{uid}`

房間成員皆可讀：

```ts
interface PublicPlayerState {
  uid: string
  galleryName: string
  seatIndex: number
  cash: number
  handCount: number
  gallery: PublicGalleryEntry[]
  auctionStatus: 'waiting' | 'acting' | 'bid' | 'pass' | 'sealed' | null
  visibleBid?: number
}
```

密封拍賣只能公開 `auctionStatus: 'sealed'`，不可公開 `visibleBid`。

### 8.6 `privatePlayers/{uid}`

只有該 UID 可讀，只有 Cloud Functions 可寫：

```ts
interface PrivatePlayerState {
  hand: ArtworkCard[]
  legalActions: LegalAction[]
  updatedAt: Timestamp
}
```

### 8.7 `server/state`

所有 Web Client 一律拒絕讀寫，只有 Firebase Admin SDK 使用：

```ts
interface ServerGameState {
  stateVersion: number
  fullGameState: GameState
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### 8.8 `events/{version}`

每次成功動作新增一份結構化事件批次：

```ts
interface GameEventBatch {
  version: number
  actionId: string
  actorId: string
  events: GameEvent[]
  createdAt: Timestamp
}
```

客戶端只訂閱最近一段事件，例如最後 100 筆，避免把完整歷史不斷塞入單一 Document。Firestore Standard Document 上限為 1 MiB，因此狀態與歷史必須分開。

### 8.9 `actions/{actionId}`

Cloud Function 使用 action receipt 避免重複執行：

```ts
interface ProcessedAction {
  actorId: string
  stateVersionBefore: number
  stateVersionAfter: number
  result: 'accepted' | 'rejected'
  createdAt: Timestamp
}
```

前端不得自行建立或修改此文件。

## 9. Realtime Database Presence

Firestore 不具原生 Presence。第一版建議直接由 Web Client 訂閱 RTDB Presence，不必再鏡射回 Firestore，以減少額外 Functions 與寫入成本。

```text
roomMembers/{roomId}/{uid}: true
presence/{roomId}/{uid}/{connectionId}
```

每個瀏覽器分頁使用獨立 `connectionId`：

```ts
interface PresenceConnection {
  state: 'online'
  connectedAt: ServerTimestamp
  lastChanged: ServerTimestamp
}
```

流程：

1. Cloud Function 在玩家加入房間時寫入 `roomMembers`。
2. Client 確認 RTDB `.info/connected`。
3. Client 建立自己的 connection node。
4. 使用 `onDisconnect().remove()` 登記斷線清理。
5. 同一 UID 只要仍有一個 connection node，就視為在線。
6. RTDB Rules 僅允許房間成員讀 Presence，且玩家只能寫自己的 UID 路徑。

### 9.1 斷線策略

第一版建議：

- 非目前行動玩家斷線：牌局繼續。
- 輪到離線玩家：牌局顯示「等待重新連線」並暫停該玩家必要動作。
- 房主在遊戲開始後斷線：不終止牌局，Cloud Functions 仍為遊戲權威。
- 房主在大廳離開：將房主移交給最早加入且在線的玩家。
- 已開始的玩家不可被其他帳號取代。
- 房間至少保留 24 小時供玩家重連；實際 TTL 需 Review。

## 10. Callable Functions API

### 10.1 房間 API

```ts
createRoom({ galleryName, settings })
joinRoom({ roomCode, galleryName })
updateLobby({ roomId, ready?, settings? })
leaveRoom({ roomId })
startGame({ roomId })
```

規則：

- 所有 Callable 必須登入。
- `createRoom` 由伺服器產生 roomId 與唯一 6 碼 roomCode。
- `joinRoom` 必須在交易中檢查 room status、重複 UID 與 5 人上限。
- 只有 host 可修改房間設定與開始遊戲。
- `startGame` 必須確認總人數為 3～5 人且所有玩家 ready。
- 座位、起始玩家、seed、洗牌與發牌全部由伺服器決定。

### 10.2 遊戲動作 API

```ts
submitGameAction({
  roomId: string,
  actionId: string,
  auctionId: string | null,
  expectedVersion: number,
  action: ClientGameAction,
})
```

`ClientGameAction` 不包含 `playerId`，例如：

```ts
type ClientGameAction =
  | { type: 'PLAY_CARD'; cardId: string }
  | { type: 'ADD_DOUBLE_CARD'; cardId?: string }
  | { type: 'PLACE_BID'; amount: number }
  | { type: 'PASS' }
  | { type: 'SUBMIT_SEALED_BID'; amount: number }
  | { type: 'SET_FIXED_PRICE'; amount: number }
  | { type: 'RESPOND_FIXED_PRICE'; accept: boolean }
  | { type: 'CONTINUE_ROUND' }
```

Cloud Function 處理順序：

1. 驗證 Auth 與 App Check。
2. 使用 Zod 驗證 payload、金額與字串長度。
3. 確認 UID 是房間成員。
4. 交易中檢查 `actions/{actionId}` 是否已處理。
5. 讀取 `server/state`。
6. 確認 `auctionId`，避免上一場拍賣的延遲請求污染新拍賣。
7. 確認 stateVersion 與目前 phase。
8. 將 `request.auth.uid` 注入 Domain Action。
9. 呼叫 Game Core 驗證並產生新狀態。
10. 同一交易內寫入 Server State、Public State、Private Player States、Events 與 Action Receipt。
11. Client 透過 Firestore listener 收到新 stateVersion。

### 10.3 併發策略

- 所有狀態轉換使用 Firestore Transaction。
- 交易若遇到同一文件被修改，Firestore 會重新執行 transaction callback。
- Sequential Action 必須嚴格符合 `expectedVersion`。
- 公開競價可在相同 `auctionId` 下，以交易中的最新最高價重新驗證；只要金額仍合法，可接受稍舊的 version。
- 同一 `actionId` 重送只能得到原結果，不得重複扣款。
- 拍賣結算與市場結算必須具備「只能執行一次」的不變條件。

## 11. Firestore Security Rules 原則

### 11.1 Web Client 可讀範圍

- 已登入且為房間成員：可讀 `rooms/{roomId}`。
- 已登入且為房間成員：可讀 `members`、`public/state`、`players` 與 `events`。
- 玩家只能讀自己的 `privatePlayers/{uid}`。
- 使用者只能讀寫自己的 `users/{uid}` 個人資料。

### 11.2 Web Client 禁止範圍

- 禁止直接寫入 multiplayer room、member、state、players、events 與 results。
- 禁止讀寫 `server/state`。
- 禁止讀寫 `actions`。
- 禁止直接讀取 `roomCodes`；房間代碼解析一律透過 Callable Function。
- 禁止讀取其他玩家的 private player document。

Cloud Functions 使用 Admin SDK，會繞過 Firestore Security Rules，因此所有 Functions 必須自行執行 Authentication、Authorization 與輸入驗證，不能把安全責任只交給 Rules。

## 12. Authentication 與帳號策略

多人版需要穩定 UID 才能安全重連，第一版建議：

- 進入多人模式前必須登入。
- 支援 Google 與 Email／密碼。
- Email 帳號建議完成信箱驗證後才能建立房間。
- 單機模式仍允許訪客，不強制登入。
- 不在第一版啟用匿名帳號，避免匿名帳號換裝置後無法復原身分。

## 13. App Check 與防濫用

正式上線前建議使用 Web reCAPTCHA Enterprise Provider：

1. Development 先使用 App Check debug token。
2. Production 部署後先監看 metrics，不立即 enforce。
3. 確認合法流量都帶 token 後，再對 Functions、Firestore 與 RTDB 啟用 enforcement。
4. Callable Functions 設定 `enforceAppCheck: true`。

App Check 不能取代：

- Firebase Auth。
- 房間成員授權。
- Security Rules。
- Functions 輸入驗證。
- 以 UID 與時間窗實作的動作 rate limit。

## 14. 前端架構

### 14.1 建議路由

```text
/                                  首頁與單機入口
/multiplayer                       多人入口：建立／加入房間
/multiplayer/:roomId               房間大廳
/multiplayer/:roomId/game          多人牌局
```

### 14.2 Pinia Stores

| Store | 責任 |
| --- | --- |
| `auth.store.ts` | 登入者、登入初始化與登出 |
| `lobby.store.ts` | 房間、成員、ready 與 host 操作 |
| `multiplayer-game.store.ts` | 組合 public state、players、自己的 private state 與 events |
| `connection.store.ts` | Firestore listener、RTDB Presence、重連與錯誤狀態 |
| 現有 `game.store.ts` | 保留單機遊戲，不直接改成網路 store |

### 14.3 前端同步原則

- Firestore snapshot 才是多人 UI 的已確認狀態。
- 不直接在 Pinia 修改多人 GameState。
- 送出 action 後只顯示 pending feedback，不先假裝扣款或得標。
- action pending 時停用相同按鈕，避免重複點擊。
- 收到較新的 stateVersion 後解除 pending。
- listener 解除、切換房間與登出時必須清理 unsubscribe。
- Firestore 離線 cache 只能用來顯示最後快照，不能在離線時提交權威遊戲動作。

### 14.4 連線 UX

至少需要以下狀態：

- 正在連線。
- 已同步。
- 連線中斷，正在重試。
- 等待某玩家重新連線。
- 你的動作正在送出。
- 狀態已更新，請重新操作。
- 房間不存在、已滿、已開始或已過期。
- 此帳號不是房間成員。

## 15. Firebase 前端參數

在既有 Firebase Auth Plan 基礎上增加：

```dotenv
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_DATABASE_URL=

VITE_FIREBASE_FUNCTIONS_REGION=asia-east1
VITE_FIREBASE_APP_CHECK_SITE_KEY=
VITE_FIREBASE_USE_EMULATOR=false
VITE_MULTIPLAYER_ENABLED=false
```

這些 `VITE_` 值會進入瀏覽器，不得放入 Admin SDK 私鑰或任何後端 Secret。

Functions 非敏感設定：

```text
FUNCTIONS_REGION=asia-east1
ROOM_CODE_LENGTH=6
ROOM_TTL_HOURS=24
MIN_PLAYERS=3
MAX_PLAYERS=5
```

Service Account 不應存入 Git；部署至 Cloud Functions 時使用平台提供的 Application Default Credentials。

## 16. Emulator Suite 規劃

本機統一使用一個 Development Project ID，避免服務彼此連到不同專案。

| Emulator | 建議 Port |
| --- | ---: |
| Emulator UI | 4000 |
| Functions | 5001 |
| Firestore | 8080 |
| Realtime Database | 9000 |
| Authentication | 9099 |

建議指令：

```text
firebase emulators:start --only auth,firestore,database,functions
firebase emulators:exec --only auth,firestore,database,functions "pnpm test:integration"
```

測試程式必須明確連接所有 Emulator；若任一需要的 Emulator 未啟動，測試應直接失敗，不能誤寫 Production。

## 17. 測試策略

### 17.1 Game Core 單元測試

- 現有五種拍賣規則全部搬移並保持通過。
- 同 seed 與 action sequence 得到相同結果。
- 玩家不可超額出價。
- 第五張立即結束輪次。
- 聯合拍賣角色與金流守恆。
- 密封出價 tie-break。
- 每個動作只能結算一次。

### 17.2 Projection 隱私測試

- Public Projection 不包含 deck、seed、RNG state。
- 玩家 A 的資料不包含玩家 B 手牌。
- 密封拍賣完成前不包含其他玩家金額。
- Private Projection 只包含該玩家的手牌與合法動作。

### 17.3 Functions 整合測試

- 未登入不能建房、加入或送出動作。
- 非成員不能讀取房間或送出動作。
- 房間滿員、重複加入與已開始房間的處理。
- 非 host 不能開始遊戲。
- 同一 actionId 重送不重複執行。
- 兩個玩家同時出價時，交易維持有效最高價。
- 舊 auctionId 的延遲動作被拒絕。
- 自己得標、聯合拍賣及銀行付款正確。

### 17.4 Security Rules 測試

- 成員可讀 public state。
- 非成員不可讀。
- 玩家只能讀自己的 private state。
- 所有 client 對 server state 與 action receipts 的讀寫都失敗。
- 所有 client 對多人核心狀態的直接寫入都失敗。
- RTDB Presence 只能由該 UID 寫入自己的 connection path。

### 17.5 多瀏覽器 E2E

使用至少三個獨立 Browser Context：

1. 三個測試帳號登入。
2. 建房、輸入代碼、ready、開始。
3. 執行每種拍賣至少一次。
4. 驗證手牌隔離。
5. 模擬同時出價。
6. 關閉其中一個 context 並驗證 offline。
7. 重新開啟並以同 UID 回到牌局。
8. 完成四輪並比對三個畫面的最終排名。

## 18. 實作階段與 Review Gate

### Phase 0：產品決策

- 確認登入是否為多人模式必要條件。
- 確認第一版是否只允許 3～5 位真人。
- 確認斷線與房間過期策略。
- 確認 Firestore、Functions、RTDB 區域。
- 確認 Blaze 與預算警示。

完成條件：本文件的第 20 節全部核准。

### Phase 1：Firebase Auth 與專案環境

- 執行既有 Firebase Auth Plan。
- 建立 Development 與 Production Firebase Projects。
- 加入 `.env.example` 與 Emulator 開關。

完成條件：登入、登出、Emulator 與 production build 驗證通過。

### Phase 2：抽離 `game-core`

- 建立 workspace package。
- 將 domain model、deck、random、engine 移入共用套件。
- 將文字 log 改為結構化事件。
- Web 單機模式改用共用 package。

完成條件：現有單機測試與 UI 行為不變。

### Phase 3：Firebase Backend 骨架

- 初始化 Functions、Firestore、RTDB 與 Emulator。
- 建立 Rules、Indexes、Repositories 與 Callable 共用 middleware。
- 建立 server/public/private projection。

完成條件：Emulator 中可以建立房間，且 server state 對 client 完全不可讀。

### Phase 4：大廳與 Presence

- 建房、加入、ready、host 設定與開始。
- RTDB Presence 與斷線顯示。
- 房間人數與權限驗證。

完成條件：3～5 個瀏覽器可進入同一房間並同步狀態。

### Phase 5：多人牌局

- `submitGameAction` transaction。
- 五種拍賣、回合結算與終局。
- 公開／私有狀態 listener。
- pending、stale state、錯誤與重連 UI。

完成條件：三位真人可從第一輪玩到第四輪，且所有 client 最終結果一致。

### Phase 6：安全與穩定性

- Rules automated tests。
- App Check metrics 與 enforcement。
- Rate limit、最大 Functions instances、預算警示。
- 併發、重送、斷線及恢復測試。

完成條件：Production checklist 與多人 E2E 全部通過。

### Phase 7：成就整合

- 只在伺服器確認 `finished` 後計算可信任成就。
- Cloud Function 寫入 `users/{uid}/achievements`。
- 客戶端不得自行宣告多人競賽型成就解鎖。

## 19. 驗收條件

- 3～5 位登入玩家能建立及完成一場遊戲。
- 所有玩家的公開狀態最終一致。
- 玩家只能讀取自己的手牌。
- 密封出價揭示前沒有任何 Client 能讀取他人金額。
- Client 無法直接修改現金、手牌、牌庫或結算結果。
- 同一動作重送不會重複執行。
- 同時出價不會造成負現金或錯誤得標。
- 玩家重新整理後可恢復自己的座位與手牌。
- 玩家多分頁登入時 Presence 正確。
- 房主遊戲中斷線不會摧毀牌局。
- 單機模式不登入、不連 Firebase 時仍可正常遊玩。
- Emulator、Rules、Functions integration 與多瀏覽器 E2E 測試通過。

## 20. 請 Review 的決策

目前建議預設如下：

| 決策 | 建議預設 |
| --- | --- |
| 多人模式登入 | 必須登入；單機仍可訪客 |
| 登入方式 | Google＋Email／密碼 |
| 玩家組成 | 第一版只做 3～5 位真人，不混 AI |
| 房間類型 | 私人 6 碼代碼，不做公開列表 |
| 中途加入 | 不允許；原玩家可重連 |
| 斷線處理 | 輪到離線玩家時暫停等待，不自動代打 |
| 房間保存時間 | 最後活動後保留 24 小時 |
| 觀戰與聊天 | 第一版不做 |
| Firestore | `asia-east1` 台灣 |
| Functions | 2nd gen、Node 22、`asia-east1` 台灣 |
| Realtime Database | `asia-southeast1` 新加坡，只負責 Presence |
| Firebase Projects | Development 與 Production 分開 |
| Firebase 方案 | Blaze，並設定預算警示與 Functions 上限 |
| 網站部署 | 可維持現有方式，不強制改用 Firebase Hosting |
| 多人功能發布 | `VITE_MULTIPLAYER_ENABLED` feature flag 分階段開啟 |

## 21. 參考資料

- [Firebase Authentication for Web](https://firebase.google.com/docs/auth/web/start)
- [Cloud Firestore realtime listeners](https://firebase.google.com/docs/firestore/query-data/listen)
- [Cloud Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions)
- [Call Cloud Functions from your app](https://firebase.google.com/docs/functions/callable)
- [Cloud Functions runtime and deployment](https://firebase.google.com/docs/functions/manage-functions)
- [Cloud Functions locations](https://firebase.google.com/docs/functions/locations)
- [Cloud Firestore locations](https://firebase.google.com/docs/firestore/locations)
- [Cloud Firestore Security Rules conditions](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [Test Firestore Security Rules](https://firebase.google.com/docs/firestore/security/test-rules-emulator)
- [Build Presence with Firebase](https://firebase.google.com/docs/firestore/solutions/presence)
- [Realtime Database Security Rules](https://firebase.google.com/docs/database/security/rules-conditions)
- [Realtime Database locations](https://firebase.google.com/docs/database/locations)
- [Firebase App Check for Web](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider)
- [Firebase Local Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Cloud Firestore usage and limits](https://firebase.google.com/docs/firestore/quotas)
