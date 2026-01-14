# TestConnectionUseCase 仕様書

## 概要

設定されたLLM APIへの接続テストを実行するユースケース。
設定画面で「接続テスト」ボタン押下時に使用される。

---

## 基本情報

| 項目 | 内容 |
|:-----|:-----|
| **ファイルパス** | `main/application/usecases/profile/TestConnectionUseCase.ts` |
| **カテゴリ** | Profile |
| **依存リポジトリ** | PrismaUserProfileRepository |
| **外部依存** | fetch API |

---

## 入力 (Input)

```typescript
type Input = 'first' | 'second';  // テスト対象のLLM設定
```

---

## 出力 (Output)

```typescript
interface Output {
    success: boolean;
    message: string;
}
```

---

## 処理フロー

```mermaid
flowchart TD
    A[開始] --> B[設定取得]
    B --> C{APIキー存在?}
    C -->|No| D[Error: API Key missing]
    C -->|Yes| E{エンドポイント存在?}
    E -->|No| F[Error: Endpoint missing]
    E -->|Yes| G[/v1/models へGETリクエスト]
    G --> H{レスポンス?}
    H -->|OK| I[Success: Connection successful]
    H -->|Error| J[Error: HTTP Error詳細]
    H -->|Timeout| K[Error: Connection failed]
```

---

## 詳細処理

### 設定取得

対象に応じたプレフィックスで設定を取得:

| target | prefix |
|:-------|:-------|
| `'first'` | `sys.llm.first` |
| `'second'` | `sys.llm.second` |

### 接続テスト

- エンドポイント: `{baseUrl}/v1/models` または `{baseUrl}/models`
- メソッド: GET
- タイムアウト: 10秒
- 認証: Bearer Token

```typescript
fetch(url, {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
    }
});
```

---

## エラーメッセージ

| 条件 | メッセージ |
|:-----|:----------|
| APIキー未設定 | "API Key is missing" |
| エンドポイント未設定 | "Endpoint is missing" |
| HTTPエラー | "HTTP Error: {status} {body}" |
| タイムアウト/その他 | "Connection failed" または例外メッセージ |

---

## 関連ドキュメント

- [GetGlobalSettingsUseCase.md](./GetGlobalSettingsUseCase.md) - 設定取得
- [UserProfile_Spec.md](../UserProfile_Spec.md) - 設定画面仕様

---

## 変更履歴

| 日付 | 変更内容 |
|:-----|:---------|
| 2026-01-14 | 初版作成 |
