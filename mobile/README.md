# GeoAction Travel Mobile

React Native + Expo dev build のモバイル/Web UI。

## 前提

Node.js は nvm で管理し、Node 24 LTS を使う。

この環境には Node.js / npm が入っていないため、依存関係のインストールと起動は未実行。

初回セットアップ:

```bash
nvm install
nvm use
```

`nvm use` はリポジトリルートの `.nvmrc` を読み、Node 24 を使う。

ローカルで動かす場合:

```bash
nvm use
cd mobile
npm install
npx expo install --fix
npm run start
```

実機でバックグラウンド GPS を検証する場合は Expo Go ではなく dev build を使う。

```bash
nvm use
cd mobile
npm run start:dev
```

別ターミナル:

```bash
nvm use
cd mobile
npx expo run:ios
npx expo run:android
```

## Android

Android で動かすには以下が必要。

- Android Studio
- Android SDK
- Android Emulator または USB デバッグを有効化した Android 実機
- Expo development build

`.env` を作成する。

```bash
cd mobile
cp .env.example .env
```

Android エミュレータからローカルバックエンドへ接続する場合:

```text
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000
```

Android 実機から接続する場合:

```text
EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:8000
```

Android ビルド:

```bash
nvm use
cd mobile
npm install
npx expo install --fix
npx expo run:android
```

2 回目以降、ネイティブ設定を変えていない場合:

```bash
npm run start:dev
```

バックグラウンド位置情報は実機検証を優先する。Android は省電力設定やメーカー差で挙動が変わるため、エミュレータだけで採用判断しない。

## Backend

別ターミナルでバックエンドを起動する。Android 実機から接続する場合もあるため、`127.0.0.1` ではなく `0.0.0.0` で待ち受ける。

```bash
python3 -m geoaction_backend.server --host 0.0.0.0 --port 8000
```

Android エミュレータでは `.env` の `EXPO_PUBLIC_API_BASE_URL` に `http://10.0.2.2:8000` を使う。

実機から接続する場合は、PC の LAN IP を使う。

```text
EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:8000
```

## 画面

- Plans: 現在地から Plan 候補を取得し、Action を開始する
- Track: GPS 取得、バックグラウンドトラッキング、イベント送信、キュー同期
- Verify: QR スキャンによる補助検証
- Rewards: 発行された Reward の確認

各画面ヘッダー右側の言語切替で、日本語 / English を切り替えられる。

Track はユーザー向けに `計測中` / `一時停止` / `終了` を中心に表示する。手動の `Send` / `Queue` / `Sync` は折りたたみの開発者向け操作に置いている。
Plans は各カードにミニルートを表示する。Track は全体進捗、現在のステップ、滞在時間の進捗バーを表示する。
Map は MapLibre を使い、現在地PIN、目的地PIN、計測中ルートを表示する。標準では OpenStreetMap のラスタタイルを使うため、Google Maps API key は不要。

## 設計メモ

画面から `expo-location` や `expo-camera` を直接深く扱わず、`src/services` と `src/api` に寄せている。
バックグラウンドタスクは `src/services/backgroundLocationTask.ts` で定義し、取得点は AsyncStorage にキューする。
