# マラソン大会カレンダー 現行仕様書

## 概要
マラソン大会の情報を閲覧し、お気に入り登録した大会の申込開始日が近づいたらブラウザ通知でリマインドするWebアプリケーション。

**公開URL:** https://aizen-aizen.github.io/marathon-calendar/

---

## 技術スタック

| コンポーネント | 技術 |
|---------------|------|
| ホスティング | GitHub Pages |
| 認証 | Firebase Authentication（Googleログイン） |
| データベース | Firebase Firestore |
| 通知 | Firebase Cloud Messaging (FCM) |
| スケジューラ | Firebase Cloud Functions |
| フレームワーク | Vanilla JS + HTML/CSS |

---

## 実装済み機能

### 1. 大会一覧表示（Phase 1）
- `data/marathons.json` から大会情報を読み込み一覧表示
- カード表示 / テーブル表示の切り替え
- 表示項目：大会名、種別、開催日、定員、申込期間、申込方法、倍率
- フィルタリング：種別（フル/ウルトラ）、受付中のみ、お気に入りのみ

### 2. ユーザー認証（Phase 1）
- Googleアカウントでログイン/ログアウト
- ログイン状態の永続化
- 未ログイン時はお気に入り機能を制限

### 3. お気に入り登録（Phase 1）
- 各大会に「お気に入り」ボタン（☆/⭐）
- お気に入り登録時にFirestoreへ保存
- ユーザーごとにお気に入りリストを管理

### 4. ステータス管理（Phase 2）
- マイページ（`mypage.html`）でお気に入り大会を一覧表示
- 各大会に対して以下のステータスを記録：
  - 申込: 未申込 / 申込済 / 当選待ち / 落選
  - 宿泊: 未手配 / 予約済 / 不要
  - 移動: 未手配 / 飛行機 / 新幹線 / 電車 / 車 / バス / 不要

### 5. ブラウザ通知（Phase 3）
- 申込開始7日前・1日前にプッシュ通知
- Cloud Functionsが毎日09:00 JSTに実行
- 通知許可フロー（マイページで許可を求める）
- 通知クリックでアプリを開く

---

## ファイル構成

```
/
├── index.html          # 大会一覧ページ
├── mypage.html         # マイページ
├── css/
│   └── style.css       # スタイルシート
├── js/
│   ├── app.js          # メインアプリロジック
│   ├── auth.js         # 認証モジュール
│   ├── firestore.js    # Firestore操作
│   ├── mypage.js       # マイページロジック
│   └── notifications.js # 通知モジュール
├── data/
│   └── marathons.json  # 大会データ
├── firebase-messaging-sw.js  # Service Worker
├── firebase.json       # Firebase設定
└── functions/
    ├── index.js        # Cloud Functions
    └── package.json
```

---

## Firestoreデータ構造

```
users/
  {userId}/
    fcmToken: string              # プッシュ通知用トークン
    updatedAt: timestamp
    
    favorites/
      {marathonId}/
        marathonName: string
        entryStart: string
        date: string
        type: string
        url: string
        status:
          application: string     # none/applied/waiting/rejected
          accommodation: string   # none/booked/not_needed
          transportation: string  # none/plane/shinkansen/train/car/bus/not_needed
        notificationSent:
          sevenDays: boolean
          oneDay: boolean
        createdAt: timestamp
        updatedAt: timestamp
```

---

## 既知の制限

1. **通知は1デバイスのみ**: 複数デバイスで同じアカウントを使用した場合、最後に登録したデバイスのみ通知を受信
2. **iOS Safariの制限**: PWA化しないとプッシュ通知を受信できない
3. **オフライン非対応**: ネットワーク接続が必要

---

## 更新日
2026-02-07
