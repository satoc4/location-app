export const meta = {
  name: 'z-gen-strategy',
  description: '企画・マーケ・営業・エンジニアが「個人〜自治体プラン投稿設計」のZ世代向け価値を議論する',
  phases: [
    { title: '分析', detail: '4エージェントが独立して分析・提案' },
    { title: '議論', detail: '各エージェントが他の提案にクロスレビュー' },
    { title: '統合', detail: '議論を踏まえた最終提案をまとめる' },
  ],
}

const APP_CONTEXT = `
## アプリ概要：まちAction（Z世代向け毎日起動アプリ）

### コンセプト
「今日、どこに寄るか。いつ移動するか。何をすると少し得するか。を毎日3択で出してくれるアプリ」

### 現在の仕組み
- 広告主・自治体・商店街が「Plan」を作成（例：商店街経由ルートで200円クーポン）
- ユーザーが今日の3択から好きなプランを選んで実行
- GPSで場所・滞在を検証 → 達成したら報酬（クーポン・ポイント）を発行

### ターゲット
Z世代（18〜28歳）に日常的に使ってもらいたい。毎日起動を狙う。

---

## 今回の議題：「プラン投稿者の設計」

### オーナーの意図
「プランの発行を個人でもできるようにしたい。ただ、自治体などまとめてもらっている場合は優先表示するみたいな感じが嬉しい」

### 設計案（議論のたたき台）

プランを投稿できる人を以下の3層に設計する：

| 層 | 投稿者 | 例 |
|----|--------|-----|
| **個人** | アプリユーザー誰でも | 「私のお気に入りの古本屋寄り道ルート」 |
| **法人・団体** | 商店街・企業・NPO | 「商店街振興組合主催の寄り道プラン」 |
| **自治体** | 市区町村・観光協会 | 「○○市公認の歴史散歩コース」 |

### 検討が必要な問い
1. Z世代は「個人投稿のプラン」と「自治体公認プラン」をどう使い分けるか？
2. 個人投稿を増やすとUGCとして盛り上がるか、それとも質が下がってユーザー離れするか？
3. 自治体・法人を「優先表示」する仕組みはどう設計すべきか（フラグ？スコア？表示UI？）
4. 個人がプランを投稿したくなる動機（インセンティブ）は何か？
5. スパム・低品質プランをどう防ぐか？
6. Z世代にとって「誰が作ったプランか」は信頼・選択の判断材料になるか？
`

const PROPOSAL_SCHEMA = {
  type: 'object',
  properties: {
    role: { type: 'string' },
    topInsight: { type: 'string' },
    proposals: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          priority: { type: 'string', enum: ['高', '中', '低'] },
        },
        required: ['title', 'description', 'priority'],
      },
    },
    concern: { type: 'string' },
  },
  required: ['role', 'topInsight', 'proposals', 'concern'],
}

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    reviewerRole: { type: 'string' },
    targetRole: { type: 'string' },
    agree: { type: 'string' },
    challenge: { type: 'string' },
    addOn: { type: 'string' },
  },
  required: ['reviewerRole', 'targetRole', 'agree', 'challenge', 'addOn'],
}

// ─── Phase 1: 4エージェントが独立して分析 ───────────────────────────────────

phase('分析')

const [planning, marketing, sales, engineering] = await parallel([

  () => agent(`
あなたは「企画エージェント」です。
まちActionに「個人〜自治体の多層プラン投稿設計」を導入することについて、
Z世代向けプロダクト・UX観点から提案してください。

${APP_CONTEXT}

## あなたの役割
Z世代が「このアプリでプランを使いたい・作りたい」と思える体験設計を考える。

## 考慮すること
- Z世代はUGC（ユーザー生成コンテンツ）をどう受け取るか（TikTok・食べログ・Googleマップ口コミとの比較）
- 「誰が作ったプランか」がZ世代の信頼・選択にどう影響するか
- 個人投稿プランと公式プランのUIでの見せ方の差
- 個人がプランを作りたくなる動機設計（承認欲求・推しまち・社会貢献）
- 3択の中に個人プラン・公式プランが混在したときのUX品質をどう保つか

## 出力
role に「企画」と入れてください。
topInsight に「個人〜自治体多層設計」のZ世代への最重要インサイトを1文で。
proposals に具体的な施策を3〜5個（優先度つき）。
concern に他部門（マーケ・営業・エンジニア）への懸念点や要望を1つ。
  `, { label: '企画エージェント', phase: '分析', schema: PROPOSAL_SCHEMA }),

  () => agent(`
あなたは「マーケティングエージェント」です。
まちActionに「個人〜自治体の多層プラン投稿設計」を導入することについて、
Z世代向けブランド・コミュニティ観点から提案してください。

${APP_CONTEXT}

## あなたの役割
Z世代が「まちActionのプランを使いたい・シェアしたい・作りたい」と思えるブランド・コミュニティ設計を考える。

## 考慮すること
- 個人投稿プランがUGCとしてバイラルする可能性（「私のお気に入りルート」のシェア設計）
- 自治体・公式プランが「信頼のお墨付き」としてブランド価値を上げるか
- Z世代に刺さる投稿者プロフィールの見せ方（個人の「まち愛」を可視化）
- 「公式 vs 個人」の棲み分けをどうブランドとして打ち出すか
- コミュニティ形成（まちごとのプラン文化）への発展可能性

## 出力
role に「マーケティング」と入れてください。
topInsight に「個人〜自治体多層設計」のZ世代への最重要インサイトを1文で。
proposals に具体的な施策を3〜5個（優先度つき）。
concern に他部門（企画・営業・エンジニア）への懸念点や要望を1つ。
  `, { label: 'マーケティングエージェント', phase: '分析', schema: PROPOSAL_SCHEMA }),

  () => agent(`
あなたは「営業エージェント」です。
まちActionに「個人〜自治体の多層プラン投稿設計」を導入することについて、
ビジネスモデル・パートナー獲得観点から提案してください。

${APP_CONTEXT}

## あなたの役割
個人投稿と自治体・法人投稿をビジネスとして両立させる収益・パートナー設計を考える。

## 考慮すること
- 個人プラン（無料・無報酬）と法人プラン（有料・報酬あり）の収益モデルの差
- 自治体・商店街を「優先表示」する代わりに何を提供してもらうか（契約・費用・データ）
- 個人投稿が増えることで自治体・企業への営業トークがどう変わるか
  （「すでに個人が○○件投稿しています」がセールストークになるか）
- ニワトリ卵問題：個人ユーザーが先か、自治体コンテンツが先か
- 法人・自治体向けの「優先表示パッケージ」はどう設計・価格づけするか

## 出力
role に「営業」と入れてください。
topInsight に「個人〜自治体多層設計」のZ世代への最重要インサイトを1文で。
proposals に具体的な施策を3〜5個（優先度つき）。
concern に他部門（企画・マーケ・エンジニア）への懸念点や要望を1つ。
  `, { label: '営業エージェント', phase: '分析', schema: PROPOSAL_SCHEMA }),

  () => agent(`
あなたは「エンジニアエージェント」です。
まちActionに「個人〜自治体の多層プラン投稿設計」を導入することについて、
技術アーキテクチャ観点から提案してください。

${APP_CONTEXT}

## 現在の技術スタック
- フロントエンド：React Native (Expo)、TypeScript
- バックエンド：Python（標準ライブラリのみ、JSONファイルDB）
- Plan モデル：{ id, title, objective, sponsorName, status, priority, steps, reward, billing }
- スコア計算：priority * 10 + reward_amount / 100 - distance / 250

## あなたの役割
個人〜自治体の多層投稿を技術的に実現する最小コストの設計を提案する。

## 考慮すること
- creatorType（individual / organization / municipality）フィールドの追加設計
- verified フラグ（審査済み）による優先表示の実装方法
- スコア計算への creatorType / verified の組み込み方
- 個人投稿時の入力UI（Plan Builder）の最小実装
- スパム・低品質プランのモデレーション機構（報告・非表示・審査フロー）
- 個人プランには reward / billing がないケースの既存バリデーション変更
- 自治体プランの「優先表示バッジ」のフロントエンド実装

## 出力
role に「エンジニア」と入れてください。
topInsight に「個人〜自治体多層設計」の技術的な最重要インサイトを1文で。
proposals に具体的な実装提案を3〜5個（優先度つき）。
concern に他部門（企画・マーケ・営業）への懸念点や要望を1つ。
  `, { label: 'エンジニアエージェント', phase: '分析', schema: PROPOSAL_SCHEMA }),
])

log(`分析完了 — 企画: ${planning?.proposals?.length}件 / マーケ: ${marketing?.proposals?.length}件 / 営業: ${sales?.proposals?.length}件 / エンジニア: ${engineering?.proposals?.length}件`)

// ─── Phase 2: クロスレビュー ──────────────────────────────────────────────────

phase('議論')

const summaryForReview = `
## 企画エージェントの提案
インサイト: ${planning?.topInsight}
提案: ${planning?.proposals?.map(p => `・${p.title}（優先度:${p.priority}）: ${p.description}`).join('\n')}
懸念: ${planning?.concern}

## マーケティングエージェントの提案
インサイト: ${marketing?.topInsight}
提案: ${marketing?.proposals?.map(p => `・${p.title}（優先度:${p.priority}）: ${p.description}`).join('\n')}
懸念: ${marketing?.concern}

## 営業エージェントの提案
インサイト: ${sales?.topInsight}
提案: ${sales?.proposals?.map(p => `・${p.title}（優先度:${p.priority}）: ${p.description}`).join('\n')}
懸念: ${sales?.concern}

## エンジニアエージェントの提案
インサイト: ${engineering?.topInsight}
提案: ${engineering?.proposals?.map(p => `・${p.title}（優先度:${p.priority}）: ${p.description}`).join('\n')}
懸念: ${engineering?.concern}
`

const reviewPairs = [
  { reviewer: '企画', target: 'マーケティング' },
  { reviewer: '企画', target: '営業' },
  { reviewer: '企画', target: 'エンジニア' },
  { reviewer: 'マーケティング', target: '企画' },
  { reviewer: 'マーケティング', target: '営業' },
  { reviewer: 'マーケティング', target: 'エンジニア' },
  { reviewer: '営業', target: '企画' },
  { reviewer: '営業', target: 'マーケティング' },
  { reviewer: '営業', target: 'エンジニア' },
  { reviewer: 'エンジニア', target: '企画' },
  { reviewer: 'エンジニア', target: 'マーケティング' },
  { reviewer: 'エンジニア', target: '営業' },
]

const reviews = await parallel(reviewPairs.map(pair => () =>
  agent(`
あなたは「${pair.reviewer}エージェント」です。
「個人〜自治体プラン投稿設計」について4エージェントの提案を読み、
「${pair.target}エージェント」の提案にレビューしてください。

${summaryForReview}

## レビュー指針
- agree: ${pair.target}の提案で最も賛成できる点（具体的に）
- challenge: ${pair.target}の提案で疑問・懸念がある点（${pair.reviewer}視点で）
- addOn: ${pair.target}の提案をさらに強化するために${pair.reviewer}として追加できること

reviewerRole に「${pair.reviewer}」、targetRole に「${pair.target}」を入れてください。
  `, { label: `${pair.reviewer}→${pair.target}`, phase: '議論', schema: REVIEW_SCHEMA })
))

log(`議論完了 — ${reviews.filter(Boolean).length} / ${reviewPairs.length} レビュー生成`)

// ─── Phase 3: 統合 ────────────────────────────────────────────────────────────

phase('統合')

const reviewSummary = reviews.filter(Boolean).map(r =>
  `【${r.reviewerRole} → ${r.targetRole}】賛成:${r.agree} / 懸念:${r.challenge} / 追加:${r.addOn}`
).join('\n')

const synthesis = await agent(`
あなたは「ファシリテーター」です。
「まちActionへの個人〜自治体多層プラン投稿設計」について、
4エージェントの提案と相互レビューを踏まえ、最終まとめを作成してください。

## 各エージェントの提案
${summaryForReview}

## 相互レビューの全件
${reviewSummary}

## まとめの構成
1. **Z世代にとってのコアバリュー**（個人投稿・公式投稿の両立がZ世代に何をもたらすか）
2. **投稿者層の設計決定**（creatorType の定義・優先表示ルール・バッジUIの合意案）
3. **対立点と落としどころ**（意見が割れた箇所と合意案）
4. **エンジニアへの実装指示**（最小実装タスク、データモデル変更、フロントUI変更）
5. **残課題・次回議題**（今回決まらなかったこと）

日本語で、実際の会議議事録のような生き生きとした文体で書いてください。
`, { label: 'ファシリテーター・統合', phase: '統合' })

return { synthesis, reviews: reviews.filter(Boolean) }
