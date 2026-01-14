# IApiLogRepository 仕様書

## 概要

外部API通信ログ（TApiLog）の記録を担当するリポジトリインターフェース。
LLM APIへのリクエスト・レスポンスを保存しデバッグと監査に活用する。

---

## 基本情報

| 項目 | 内容 |
|:-----|:-----|
| **ファイルパス** | `main/domain/repositories/IApiLogRepository.ts` |
| **実装クラス** | PrismaApiLogRepository |

---

## 型定義

```typescript
interface ApiLogData {
    apiType: string;        // 'chat', 'world_gen', 'action_analysis', 'affection_judge'
    modelName: string;      // 使用したモデル名
    request: string;        // リクエストJSON文字列
    response: string;       // レスポンスJSON文字列
    statusCode?: number;    // HTTPステータスコード
    errorMessage?: string;  // エラーメッセージ
    executionTimeMs?: number; // 実行時間（ミリ秒）
    worldId?: string;       // 関連ワールドID
    entityId?: string;      // 関連エンティティID
}
```

---

## メソッド一覧

### create(data: ApiLogData): Promise<void>

APIログを記録。

| パラメータ | 型 | 説明 |
|:-----------|:---|:-----|
| data | ApiLogData | ログデータ |

---

## テーブルマッピング

| Prismaモデル | テーブル名 |
|:-------------|:-----------|
| TApiLog | t_api_logs |

---

## 関連ドキュメント

- [APILogs_Specification.md](../APILogs_Specification.md) - APIログ詳細仕様
- [LlmGateway.md](../gateways/LlmGateway.md) - ログ記録の呼び出し元

---

## 変更履歴

| 日付 | 変更内容 |
|:-----|:---------|
| 2026-01-14 | 初版作成 |
