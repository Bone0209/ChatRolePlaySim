# ユーザープロファイル機能仕様書

## 概要
ユーザーが複数のプロファイルを管理し、システム全体の設定（LLM設定など）を柔軟に保存・参照できる機能。

## データベース設計

### 1. プロファイルリスト (`t_user_profile_lists`)
プロファイルのメタデータを管理するテーブル。

| カラム名 | 型 | 説明 |
| :--- | :--- | :--- |
| `id` | Int (PK) | 自動採番 |
| `profile_name` | String | プロファイル名 |
| `created_at` | DateTime | 作成日時 |
| `updated_at` | DateTime | 更新日時 |

### 2. プロファイル詳細 (`t_user_profiles`)
プロファイルごとの詳細設定をKey-Value形式で保存。

| カラム名 | 型 | 説明 |
| :--- | :--- | :--- |
| `list_id` | Int (FK) | `t_user_profile_lists.id` への外部キー (複合PK) |
| `key_name` | String | 設定キー (複合PK) |
| `key_value` | String | 設定値 |
| `value_type` | String | 値の型 ('string', 'number', 'boolean') |

**標準設定キー:**
- `PlayerName` - プレイヤー名
- `PlayerGender` - プレイヤー性別
- `PlayerDescription` - プレイヤー説明

### 3. ユーザー設定 (`t_user_settings`)
プロファイルに依存しないグローバル設定をKey-Value形式で保存。

| カラム名 | 型 | 説明 |
| :--- | :--- | :--- |
| `key_name` | String (PK) | 設定キー |
| `key_value` | String | 設定値 |
| `value_type` | String | 値の型 |

> [!NOTE]
> - `sys.active_profile`: 現在アクティブなプロファイルID
> - APIキー (`*.api_key`) は暗号化して保存

---

## グローバル設定キー

### LLM設定 (Primary: `sys.llm.first.*`)
| キー | 型 | 説明 |
| :--- | :--- | :--- |
| `sys.llm.first.api_key` | string | APIキー (暗号化保存) |
| `sys.llm.first.api_endpoint` | string | エンドポイントURL |
| `sys.llm.first.model` | string | モデル名 |
| `sys.llm.first.context` | number | コンテキスト長 |

### LLM設定 (Secondary: `sys.llm.second.*`)
同様の構成。サブモデル（アクション分析用）に使用。

---

## 実装済み機能

### バックエンド

#### リポジトリ
- `PrismaUserProfileRepository` - DB操作を担当
  - `getProfileList()` / `createProfile()` / `deleteProfile()`
  - `getProfileSettings()` / `updateProfileSetting()` / `deleteProfileSetting()`
  - `getGlobalSettings()` / `updateGlobalSetting()` / `getGlobalSetting()`

#### ユースケース
| ユースケース | 説明 |
| :--- | :--- |
| `CreateProfileUseCase` | プロファイル作成（デフォルト設定付き） |
| `DeleteProfileUseCase` | プロファイル削除 |
| `SwitchProfileUseCase` | アクティブプロファイル切替 |
| `GetProfileListUseCase` | プロファイル一覧取得 |
| `GetProfileSettingsUseCase` | プロファイル設定取得 |
| `UpdateProfileSettingUseCase` | プロファイル設定更新 |
| `DeleteProfileSettingUseCase` | プロファイル設定削除 |
| `GetGlobalSettingsUseCase` | グローバル設定取得 |
| `UpdateGlobalSettingUseCase` | グローバル設定更新 |
| `InitializeGlobalSettingsUseCase` | 初期設定作成 |
| `TestConnectionUseCase` | LLM接続テスト |

#### セキュリティ
- `EncryptionService` - Electron `safeStorage` によるAPIキー暗号化
  - `encrypt(plainText)` / `decrypt(encryptedBase64)`
  - 保存時に自動暗号化、取得時に自動復号化

#### IPC ハンドラ (`UserProfileHandler`)
| チャンネル | 説明 |
| :--- | :--- |
| `profile:list` | プロファイル一覧取得 |
| `profile:create` | プロファイル作成 |
| `profile:switch` | アクティブプロファイル切替 |
| `profile:delete` | プロファイル削除 |
| `profile:get-settings` | プロファイル設定取得 |
| `profile:update-setting` | プロファイル設定更新 |
| `profile:delete-setting` | プロファイル設定削除 |
| `profile:get-global-settings` | グローバル設定取得（APIキーはマスク） |
| `profile:update-global-setting` | グローバル設定更新 |
| `profile:test-connection` | LLM接続テスト |

### フロントエンド

#### 設定ページ (`renderer/pages/settings.tsx`)
- **左サイドバー**: プロファイル一覧（カード形式）
  - アクティブプロファイルのハイライト表示
  - 新規プロファイル作成入力欄
  - 削除ボタン
- **メインエリア**:
  - **Global Settings**: LLM設定（メイン/サブ）のグループ表示
    - APIキー入力（マスク表示、編集時クリア）
    - 接続テストボタン
    - コンテキストサイズスライダー
  - **Profile Settings**: プレイヤー情報の編集
    - PlayerName / PlayerGender / PlayerDescription が優先表示
    - カスタム設定の追加・削除

#### チャットページ連携
- プレイヤー名をプロファイルから取得して表示
- LLM設定未完了時に設定ページへ誘導ダイアログ表示

---

## LLMプロンプト連携

プロファイル情報は `user_prompt.md` に注入される:

```markdown
## Player Character
- **Name**: {{playerName}}
- **Gender**: {{playerGender}}
- **Description**: {{playerDescription}}
```

`SendMessageUseCase` が以下を実行:
1. アクティブプロファイルIDを取得
2. プロファイル設定から `PlayerName`, `PlayerGender`, `PlayerDescription` を取得
3. `LlmGateway.generateRolePlayResponse()` に `playerProfile` オブジェクトとして渡す

---

## 画面アクセス

設定ページへのアクセス経路:
- **チャット画面**: 右サイドバー下部の歯車アイコン
- **ワールド選択画面**: ヘッダー右の歯車アイコン

---

## エラーハンドリング

### 設定未完了時
1. `SendMessageUseCase` が `MissingConfigurationError` をスロー
2. `ChatHandler` がエラーオブジェクトを返却（Electronエラーダイアログ抑制）
3. フロントエンドで確認ダイアログ表示:
   - 「LLMの設定が不足しています。設定ページに移動しますか？」
4. ユーザーが承諾すると `/settings` へ遷移
