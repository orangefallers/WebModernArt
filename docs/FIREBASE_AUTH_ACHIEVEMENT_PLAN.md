# Firebase SDK、會員登入與成就系統前置規劃

## 文件資訊

- 專案：WebModernArt
- 文件狀態：待 Review
- 建立日期：2026-08-27
- 適用技術：Vue 3、TypeScript、Pinia、Vue Router、Vite
- 本階段範圍：Firebase SDK、會員登入、Firestore 前置設定
- 本階段不包含：成就條件、成就 UI、正式成就寫入邏輯

## 1. 目標

在不影響現有單人遊戲與訪客模式的前提下，完成 Firebase 基礎建設與會員登入能力，作為後續成就系統跨裝置同步的基礎。

第一版預計支援：

- Google 帳號登入
- Email／密碼註冊與登入
- 登出
- 重新整理或關閉瀏覽器後保留登入狀態
- 訪客可繼續遊玩
- 只有登入使用者能同步成就
- Firebase Authentication 管理帳號
- Cloud Firestore 預留會員與成就資料
- Firebase Local Emulator 支援本機整合測試

本階段暫不啟用：

- Google Analytics
- Cloud Storage
- Cloud Functions
- App Check 強制驗證

## 2. 建議方案

採用 Firebase 模組化 Web SDK，配合目前 Vite 的模組打包與 tree-shaking 架構。

整體流程：

```text
網站啟動
  ↓
初始化 Firebase App、Authentication、Firestore
  ↓
監聽 Firebase 登入狀態
  ├─ 已登入：載入會員資料，開啟成就同步能力
  └─ 未登入：維持訪客模式，不影響單人遊戲
```

登入不應成為進入 `/game` 的必要條件。使用者即使未登入，也能維持目前的遊戲體驗。

## 3. Firebase Console 設定

### 3.1 建立 Firebase Project

建議設定：

| 項目 | 建議值 | 備註 |
| --- | --- | --- |
| Project display name | `Web Modern Art` | 可修改 |
| Project ID | `web-modern-art` 或可用的唯一名稱 | 必須全域唯一，建立前需確認 |
| Google Analytics | 關閉 | 本階段不需要 |

若未來需要區分測試與正式資料，建議建立兩個 Firebase Project：

- Development：本機開發與測試
- Production：正式網站使用

避免本機測試帳號及資料寫入正式環境。

### 3.2 註冊 Web App

建議 Web App 暱稱：

```text
WebModernArt Web
```

註冊後，Firebase Console 會提供 Web Config，包含：

```ts
const firebaseConfig = {
  apiKey: '...',
  authDomain: '...',
  projectId: '...',
  storageBucket: '...',
  messagingSenderId: '...',
  appId: '...',
}
```

### 3.3 啟用 Authentication

第一版建議啟用：

- Email/Password
- Google

Google Provider 需要另外設定：

- 專案公開名稱
- 支援信箱
- 授權網域

目前本機使用 `http://127.0.0.1:5173`，開發環境預計加入以下授權網域：

```text
127.0.0.1
localhost
```

正式部署後，還需加入實際正式網域，例如 GitHub Pages 網域或自訂網域。

### 3.4 建立 Cloud Firestore

建議設定：

| 項目 | 建議值 |
| --- | --- |
| Database edition | Standard |
| Security mode | Production mode |
| Region | `asia-east1`（台灣） |

Firestore 建立後不能修改資料庫地區，因此必須在建立前確認主要使用者所在地與未來後端服務位置。

## 4. 前端環境參數

新增可提交至 Git 的 `.env.example`：

```dotenv
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# 僅啟用 Google Analytics 時需要
VITE_FIREBASE_MEASUREMENT_ID=

# 專案自訂開關；本機需要連接 Emulator 時設為 true
VITE_FIREBASE_USE_EMULATOR=false
```

實際 Firebase 設定值放在：

```text
.env.local
```

目前專案的 `.gitignore` 已排除 `.env` 與 `.env.*`，並允許提交 `.env.example`。

### 4.1 安全性說明

Firebase Web Config 會被打包到瀏覽器端，其中的 Firebase API Key 是用來識別 Firebase Project，不是資料存取密碼。

資料安全不能依賴隱藏 Web Config，必須使用：

- Firebase Authentication
- Firestore Security Rules
- 適當的 API restrictions
- 後續視需求加入 Firebase App Check

以下內容禁止放進 Vue 前端或 `VITE_` 環境變數：

- Firebase Admin SDK 私鑰
- Service Account JSON
- Private Key
- Cloud Functions 或其他後端密鑰

## 5. 預計專案結構

```text
src/
├── config/
│   └── firebase.ts
├── services/
│   ├── auth.service.ts
│   └── user-profile.service.ts
├── stores/
│   └── auth.store.ts
├── types/
│   └── auth.ts
├── components/
│   └── auth/
│       ├── AuthDialog.vue
│       ├── EmailLoginForm.vue
│       └── UserAccountMenu.vue
└── env.d.ts

.env.example
firebase.json
firestore.rules
```

### 5.1 各模組責任

| 檔案 | 責任 |
| --- | --- |
| `src/config/firebase.ts` | 驗證環境參數、初始化 Firebase App、Auth、Firestore，以及選擇性連接 Emulator |
| `src/services/auth.service.ts` | Email 註冊、Email 登入、Google 登入、登出、寄送驗證信等 Firebase 呼叫 |
| `src/services/user-profile.service.ts` | 建立或更新 Firestore 會員基本資料 |
| `src/stores/auth.store.ts` | 管理目前使用者、初始化狀態、登入狀態與可顯示錯誤 |
| `src/types/auth.ts` | 定義前端使用的會員與登入狀態型別，避免 UI 直接依賴完整 Firebase User 物件 |
| `src/components/auth/AuthDialog.vue` | 登入與註冊對話框 |
| `src/components/auth/EmailLoginForm.vue` | Email／密碼輸入、驗證及錯誤顯示 |
| `src/components/auth/UserAccountMenu.vue` | 顯示登入者名稱、Email、頭像及登出操作 |
| `src/env.d.ts` | 宣告 Firebase Vite 環境變數型別 |
| `firestore.rules` | 限制使用者只能讀寫自己的資料 |

## 6. 實作階段

### Phase 1：SDK 與環境設定

1. 安裝 `firebase` 套件。
2. 建立 `.env.example`。
3. 擴充 `src/env.d.ts` 的環境參數型別。
4. 建立 Firebase 初始化模組。
5. 當必要參數缺漏時，在開發環境提供明確錯誤。
6. 正式建置時不得意外連接 Emulator。

### Phase 2：Authentication Service 與 Store

1. 建立 Email／密碼註冊。
2. 建立 Email／密碼登入。
3. 建立 Google Popup 登入。
4. 建立登出功能。
5. 使用 `onAuthStateChanged` 同步登入狀態。
6. 維持 Firebase Web 預設的 local persistence。
7. 將 Firebase 錯誤碼轉成可理解的繁體中文訊息。
8. Email 註冊後寄出驗證信。

`auth.store.ts` 預計至少提供：

```ts
interface AuthState {
  user: AuthUser | null
  initialized: boolean
  loading: boolean
  error: string | null
}
```

### Phase 3：登入 UI

首頁右上角新增帳號入口：

- 未登入：顯示「登入／註冊」
- 已登入：顯示頭像或玩家名稱
- 點擊已登入帳號：顯示帳號資訊與登出

登入對話框包含：

- Google 登入按鈕
- Email
- 密碼
- 登入／註冊模式切換
- 載入狀態
- 欄位驗證與錯誤訊息

登入 UI 不得遮斷現有「進入拍賣會」與遊戲設定流程。

### Phase 4：會員資料與 Firestore Rules

登入成功後建立或更新會員資料：

```text
users/{uid}
```

預計資料格式：

```ts
interface UserProfile {
  displayName: string
  email: string
  photoURL: string | null
  createdAt: Timestamp
  lastLoginAt: Timestamp
}
```

Security Rules 原則：

- 未登入者不可讀寫會員資料。
- 使用者只能讀取自己的 `users/{uid}`。
- 使用者只能寫入自己的 `users/{uid}`。
- 限制允許寫入的欄位與資料型別。
- 不允許前端任意修改具權限意義的欄位。

### Phase 5：本機測試環境

預留 Firebase Local Emulator：

| Emulator | 預設位置 |
| --- | --- |
| Authentication | `http://127.0.0.1:9099` |
| Firestore | `http://127.0.0.1:8080` |
| Emulator Suite UI | `http://127.0.0.1:4000` |

Emulator 只在下列條件同時成立時連接：

```text
Vite development mode
+
VITE_FIREBASE_USE_EMULATOR=true
```

## 7. 成就資料預留設計

初步建議使用：

```text
users/{uid}
users/{uid}/achievements/{achievementId}
```

成就進度範例：

```ts
interface UserAchievement {
  unlockedAt: Timestamp | null
  progress: number
  target: number
  version: number
}
```

成就名稱、說明、圖示與條件定義可先存在前端的靜態設定，Firestore 僅保存每位使用者的進度與解鎖結果。

### 7.1 成就可信度風險

目前遊戲完全在瀏覽器執行。如果由前端直接判定並寫入成就，熟悉瀏覽器工具的使用者可能偽造成就資料。

可選方案：

| 方案 | 優點 | 風險／成本 |
| --- | --- | --- |
| 前端判定 | 實作快、成本低，適合休閒型成就 | 使用者可竄改結果 |
| Cloud Functions 或可信任後端驗證 | 較適合排行榜、競爭或獎勵功能 | 需要後端規格、部署與可能的付費方案 |

本階段只建立登入與資料結構，不決定成就驗證方案。成就系統正式實作前必須再次 Review。

## 8. 驗證與驗收條件

### 8.1 功能驗收

- 使用者能使用 Email／密碼註冊。
- 使用者能使用 Email／密碼登入。
- 使用者能使用 Google 登入。
- 使用者能登出。
- 頁面重新整理後仍能還原登入狀態。
- Email 已使用、密碼錯誤等狀況會顯示可理解的訊息。
- 未登入使用者仍可開始及完成單人遊戲。
- Firebase 暫時無法連線時，不應破壞訪客遊戲功能。
- 已登入使用者能建立自己的會員資料。
- 使用者不能讀取或修改其他 UID 的資料。

### 8.2 工程驗收

- TypeScript typecheck 通過。
- ESLint 通過。
- 既有單元測試通過。
- 新增 Authentication Store 與 Service 單元測試。
- 使用 Emulator 驗證註冊、登入與 Firestore Rules。
- 正式建置成功。
- 正式 build 不包含 Emulator 連線。
- Git 不包含 `.env.local`、Service Account 或私鑰。

## 9. 正式部署檢查

1. 在部署平台設定正式 Firebase 環境參數。
2. 將正式網站網域加入 Firebase Authentication Authorized Domains。
3. 確認正式環境沒有啟用 Emulator。
4. 確認 Firestore Rules 已部署且不是測試模式。
5. 確認 Firebase API Key 只允許必要的 Firebase API。
6. 移除正式 Firebase Project 中不必要的開發授權網域。
7. 視流量與濫用風險評估 App Check。

## 10. Review 決策項目

開始實作前需確認：

1. 是否採用 Google＋Email/Password 兩種登入方式。
2. 是否維持訪客可遊玩，登入只用於同步成就。
3. 是否只有 Email 完成驗證後才允許同步成就。
4. Firestore 是否採用 `asia-east1`（台灣）。
5. 是否關閉 Google Analytics。
6. 是否先不使用 Cloud Functions。
7. 是否建立 Development 與 Production 兩個 Firebase Project。
8. 正式部署預計使用的網域。

## 11. 參考資料

- [Add Firebase to your JavaScript project](https://firebase.google.com/docs/web/setup)
- [Get Started with Firebase Authentication on Websites](https://firebase.google.com/docs/auth/web/start)
- [Authenticate Using Google with JavaScript](https://firebase.google.com/docs/auth/web/google-signin)
- [Authentication State Persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence)
- [Firebase Authentication FAQ](https://firebase.google.com/docs/auth/faq-and-troubleshooting)
- [Cloud Firestore locations](https://firebase.google.com/docs/firestore/locations)
- [Cloud Firestore Security Rules conditions](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [Connect to the Authentication Emulator](https://firebase.google.com/docs/emulator-suite/connect_auth)
- [Learn about Firebase API keys](https://firebase.google.com/docs/projects/api-keys)
