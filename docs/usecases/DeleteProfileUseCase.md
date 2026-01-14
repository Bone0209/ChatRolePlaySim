# DeleteProfileUseCase 仕様書

## 概要

指定されたユーザープロファイルを削除するユースケース。

---

## 基本情報

| 項目 | 内容 |
|:-----|:-----|
| **ファイルパス** | `main/application/usecases/profile/DeleteProfileUseCase.ts` |
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
type Output = void;
```

---

## 処理フロー

```mermaid
flowchart LR
    A[開始] --> B[deleteProfile実行]
    B --> C[完了]
```

---

## 注意事項

- プロファイル削除時、関連する `t_user_profiles` のレコードも `CASCADE` により自動削除される
- アクティブプロファイルを削除した場合、`sys.active_profile` の更新は行われない（呼び出し側で対応が必要）

---

## 関連ドキュメント

- [CreateProfileUseCase.md](./CreateProfileUseCase.md) - プロファイル作成
- [SwitchProfileUseCase.md](./SwitchProfileUseCase.md) - プロファイル切替

---

## 変更履歴

| 日付 | 変更内容 |
|:-----|:---------|
| 2026-01-14 | 初版作成 |
