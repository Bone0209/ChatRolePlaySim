# API Logs テーブル仕様書

## 1. 概要

`t_api_logs`テーブルは、外部APIとの通信履歴を記録するためのトランザクションテーブルです。LLM APIへのリクエスト(プロンプト)とレスポンスを保存し、デバッグ、監査、プロンプト改善に活用します。

---

## 2. テーブル定義

### テーブル名
- **論理名**: API通信ログ
- **物理名**: `t_api_logs`
- **プレフィックス**: `t_` (Transaction)

### 役割
- 外部API（主にLLM）との通信内容を記録
- リクエスト・レスポンスのペアを保持
- プロンプトの内容と結果を追跡
- API呼び出しのデバッグとパフォーマンス分析

---

## 3. カラム定義

| カラム名 | 物理名 | データ型 | NULL | デフォルト | 説明 |
|:---------|:-------|:---------|:-----|:-----------|:-----|
| **ID** | `id` | INTEGER | NOT NULL | AUTO INCREMENT | プライマリキー。ログの一意識別子。 |
| **API種別** | `api_type` | TEXT | NOT NULL | - | API呼び出しの種別。例: `"chat"`, `"world_gen"`, `"action_analysis"`, `"affection_judge"` |
| **モデル名** | `model_name` | TEXT | NOT NULL | - | 使用したLLMモデル名。例: `"minimax/minimax-m2.1"`, `"glm-4.7"` |
| **リクエスト** | `request` | TEXT | NOT NULL | - | APIへ送信したリクエストボディ（JSON形式の文字列）。プロンプト内容を含む。 |
| **レスポンス** | `response` | TEXT | NOT NULL | - | APIから受信したレスポンスボディ（JSON形式の文字列）。 |
| **ステータスコード** | `status_code` | INTEGER | NULL | NULL | HTTPステータスコード。成功時は200、エラー時は400/500等。 |
| **エラーメッセージ** | `error_message` | TEXT | NULL | NULL | エラー発生時のメッセージ。正常時はNULL。 |
| **実行時間(ms)** | `execution_time_ms` | INTEGER | NULL | NULL | API呼び出しの実行時間（ミリ秒）。パフォーマンス分析用。 |
| **関連ワールドID** | `world_id` | TEXT | NULL | NULL | 関連するワールドID。ワールド固有の呼び出しの場合に設定。 |
| **関連エンティティID** | `entity_id` | TEXT | NULL | NULL | 関連するエンティティID。NPC固有の呼び出しの場合に設定。 |
| **作成日時** | `created_at` | DATETIME | NOT NULL | `now()` | ログ記録日時。 |

---

## 4. インデックス定義

### 推奨インデックス

```prisma
@@index([api_type, created_at])
@@index([world_id, created_at])
@@index([entity_id, created_at])
@@index([status_code])
```

### インデックスの目的

1. **`api_type` + `created_at`**: API種別ごとの時系列検索を高速化
2. **`world_id` + `created_at`**: ワールド単位でのログ検索を高速化
3. **`entity_id` + `created_at`**: エンティティ単位でのログ検索を高速化
4. **`status_code`**: エラーログの抽出を高速化

---

## 5. リレーション

### 外部キー

| 関連テーブル | カラム | 制約 |
|:-------------|:-------|:-----|
| `m_worlds` | `world_id` | `ON DELETE SET NULL` (オプショナル) |
| `m_entities` | `entity_id` | `ON DELETE SET NULL` (オプショナル) |

> **注意**: ワールドやエンティティが削除されてもログは保持されるため、`SET NULL`を使用します。

---

## 6. Prismaスキーマ定義

```prisma
model TApiLog {
  id                Int      @id @default(autoincrement())
  apiType           String   @map("api_type")
  modelName         String   @map("model_name")
  request           String
  response          String
  statusCode        Int?     @map("status_code")
  errorMessage      String?  @map("error_message")
  executionTimeMs   Int?     @map("execution_time_ms")
  worldId           String?  @map("world_id")
  entityId          String?  @map("entity_id")
  createdAt         DateTime @default(now()) @map("created_at")

  world             MWorld?  @relation(fields: [worldId], references: [id], onDelete: SetNull)
  entity            MEntity? @relation(fields: [entityId], references: [id], onDelete: SetNull)

  @@index([apiType, createdAt])
  @@index([worldId, createdAt])
  @@index([entityId, createdAt])
  @@index([statusCode])
  @@map("t_api_logs")
}
```

---

## 7. 使用例

### 7.1 ログの記録

```typescript
await prisma.tApiLog.create({
  data: {
    apiType: 'chat',
    modelName: 'minimax/minimax-m2.1',
    request: JSON.stringify(requestPayload),
    response: JSON.stringify(responsePayload),
    statusCode: 200,
    executionTimeMs: 1250,
    worldId: 'world-123',
    entityId: 'entity-456',
  },
});
```

### 7.2 エラーログの記録

```typescript
await prisma.tApiLog.create({
  data: {
    apiType: 'affection_judge',
    modelName: 'glm-4.7',
    request: JSON.stringify(requestPayload),
    response: JSON.stringify(errorResponse),
    statusCode: 500,
    errorMessage: 'Internal Server Error: Model timeout',
    executionTimeMs: 30000,
    worldId: 'world-123',
  },
});
```

### 7.3 プロンプト内容の検索

```typescript
// 特定のAPI種別のログを取得
const chatLogs = await prisma.tApiLog.findMany({
  where: { apiType: 'chat' },
  orderBy: { createdAt: 'desc' },
  take: 100,
});

// エラーログの抽出
const errorLogs = await prisma.tApiLog.findMany({
  where: {
    statusCode: { gte: 400 },
  },
  orderBy: { createdAt: 'desc' },
});

// 特定のワールドに関連するログ
const worldLogs = await prisma.tApiLog.findMany({
  where: { worldId: 'world-123' },
  include: {
    world: true,
    entity: true,
  },
});
```

---

## 8. 設計上の考慮事項

### 8.1 データ容量の管理

- リクエスト/レスポンスは大きくなる可能性があるため、定期的なログローテーション（古いログの削除）を推奨。
- 長期保存が不要なログは定期的にアーカイブまたは削除。

### 8.2 プライバシーとセキュリティ

- リクエスト/レスポンスには個人情報が含まれる可能性があるため、適切なアクセス制御を実装。
- 本番環境では暗号化やマスキングを検討。

---

## 9. 今後の拡張案

### 9.1 メタデータの追加

- `user_id`: ユーザー識別子（マルチユーザー対応時）
- `session_id`: セッション識別子（会話の連続性追跡）
- `tags`: JSON形式のタグ配列（カテゴリ分類用）

### 9.2 プロンプト分析機能

- プロンプトテンプレートの効果測定
- エラー率の可視化
- モデル別のパフォーマンス比較
- 実行時間の統計分析

### 9.3 品質評価機能(将来)

- `quality_score`カラムの追加
- バッチ処理による自動評価
- 評価用LLMとの連携

---

## 10. まとめ

`t_api_logs`テーブルは、API通信の完全な履歴を保持し、プロンプトの内容とレスポンスを追跡します。これにより、デバッグ、パフォーマンス分析、プロンプト改善の基盤を提供します。

---

**作成日**: 2026-01-14  
**バージョン**: 1.0  
**作成者**: Antigravity AI Assistant
