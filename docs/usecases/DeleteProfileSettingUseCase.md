# DeleteProfileSettingUseCase 仕様書

## 概要

プロファイルから個別設定を削除するユースケース。

---

## 基本情報

| 項目 | 内容 |
|:-----|:-----|
| **ファイルパス** | `main/application/usecases/profile/DeleteProfileSettingUseCase.ts` |
| **カテゴリ** | Profile |
| **依存リポジトリ** | PrismaUserProfileRepository |
| **外部依存** | なし |

---

## 入力 (Input)

```typescript
interface Input {
    listId: number;      // プロファイルID
    keyName: string;     // 設定キー
}
```

---

## 出力 (Output)

```typescript
type Output = void;
```

---

## 処理フロー

```mermaid
flowchart LR
    A[開始] --> B[deleteProfileSetting]
    B --> C[完了]
```

---

## 関連ドキュメント

- [GetProfileSettingsUseCase.md](./GetProfileSettingsUseCase.md) - 設定取得
- [UpdateProfileSettingUseCase.md](./UpdateProfileSettingUseCase.md) - 設定更新

---

## 変更履歴

| 日付 | 変更内容 |
|:-----|:---------|
| 2026-01-14 | 初版作成 |
