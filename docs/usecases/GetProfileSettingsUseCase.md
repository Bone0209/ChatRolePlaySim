# GetProfileSettingsUseCase 仕様書

## 概要

指定されたプロファイルの設定一覧を取得するユースケース。

---

## 基本情報

| 項目 | 内容 |
|:-----|:-----|
| **ファイルパス** | `main/application/usecases/profile/GetProfileSettingsUseCase.ts` |
| **カテゴリ** | Profile |
| **依存リポジトリ** | PrismaUserProfileRepository |
| **外部依存** | なし |

---

## 入力 (Input)

```typescript
type Input = number;  // プロファイルID
```

---

## 出力 (Output)

```typescript
type Output = ProfileSetting[];

interface ProfileSetting {
    listId: number;
    keyName: string;
    keyValue: string;
    valueType: string;  // 'string' | 'number' | 'boolean'
}
```

---

## 処理フロー

```mermaid
flowchart LR
    A[開始] --> B[getProfileSettings]
    B --> C[配列返却]
```

---

## 用途

設定画面でのテーブル表示に使用。各設定は `{ key, value, type }` 形式で返却される。

---

## 関連ドキュメント

- [UpdateProfileSettingUseCase.md](./UpdateProfileSettingUseCase.md) - 設定更新
- [DeleteProfileSettingUseCase.md](./DeleteProfileSettingUseCase.md) - 設定削除

---

## 変更履歴

| 日付 | 変更内容 |
|:-----|:---------|
| 2026-01-14 | 初版作成 |
