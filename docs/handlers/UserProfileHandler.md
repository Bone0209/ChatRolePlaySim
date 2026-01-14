# UserProfileHandler 仕様書

## 概要

プロファイル・設定関連のIPCハンドラ。プロファイル管理とグローバル設定を担当。

---

## 基本情報

| 項目 | 内容 |
|:-----|:-----|
| **ファイルパス** | `main/interface-adapters/ipc/UserProfileHandler.ts` |
| **クラス** | `UserProfileHandler` |
| **セットアップ関数** | `setupUserProfileHandlers()` |

---

## IPCチャンネル

### profile:list

プロファイル一覧を取得。初回呼び出し時にデフォルト設定とプロファイルを自動生成。

**戻り値**: `{ profiles: ProfileListItem[]; activeId: number | null }`

---

### profile:create

プロファイルを作成。

**パラメータ**: `name: string`

---

### profile:switch

アクティブプロファイルを切替。

**パラメータ**: `id: number`

---

### profile:get-settings

プロファイル設定を取得。

**パラメータ**: `id: number`

**戻り値**: `ProfileSetting[]`

---

### profile:update-setting

プロファイル設定を更新。

**パラメータ**: `{ id, key, value, type }`

---

### profile:delete

プロファイルを削除。

**パラメータ**: `id: number`

---

### profile:delete-setting

プロファイル設定を削除。

**パラメータ**: `{ id, key }`

---

### profile:get-global-settings

グローバル設定を取得。APIキーはマスク表示。

**戻り値**: `GlobalSetting[]`（api_keyは`'(Configured)'`に変換）

---

### profile:update-global-setting

グローバル設定を更新。

**パラメータ**: `{ key, value, type }`

---

### profile:test-connection

LLM接続テストを実行。

**パラメータ**: `target: 'first' | 'second'`

**戻り値**: `{ success: boolean; message: string }`

---

## 注入UseCase

| UseCase | 用途 |
|:--------|:-----|
| GetProfileListUseCase | 一覧取得 |
| CreateProfileUseCase | 作成 |
| SwitchProfileUseCase | 切替 |
| GetProfileSettingsUseCase | プロファイル設定取得 |
| UpdateProfileSettingUseCase | プロファイル設定更新 |
| GetGlobalSettingsUseCase | グローバル設定取得 |
| UpdateGlobalSettingUseCase | グローバル設定更新 |
| InitializeGlobalSettingsUseCase | 初期設定 |
| DeleteProfileUseCase | プロファイル削除 |
| DeleteProfileSettingUseCase | プロファイル設定削除 |
| TestConnectionUseCase | 接続テスト |

---

## 関連ドキュメント

- [UserProfile_Spec.md](../UserProfile_Spec.md) - プロファイル仕様

---

## 変更履歴

| 日付 | 変更内容 |
|:-----|:---------|
| 2026-01-14 | 初版作成 |
