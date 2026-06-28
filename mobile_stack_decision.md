# モバイル/Web UI スタック選定メモ

## 結論

MVP は **React Native + Expo dev build + TypeScript** を第一候補にする。

理由は、現時点の優先度が以下だからである。

- モバイル重視だが、Web も作り込みたい
- React に慣れているため初速を出しやすい
- 地図、GPS、通知、カメラを使いたい
- 将来の作り替え余地を残しながら、まず検証したい
- GPS は高精度な移動軌跡が必要だが、常時追跡レベルまでは未確定

ただし、最初に作るべきものは本体アプリではなく、**バックグラウンド GPS 検証アプリ**である。

## 最初に検証すること

React Native / Expo 採用の最大リスクは、バックグラウンド位置情報の精度と安定性である。

最初の検証では以下を確認する。

- `expo-location` と `expo-task-manager` でバックグラウンド位置取得できるか
- iOS で画面ロック中に軌跡が十分残るか
- Android で省電力設定やメーカー差の影響が許容できるか
- 取得間隔、距離フィルタ、精度、バッテリー消費のバランス
- App Store / Google Play の権限説明に耐える利用目的を設計できるか

検証条件の例:

- 10 分歩行
- 30 分移動
- 画面ロック
- アプリをバックグラウンド化
- 電車または車での移動
- 通信が不安定な場所での再同期

## 採用候補スタック

### App

- Node.js 24 LTS
- nvm
- React Native
- Expo dev build
- TypeScript
- Expo Router
- Zustand または Jotai
- TanStack Query
- expo-location
- expo-task-manager
- expo-notifications
- expo-camera

### Map

MVP では以下のどちらかに絞る。

- Google Maps
- Mapbox

地図表示、ルート表現、POI 表示、料金、商用利用条件を比較して決める。

### Web

- React
- Next.js
- TypeScript

モバイルアプリと Web で完全に UI を共通化するより、以下を共通化する。

- 型
- API クライアント
- ドメインロジック
- バリデーション
- 定数

画面 UI は、モバイルと Web で分けてもよい。

### Backend

MVP は既存の小さなバックエンド方針を活かし、必要になった段階で以下へ拡張する。

- FastAPI または Fastify / NestJS
- PostgreSQL + PostGIS
- Redis
- Queue worker
- Object storage

重要なのは、クライアントで達成判定を確定しないことである。

```text
GPS 点を送る
-> サーバーで精度、時刻、速度、距離、滞在時間を検証
-> Action 達成を判定
-> Reward / Achievement を発行
```

## 疎結合にする方針

位置情報、通知、カメラ、地図を画面から直接呼ばない。

```text
app/             画面とルーティング
features/        地図、撮影、通知、Action 実行などの機能単位
domain/          User, Place, Plan, ActionRun, Reward などの型と純粋ロジック
services/        LocationService, CameraService, NotificationService, MapService
api/             HTTP クライアント
components/      UI 部品
```

例:

```ts
type LocationService = {
  getCurrentPosition(): Promise<Coordinate>;
  startBackgroundTracking(): Promise<void>;
  stopBackgroundTracking(): Promise<void>;
};
```

この形にしておけば、Expo から React Native bare、または Flutter へ移る場合でも、ドメイン設計と API 設計を残しやすい。

## Pokémon GO から参考にする設計思想

実装をそのまま真似るのではなく、以下の考え方を取り入れる。

- 現実世界の移動、滞在、来訪、経由をアプリ内の Action に変換する
- クライアントは GPS、地図、カメラ、体験表示に集中する
- Action 達成、報酬、課金、検収はサーバー側で判定する
- POI、イベント、報酬、配信条件をデータ駆動にする
- GPS 誤差、不正、通信断、再送を前提にする

特に、報酬や達成判定をクライアントだけで確定させない。

## 今は重すぎるスタック

以下は将来的に必要になる可能性はあるが、MVP では採用しない。

### Kubernetes

大規模トラフィックや複数マイクロサービスが必要になるまでは重い。

MVP では Cloud Run、ECS、Fly.io、Render、Railway などのコンテナ実行環境で十分。

### Unity

3D キャラクター、AR バトル、リアルタイム演出が中核になるまでは重い。

位置情報、地図、写真、通知、Web 連携が中心なら React Native のほうが初速を出しやすい。

### Flutter

モバイル UI 品質だけを見ると有力だが、今回は React 経験と Web 作り込みを活かしたい。

GPS 検証で React Native / Expo が厳しいと分かった段階で再比較する。

### マイクロサービス

MVP では分けすぎない。

最初は modular monolith として作り、境界だけ明確にする。

分離候補は以下。

- Location ingest
- Action verification
- Reward issuance
- Notification dispatch
- Analytics

### Kafka

高スループットのイベントストリームが必要になるまでは重い。

MVP では DB テーブル、軽量 queue、またはクラウドの managed queue でよい。

### GraphQL

クライアントの取得要件が複雑になるまでは REST で十分。

管理画面、モバイル、Web の要求が大きく分かれてきた段階で検討する。

### 独自地図基盤

地図タイル、ルーティング、ジオコーディングを自前で持つのは重い。

MVP では Google Maps または Mapbox を使う。

### 独自 AR / VPS

現実空間への高精度 AR 配置が中核になるまでは重い。

まずは GPS、ジオフェンス、QR、カメラ投稿で体験を作る。

### データウェアハウス

初期から BigQuery や Snowflake を前提にしない。

まずは PostgreSQL にイベントを蓄積し、必要になったら分析基盤へ流す。

### 複雑な不正検知基盤

最初から機械学習の不正検知は不要。

MVP では以下のルールベースで始める。

- GPS 精度が悪すぎる点を除外
- 異常な移動速度を suspicious にする
- 記録時刻の逆転や未来時刻を拒否
- 短時間で遠距離に飛ぶ点を suspicious にする
- QR や写真など複数証跡で補強する

## MVP に必要なものだけ

最初に作る範囲は以下に絞る。

- ユーザー認証
- 現在地取得
- バックグラウンド位置取得の検証
- 地図表示
- Plan 候補表示
- Action 開始
- GPS イベント送信
- 滞在、経由、到着のサーバー判定
- Reward 発行
- 通知
- カメラまたは QR による補助検証
- 管理者向けの簡易 Plan / Place 登録

やらないこと:

- 本格 AR
- 3D ゲーム
- Kubernetes
- Kafka
- 複数マイクロサービス
- 独自地図基盤
- 高度な BI / DWH
- ML 不正検知
- 完全な UI 共通化

## 撤退基準

React Native + Expo で進めるかどうかは、GPS 検証で判断する。

React Native + Expo を継続する条件:

- バックグラウンドで移動軌跡が実用上十分に残る
- バッテリー消費が許容範囲
- iOS / Android の権限 UX が説明可能
- Expo dev build の範囲で必要機能が実装できる

React Native bare または Flutter を再検討する条件:

- 軌跡の欠損が多い
- バックグラウンド制御にネイティブ調整が必要
- 地図や位置情報ライブラリの制約が大きい
- Expo の抽象化が邪魔になる

## 次の一手

1. React Native + Expo dev build で GPS 検証アプリを作る
2. 実機で iOS / Android のバックグラウンド軌跡を測る
3. 結果をもとに React Native 継続、bare 化、Flutter 再比較を決める
4. 問題なければ MVP 本体の画面と API を作る
