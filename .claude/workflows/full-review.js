export const meta = {
  name: 'full-review',
  description: 'Backend (Python) と Mobile (React Native) を並列でレビューして結果をまとめる',
  phases: [
    { title: 'Review', detail: 'backend と mobile を並列でレビュー' },
    { title: 'Verify', detail: '指摘事項を検証' },
    { title: 'Summary', detail: '結果をまとめる' },
  ],
}

const SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          line: { type: 'string' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          description: { type: 'string' },
        },
        required: ['file', 'severity', 'description'],
      },
    },
  },
  required: ['findings'],
}

// Phase 1: backend と mobile を並列レビュー
phase('Review')

const [backendResult, mobileResult] = await parallel([
  () => agent(
    `geoaction_backend/ 以下の Python ファイルを全てレビューして。
    対象: engine.py, store.py, server.py, services.py, events.py, geometry.py, utils.py
    観点:
    - バグ・ロジックエラー
    - セキュリティ問題（SQLインジェクション、認証漏れ等）
    - 型安全性
    - パフォーマンス問題
    各指摘はファイル名・行番号・深刻度(high/medium/low)・説明を含めること。`,
    { label: 'backend-review', phase: 'Review', schema: SCHEMA }
  ),
  () => agent(
    `mobile/ 以下の TypeScript/TSX ファイルを全てレビューして。
    対象: app/(tabs)/*.tsx, src/api/, src/components/, src/features/, src/services/, src/store/
    観点:
    - バグ・ロジックエラー
    - 型安全性（any の乱用等）
    - React Native のアンチパターン
    - API 呼び出しのエラーハンドリング漏れ
    - メモリリーク（useEffect の cleanup 漏れ等）
    各指摘はファイル名・行番号・深刻度(high/medium/low)・説明を含めること。`,
    { label: 'mobile-review', phase: 'Review', schema: SCHEMA }
  ),
])

const allFindings = [
  ...(backendResult?.findings ?? []),
  ...(mobileResult?.findings ?? []),
]

log(`合計 ${allFindings.length} 件の指摘（backend: ${backendResult?.findings?.length ?? 0}, mobile: ${mobileResult?.findings?.length ?? 0}）`)

// high のみ検証フェーズへ
const highFindings = allFindings.filter(f => f.severity === 'high')

// Phase 2: high severity の指摘を並列で検証
phase('Verify')

const verified = highFindings.length > 0
  ? await parallel(
      highFindings.map(f => () =>
        agent(
          `以下の指摘が本当に問題かどうか検証して。誤検知なら refuted: true にして。
          ファイル: ${f.file}
          説明: ${f.description}
          実際にファイルを読んで確認すること。`,
          {
            label: `verify:${f.file}`,
            phase: 'Verify',
            schema: {
              type: 'object',
              properties: {
                refuted: { type: 'boolean' },
                reason: { type: 'string' },
              },
              required: ['refuted', 'reason'],
            },
          }
        ).then(v => ({ ...f, refuted: v?.refuted ?? false, verifyReason: v?.reason ?? '' }))
      )
    )
  : []

// Phase 3: まとめ
phase('Summary')

const confirmedHigh = verified.filter(f => !f.refuted)
const medLow = allFindings.filter(f => f.severity !== 'high')

const summary = await agent(
  `以下のコードレビュー結果を日本語でまとめてください。

  ## 確定した重大な問題 (high severity)
  ${JSON.stringify(confirmedHigh, null, 2)}

  ## 中・低の指摘
  ${JSON.stringify(medLow, null, 2)}

  優先度順に整理して、修正方針も簡潔に提案してください。`,
  { label: 'summary', phase: 'Summary' }
)

return {
  totalFindings: allFindings.length,
  confirmedHighCount: confirmedHigh.length,
  summary,
}
