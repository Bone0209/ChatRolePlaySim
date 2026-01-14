# UpdateProfileSettingUseCase 仕様書

## 概要

プロファイルの個別設定を追加または更新するユースケース。

---

## 基本情報

| 項目 | 内容 |
|:-----|:-----|
| **ファイルパス** | `main/application/usecases/profile/UpdateProfileSettingUseCase.ts` |
| **カテゴリ** | Profile |
| **依存リポジトリ** | PrismaUserProfileRepository |
| **外部依存** | なし |

---

## 入力 (Input)

```typescript
interface Input {
    profileId: number;   // プロファイルID
    key: string;         // 設定キー
    value: string;       // 設定値
    type: string;        // 値の型 ('string' | 'number' | 'boolean')
}
```

---

## 出力 (Output)

```typescript
type Output = ProfileSetting;
```

---

## 処理フロー

```mermaid
flowchart LR
    A[開始] --> B[updateProfileSetting]
    B --> C[更新結果返却]
```

---

## 動作

- キーが存在しない場合: 新規作成（INSERT）
- キーが存在する場合: 更新（UPDATE）

---

## 関連ドキュメント

- [GetProfileSettingsUseCase.md](./GetProfileSettingsUseCase.md) - 設定取得
- [DeleteProfileSettingUseCase.md](./DeleteProfileSettingUseCase.md) - 設定削除

---

## 変更履歴

| 日付 | 変更内容 |
|:-----|:---------|
| 2026-01-14 | 初版作成 |
