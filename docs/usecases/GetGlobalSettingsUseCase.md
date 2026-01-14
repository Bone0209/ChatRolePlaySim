# GetGlobalSettingsUseCase 仕様書

## 概要

グローバル設定（プロファイルに依存しないシステム設定）一覧を取得するユースケース。

---

## 基本情報

| 項目 | 内容 |
|:-----|:-----|
| **ファイルパス** | `main/application/usecases/profile/GetGlobalSettingsUseCase.ts` |
| **カテゴリ** | Profile |
| **依存リポジトリ** | PrismaUserProfileRepository |
| **外部依存** | なし |

---

## 入力 (Input)

なし

---

## 出力 (Output)

```typescript
type Output = GlobalSetting[];

interface GlobalSetting {
    keyName: string;
    keyValue: string;
    valueType: string;
}
```

---

## 処理フロー

```mermaid
flowchart LR
    A[開始] --> B[getGlobalSettings]
    B --> C[配列返却]
```

---

## 主なグローバル設定キー

| キー | 説明 |
|:-----|:-----|
| `sys.active_profile` | アクティブプロファイルID |
| `sys.llm.first.api_key` | メインLLM APIキー |
| `sys.llm.first.api_endpoint` | メインLLM エンドポイント |
| `sys.llm.first.model` | メインLLM モデル名 |
| `sys.llm.first.context` | メインLLM コンテキスト長 |
| `sys.llm.second.*` | サブLLM設定（同様の構造） |

---

## 関連ドキュメント

- [UpdateGlobalSettingUseCase.md](./UpdateGlobalSettingUseCase.md) - グローバル設定更新
- [InitializeGlobalSettingsUseCase.md](./InitializeGlobalSettingsUseCase.md) - 初期設定

---

## 変更履歴

| 日付 | 変更内容 |
|:-----|:---------|
| 2026-01-14 | 初版作成 |
