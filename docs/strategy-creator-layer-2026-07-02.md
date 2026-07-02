# まちActionへの個人〜自治体多層プラン投稿設計 最終まとめ

**会議種別：** 全体統合レビュー / ファシリテーター最終取りまとめ
**参加：** 企画・マーケティング・営業・エンジニア（各エージェント）＋ファシリテーター
**日付：** 2026-07-02
**ワークフロー：** 17エージェント / 3フェーズ（分析→議論→統合）

---

## 1. Z世代にとってのコアバリュー——なぜ「多層投稿」が必要か

今回4エージェントの議論を通じて、一つの確信に至った。**Z世代は「誰が公認したか」より「誰が実際に歩いたか」を信頼する。** しかし同時に、質の担保されていないプランが毎日の3択に混入した瞬間、アプリを開く動機そのものが消える。この二つは矛盾しているように見えて、実は設計で両立できる。

企画が「表示枠の構造的分離が前提条件だ」と言い、マーケが「行動履歴の可視化が信頼を生む」と言い、営業が「UGCの件数が法人営業の弾薬になる」と言い、エンジニアが「スコアボーナスで順序を強制できる」と言った——これらはすべて同じ構造を別の角度から見ている。

**整理すると、個人と公式の両立が生む価値は以下の三層だ：**

- **ユーザー体験層：** 「今日の3択」は必ず品質が保証されている（信頼）。かつそこに「友達のようなリアルな人間が作ったルート」が1枠入ることで毎日の新鮮さが生まれる（継続起動）。
- **UGC文化層：** 自分のルートが誰かに選ばれ、達成されることが承認欲求と推しまち愛を同時に満たす。「まちで遊ぶ人が、まちを設計する側にもなれる」という参加感がロイヤルティを作る。
- **ビジネス層：** 個人UGCが蓄積されたエリアには、自治体・法人が「優先表示」の価値を感じて対価を払う。UGCが増えるほど法人営業の根拠が強くなるフライホイールが回る。

---

## 2. 投稿者層の設計決定

### 2-1. creatorType の定義（全員合意）

planスキーマに以下3値を持つ `creatorType` フィールドを追加する。

| creatorType | 意味 | priority上限 | verified取得 |
|---|---|---|---|
| `individual` | 個人ユーザー投稿 | 0〜5（サーバーバリデーション必須） | 不可（MVP段階） |
| `organization` | 法人・商店街等 | 0〜10 | 管理者PATCHで付与 |
| `municipality` | 自治体・DMO | 0〜10 | 管理者PATCHで付与 |

**重要な合意事項：** `individual` の priority 上限（0〜5）はフロントエンドのUI制限だけでなく、**必ずサーバーサイドの `create_plan()` にバリデーションを追加する。** APIを直叩きされた場合の抜け穴をエンジニアが指摘した通り、UI制限だけでは守れない。

### 2-2. スコアスキームと枠割りの合意

**スコア計算（バックエンド）：**
```
creator_bonus = 30 if (verified and creatorType == "municipality")
              else 15 if (not verified and creatorType == "municipality")
              else 10 if creatorType == "organization"
              else 0   # individual
score = priority * 10 + reward_amount / 100 - distance / 250 + creator_bonus
```

**スロット割り当て（APIレスポンスレベルで実装）：**

`list_plan_candidates()` の返却リストは単純なスコア上位3件ではなく、以下のルールで枠を割り当てる。
- **枠1（slot:1）：** `organization` または `municipality` の最高スコアプラン
- **枠2（slot:2）：** `organization` または `municipality` の次点プラン（枠1と異なるcreatorType優先）
- **枠3（slot:3）：** `individual` の最高スコアプラン（該当なければ残りのorg/municipalityプラン）

レスポンスの各candidateオブジェクトに `slot`・`creatorType`・`verified`・`creatorBonus` を追加する。

### 2-3. バッジUI・i18nの決定

`mobile/src/i18n/strings.ts` に以下のキーを追加する（行政語句を避けたZ世代向け表現）：

| キー | ja | en |
|---|---|---|
| `badge.municipality` | 自治体おすすめ | Local Gov Pick |
| `badge.organization` | 公認 | Official |
| `badge.individual` | みんなのルート | Community Route |

TodayPickCard / PlanCard の cardHeader に `<StatusPill>` を条件付きで追加：
- `municipality` → `tone="success"`（緑）
- `organization` → `tone="info"`（青）
- `individual` → `tone="neutral"`（グレー）

### 2-4. 個人プランの公開条件インターロック（企画・エンジニア合意）

```
投稿 → status: "pending_review"（自動）
 ↓ 管理者審査（SLA: 48時間以内）
status: "published"
 ↓ 7日間で達成数 >= 1件（コミュニティ達成フィルタ）
枠3への表示対象になる
 ↓ 累計達成数 >= 50件 かつ reportedBy件数 = 0
"promotionEligible: true" フラグが立つ（昇格審査候補）
```

**マーケティング補足：** 7日間ゼロ達成で即非表示は地方エリアに酷。非表示ではなく `status: "low_traffic"` に変更して「達成者募集中」ラベルに切り替える設計を採用する。

---

## 3. 対立点と落としどころ

### 対立点A：スコアボーナスvsスロット固定（企画vsエンジニア）

**対立の構造：** エンジニアは「スコアボーナスだけで順序を制御できる」と主張。企画は「reward_amountが高い法人プランとdistanceが近い個人プランが重なった場合、自治体verifiedプランが3位になる計算上の穴がある」と指摘。

**落としどころ：** 両方やる。スコアボーナスをバックエンドで計算した後、**APIレスポンスのスロット割り当てロジックで構造的に枠を確保する。** スコアは枠内の優先順位決定に使い、枠の存在自体はcreatorTypeで保証する。実装は `services.py` の `list_plan_candidates()` 末尾20行以内で完結できる。

### 対立点B：「採用通知」のタイミング（企画vsマーケティング）

**落としどころ：** マーケティングの主張を採用。`engine.py` の `_complete_action_run()` が `append_webhook_event()` を呼ぶタイミングに `event: "plan.adopted"` と `creatorUserId` を追加する。MVPはwebhookEventsへの書き込みを先行、FCM/APNsはPhase 2以降。

### 対立点C：「まちナビゲーター指数」のスコープ（マーケvsエンジニア）

**落としどころ：** MVP段階は**フォロワー数を除いた「達成回数 × エリア多様性スコア（ユニークplaceId数）」のみ先行実装。** `get_user_stats()` に追加し `creatorStats` フィールドとして返す。フォロワー機能はSQLite移行後のフェーズ2以降。

### 対立点D：行動データ販売の先行訴求リスク（マーケvs営業）

**落としどころ：** 行動データ販売は**SQLite移行完了後、かつユーザー向けデータ利用同意フロー実装後にのみ対外的に訴求する。** MVP段階では `analytics_summary()` のサンプルデータのみ自治体営業デックに掲載可。オンボーディングに「あなたの達成データは匿名集計され、まちづくりに活用されます」を「参加」として演出した文脈で追加する。

### 対立点E：優先表示パッケージの先行価格提示リスク（営業vs全員）

**落としどころ：** 価格帯（5万・20万・50万〜）は社内設計資料として保持。**法人顧客への外部提示はスロット設計の実装ロック後とする。** Z世代5〜10名へのユーザーインタビュー（公認バッジありなしの選択率比較）先行実施後に価格根拠に組み込む。

---

## 4. エンジニアへの実装指示

### MVP必須（リリースブロッカー）

**【BE-1】planスキーマ拡張（`geoaction_backend/seed.py` / `store.py`）**

`default_state()` の各planオブジェクトに追加：
- `creatorType`: `"individual"` | `"organization"` | `"municipality"`（デフォルト: `"organization"`）
- `verified`: `bool`（デフォルト: `false`）
- `creatorUserId`: `str | None`（個人投稿時のみ格納）
- `status`: 既存フィールドに `"pending_review"` を追加
- `reportedBy`: `list[str]`（デフォルト: `[]`）
- `promotionEligible`: `bool`（デフォルト: `false`）

**【BE-2】`create_plan()` のバリデーション変更（`services.py`）**

- `creatorType == "individual"` の場合、`reward={amount:0}` / `billing={}` をデフォルト補完して必須チェックを免除
- `creatorType == "individual"` かつ `priority > 5` の場合は `DomainError` を返す（サーバーサイドで抜け穴を塞ぐ）
- 個人投稿の `status` デフォルトを `"pending_review"` にする

**【BE-3】`_budget_available()` の変更（`services.py`）**

`billing` が空オブジェクトの場合は常に `True` を返す（個人プランは予算上限なし）。

**【BE-4】スコア計算式とスロット割り当て（`services.py` の `list_plan_candidates()`）**

スコア計算にcreator_bonusを加算した後、スロット割り当てロジックを末尾に追加：
- 枠1・枠2: `organization` または `municipality` プランをスコア順で割り当て
- 枠3: `individual` プランのスコア最高値（なければ残りのorg/municipalityプラン）
- レスポンスの各candidateに `slot`・`creatorType`・`verified`・`creatorBonus` を追加

**【BE-5】モデレーション基盤（`services.py`）**

- `POST /api/plans/{id}/report` エンドポイントを追加（`reportedBy` にuserIdを追記、3件超で `status: "under_review"` に自動変更）
- `list_plan_candidates()` から `status: "pending_review"` および `status: "under_review"` のプランを除外
- `plan.adopted` イベントを `_complete_action_run()` の `append_webhook_event()` 呼び出しに追加（`creatorUserId` を乗せる）

**【FE-1】バッジコンポーネント追加（`mobile/app/(tabs)/index.tsx`）**

- `TodayPickCard` / `PlanCard` のcardHeaderに `<StatusPill>` を条件付きで追加
- `PlanCandidate` 型に `creatorType`・`verified`・`slot` を追加

**【FE-2】i18nキー追加（`mobile/src/i18n/strings.ts`・`domainText.ts`）**

- `badge.municipality` / `badge.organization` / `badge.individual` を en/ja 両方に追加
- `domainText.ts` の `localizePlan()` に `creatorType` ベースの分岐を追加

### MVP推奨（品質向上・営業準備）

**【BE-6】個人プラン歩行距離バリデーション**

`geometry.py` の `distance_meters()` を `_validate_steps()` に追加して5km超の個人プランを作成時に弾く。

**【BE-7】`analytics_summary()` のエリア別集計拡張**

エリア別（placeIdごと）の個人プラン件数・達成数を返すフィールドを追加（20行以内の改修）。

**【BE-8】creatorStats の先行実装（`get_user_stats()` の拡張）**

`achievements` からユニークplaceId数を集計し、`creatorStats.areaCount` として返す。

**【FE-3】個人プラン投稿UI（PlanBuilderScreen 最小実装）**

3ステップフォーム：①スポット選択（既存placesから地図タップ）→②タイトル入力→③達成条件テンプレ選択。`creatorType: "individual"` を自動セット。**企画が画面仕様・非表示フィールド一覧をモック込みで提供してから着手すること。**

### Phase 2以降

- プッシュ通知基盤（FCM/APNs）
- シェアカードのビジュアル化（MVPはテキストシェアのみ）
- フォロワー機能のスキーマ設計
- SQLite移行（プラン件数100件超または同時アクセス10req/秒が移行トリガー）
- 行動データ販売ライン（SQLite移行完了・ユーザー同意フロー実装後）

---

## 5. 残課題・次回議題

### 即時決定が必要なもの（ブロッカー）

1. **審査SLAのオーナー確定** — 個人プランの `pending_review → published` 移行を誰が・どのプロセスで担保するか。MVPリリース前に確定が必須。
2. **企画からエンジニアへのUIモック提供** — 個人投稿フォームの3ステップ画面仕様と非表示フィールド一覧。FE-3着手前に完了。
3. **キュレーション採用スキームの価格設計** — 「地元レジェンド」称号クリエイターのプランを法人が採用する際の費用負担スキーム。営業・企画で次回会議前に叩き台を作ること。

### 次フェーズで議題化

4. ユーザーインタビュー設計・実施（マーケリード、Z世代5〜10名）
5. 法人先行入金スキームの具体化（Z世代業態3社+大学1校の初期スポンサー）
6. `plan.area_trending` webhookイベントの設計（エリア達成数閾値超過→自動営業トリガー）

---

## ファシリテーターまとめ所見

**解決の順序は一本のフローに収まる：**

```
1. スロット設計の仕様ロック（企画×エンジニア合同作業）
   ↓
2. planスキーマ合意（BE-1〜BE-5の実装）
   ↓
3. バッジUI実装とユーザーインタビュー実施（マーケリード）
   ↓
4. 審査SLA・オーナー確定（全員）
   ↓
5. 個人投稿フォームのUI仕様提供（企画→エンジニア）
   ↓
6. 個人投稿MVP公開・初期パートナー先行契約（営業）
   ↓
7. UGC蓄積後に自治体優先表示パッケージ営業開始
```

この順序を守れば、今回対立していた全員の懸念が自然に解消される。逆にこの順序を無視してどこかを先行させると、後から変えようとすると全部変わる構造的な問題が起きる。

**次回会議は課題1（審査SLAオーナー確定）と課題2（UIモック提供）の完了報告を冒頭に置くこと。**
