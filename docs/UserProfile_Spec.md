# ユーザープロファイル機能仕様書

## 概要
ユーザーが複数のプロファイルを管理し、システム全体の設定（LLM設定など）を柔軟に保存・参照できる機能を実装する。

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
プロファイルごとの詳細設定をKey-Value形式で保存するテーブル。

| カラム名 | 型 | 説明 |
| :--- | :--- | :--- |
| `list_id` | Int (FK) | `t_user_profile_lists.id` への外部キー (複合PK) |
| `key_name` | String | 設定キー (複合PK) |
| `key_value` | String | 設定値 |
| `value_type` | String | 値の型 ('string', 'number', 'boolean') ※Object/JSONは除外 |

※ `list_id` と `key_name` で複合主キーを構成する。

### 3. ユーザー設定 (`t_user_settings`)
プロファイルに依存しない、ユーザー全体のグローバル設定をKey-Value形式で保存するテーブル。

| カラム名 | 型 | 説明 |
| :--- | :--- | :--- |
| `key_name` | String (PK) | 設定キー |
| `key_value` | String | 設定値 |
| `value_type` | String | 値の型 ('string', 'number', 'boolean') ※Object/JSONは除外 |

> [!NOTE]
> 現在アクティブなプロファイルは、キー `sys.active_profile` に `t_user_profile_lists.id` (または識別子) を値として保存することで管理する。
> LLM設定 (`sys.llm.*`) もここに保存し、全プロファイルで共有する。

## 機能要件

### グローバル設定 (Global Settings)
以下の設定は `t_user_settings` で管理し、全プロファイル共通とする。

#### LLM設定 (Primary)
- `sys.llm.first.api_key` (string): APIキー
- `sys.llm.first.api_endpoint` (string): エンドポイントURL
- `sys.llm.first.model` (string): モデル名
- `sys.llm.first.context` (number): コンテキスト長

#### LLM設定 (Secondary)
- `sys.llm.second.*` も同様の構成とする。

### UI要件
- **アクセス性**: どの画面（UI）からでもプロファイル設定画面を開くことができるようにする。
- **プロファイル作成**:
    - 作成時は `profile_name` のみを指定（固定作成）。
- **設定画面**:
    - "Global Settings" (LLM設定など) と "Profile Settings" (プロファイル固有設定) を分けて表示する。

