# LlmGateway 仕様書

## 概要

LLM APIへのアクセスをカプセル化するゲートウェイ。
OpenAI互換APIを使用したLLMアクセスを提供し、通信ログを自動記録する。

---

## 基本情報

| 項目 | 内容 |
|:-----|:-----|
| **ファイルパス** | `main/infrastructure/gateways/LlmGateway.ts` |
| **依存** | IApiLogRepository（オプション） |

---

## コンストラクタ

```typescript
constructor(apiLogRepository?: IApiLogRepository)
```

APIログリポジトリを注入することでログ記録が有効になる。

---

## 型定義

### LlmRequestOptions

```typescript
interface LlmRequestOptions {
    model?: 'main' | 'sub';        // 使用モデル
    temperature?: number;           // 温度パラメータ
    timeoutMs?: number;             // タイムアウト（ms）
    responseFormat?: 'text' | 'json';
    configOverride?: ModelConfig;   // 設定上書き
    metadata?: {
        worldId?: string;
        entityId?: string;
        apiType?: string;
    };
}
```

### LlmMessage

```typescript
interface LlmMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
```

---

## メソッド一覧

### generateCompletion(messages, options)

チャット補完を生成。

| パラメータ | 型 | 説明 |
|:-----------|:---|:-----|
| messages | LlmMessage[] | メッセージ履歴 |
| options | LlmRequestOptions | オプション |

**戻り値**: `{ content: string; raw?: any }`

---

### generateJson<T>(systemPrompt, userPrompt, options)

JSON形式のレスポンスを取得。

**処理**:
1. LLM呼び出し
2. レスポンスからJSONを抽出
3. パースして返却

---

### generateText(systemPrompt, userPrompt, options)

テキストを生成（シンプルな1ターン会話）。

---

### analyzeAction(userInput, context)

ユーザーアクションを分析。

| context | 説明 |
|:--------|:-----|
| worldTime | 世界時間 |
| location | 現在地 |
| targetName | 対象NPC名 |
| targetRole | 対象役割 |
| targetAffection | 好感度 |

**戻り値**: アクション分析結果（JSON）

**使用モデル**: Sub Model

---

### analyzeAffection(userMessage, modelResponse, targetName, currentAffection)

好感度変動を分析。

**戻り値**: `{ affection_delta: number; reason: string }`

**使用モデル**: Sub Model

---

### generateRolePlayResponse(context)

ロールプレイ応答を生成。

| context | 説明 |
|:--------|:-----|
| world | ワールド情報 |
| playerMessage | プレイヤーメッセージ |
| targetNpc | 対象NPC |
| allEntities | 全エンティティ |
| history | 会話履歴 |
| actionAnalysis | アクション分析結果 |
| config | LLM設定 |
| playerProfile | プレイヤー情報 |

**使用モデル**: Main Model

---

## モデル使い分け

| 処理 | モデル | 理由 |
|:-----|:-------|:-----|
| アクション分析 | Sub | 論理的分類タスク |
| 応答生成 | Main | 創造性が必要 |
| 好感度判定 | Sub | 採点タスク |
| ワールド生成 | Main | 創造性が必要 |

---

## 内部メソッド

### fetchWithTimeout(url, options, timeoutMs)

タイムアウト付きfetch。

### buildHeaders(config)

認証ヘッダーを構築。

### cleanThinkingModelResponse(content)

Thinkingモデルの `<think>...</think>` タグを除去。

---

## シングルトン

```typescript
getLlmGateway(repo?: IApiLogRepository): LlmGateway
```

シングルトンインスタンスを取得。

---

## 関連ドキュメント

- [SendMessageUseCase.md](../usecases/SendMessageUseCase.md) - 使用元
- [APILogs_Specification.md](../APILogs_Specification.md) - ログ仕様
- [Affection_System.md](../Affection_System.md) - 好感度判定

---

## 変更履歴

| 日付 | 変更内容 |
|:-----|:---------|
| 2026-01-14 | 初版作成 |
