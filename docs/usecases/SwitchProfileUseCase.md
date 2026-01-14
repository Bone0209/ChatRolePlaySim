# SwitchProfileUseCase 仕様書

## 概要

アクティブなユーザープロファイルを切り替えるユースケース。

---

## 基本情報

| 項目 | 内容 |
|:-----|:-----|
| **ファイルパス** | `main/application/usecases/profile/SwitchProfileUseCase.ts` |
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
interface Output {
    success: boolean;
    activeId: number;
}
```

---

## 処理フロー

```mermaid
flowchart LR
    A[開始] --> B[sys.active_profile更新]
    B --> C[結果返却]
```

---

## 詳細処理

グローバル設定 `sys.active_profile` を指定されたプロファイルIDで更新する。

```typescript
await repository.updateGlobalSetting(
    'sys.active_profile',
    profileId.toString(),
    'number'
);
```

---

## TODO

- プロファイルの存在チェック（現在はUIから渡されるIDを信頼）

---

## 関連ドキュメント

- [GetProfileListUseCase.md](./GetProfileListUseCase.md) - プロファイル一覧取得

---

## 変更履歴

| 日付 | 変更内容 |
|:-----|:---------|
| 2026-01-14 | 初版作成 |
