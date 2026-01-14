# Config 仕様書

## 概要

アプリケーション設定を管理するモジュール。
環境変数から設定を読み込み、型安全なConfigオブジェクトを提供する。

---

## 基本情報

| 項目 | 内容 |
|:-----|:-----|
| **ファイルパス** | `main/infrastructure/config/config.ts` |

---

## 型定義

### ModelConfig

```typescript
interface ModelConfig {
    baseUrl: string;  // API エンドポイント
    apiKey: string;   // API キー
    model: string;    // モデル名
}
```

### AppConfig

```typescript
interface AppConfig {
    mainModel: ModelConfig;   // メインモデル（生成用）
    subModel: ModelConfig;    // サブモデル（分析用）
    temperature: number;      // 生成温度
    database: {
        url: string;          // DB接続URL
    };
}
```

---

## エクスポート関数

### getAppConfig(): AppConfig

アプリケーション設定を取得。

### getDatabaseUrl(): string

データベースURLを取得。

---

## 環境変数マッピング

| 環境変数 | 設定項目 | デフォルト値 |
|:---------|:---------|:-------------|
| `MAIN_MODEL_BASE_URL` | mainModel.baseUrl | `https://nano-gpt.com/api/v1` |
| `MAIN_MODEL_API_KEY` | mainModel.apiKey | (空) |
| `MAIN_MODEL` | mainModel.model | `zai-org/glm-4.7-original:thinking` |
| `SUB_MODEL_BASE_URL` | subModel.baseUrl | `http://127.0.0.1:1234/v1` |
| `SUB_MODEL_API_KEY` | subModel.apiKey | (空) |
| `SUB_MODEL` | subModel.model | `local-model` |
| `LLM_TEMPERATURE` | temperature | `0.7` |
| `DATABASE_URL` | database.url | `file:./prisma/dev.db` |

---

## .envローダー

Nextron/Electronのメインプロセスでは `.env` が自動ロードされない場合があるため、手動でロードする機能を内蔵。

```typescript
const loadEnv = () => { ... }
```

---

## 関連ドキュメント

- [UserProfile_Spec.md](../UserProfile_Spec.md) - 動的LLM設定
- [LlmGateway.md](../gateways/LlmGateway.md) - 設定の使用先

---

## 変更履歴

| 日付 | 変更内容 |
|:-----|:---------|
| 2026-01-14 | 初版作成 |
