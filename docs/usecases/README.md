# ユースケース仕様書インデックス

本ディレクトリには、アプリケーション層で実装されている各ユースケースの仕様書が格納されています。

---

## カテゴリ別一覧

### Chat（チャット）

| ユースケース | 概要 |
|:-------------|:-----|
| [SendMessageUseCase](./SendMessageUseCase.md) | プレイヤーメッセージ送信と応答生成 |

### Game（ゲーム進行）

| ユースケース | 概要 |
|:-------------|:-----|
| [GetGameStateUseCase](./GetGameStateUseCase.md) | ゲーム状態の取得 |
| [ProcessActionUseCase](./ProcessActionUseCase.md) | アクション処理（時間経過） |
| [UpdateAffectionUseCase](./UpdateAffectionUseCase.md) | 好感度の更新 |

### World（ワールド管理）

| ユースケース | 概要 |
|:-------------|:-----|
| [CreateWorldUseCase](./CreateWorldUseCase.md) | ワールドの作成 |
| [GetWorldsUseCase](./GetWorldsUseCase.md) | ワールド一覧・詳細の取得 |

### Profile（プロファイル管理）

| ユースケース | 概要 |
|:-------------|:-----|
| [CreateProfileUseCase](./CreateProfileUseCase.md) | プロファイル作成 |
| [DeleteProfileUseCase](./DeleteProfileUseCase.md) | プロファイル削除 |
| [SwitchProfileUseCase](./SwitchProfileUseCase.md) | アクティブプロファイル切替 |
| [GetProfileListUseCase](./GetProfileListUseCase.md) | プロファイル一覧取得 |
| [GetProfileSettingsUseCase](./GetProfileSettingsUseCase.md) | プロファイル設定取得 |
| [UpdateProfileSettingUseCase](./UpdateProfileSettingUseCase.md) | プロファイル設定更新 |
| [DeleteProfileSettingUseCase](./DeleteProfileSettingUseCase.md) | プロファイル設定削除 |
| [GetGlobalSettingsUseCase](./GetGlobalSettingsUseCase.md) | グローバル設定取得 |
| [UpdateGlobalSettingUseCase](./UpdateGlobalSettingUseCase.md) | グローバル設定更新 |
| [InitializeGlobalSettingsUseCase](./InitializeGlobalSettingsUseCase.md) | グローバル設定初期化 |
| [TestConnectionUseCase](./TestConnectionUseCase.md) | LLM接続テスト |

---

## ディレクトリ構造

```
main/application/usecases/
├── chat/
│   └── SendMessageUseCase.ts
├── game/
│   ├── GetGameStateUseCase.ts
│   ├── ProcessActionUseCase.ts
│   └── UpdateAffectionUseCase.ts
├── profile/
│   ├── CreateProfileUseCase.ts
│   ├── DeleteProfileUseCase.ts
│   ├── DeleteProfileSettingUseCase.ts
│   ├── GetGlobalSettingsUseCase.ts
│   ├── GetProfileListUseCase.ts
│   ├── GetProfileSettingsUseCase.ts
│   ├── InitializeGlobalSettingsUseCase.ts
│   ├── SwitchProfileUseCase.ts
│   ├── TestConnectionUseCase.ts
│   ├── UpdateGlobalSettingUseCase.ts
│   └── UpdateProfileSettingUseCase.ts
└── world/
    ├── CreateWorldUseCase.ts
    └── GetWorldsUseCase.ts
```

---

## 関連ドキュメント

- [Refactoring_CleanArchitecture.md](../Refactoring_CleanArchitecture.md) - アーキテクチャ設計
- [Database_Specification.md](../Database_Specification.md) - データベース仕様

---

## 変更履歴

| 日付 | 変更内容 |
|:-----|:---------|
| 2026-01-14 | 初版作成（17ユースケース） |
