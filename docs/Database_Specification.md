# データベース仕様書 (Database Specification)

## 1. 命名規則 (Naming Conventions)

テーブル名およびオブジェクト名のプレフィックスにより、その役割を明確化します。

### プレフィックス定義

| プレフィックス | 分類 | 説明 |
| :--- | :--- | :--- |
| **m_** | Master (マスタ) | システム定義や基本設定など、頻繁に変更されないデータ。<br>例: `m_entities` (実体マスタ), `m_items` (アイテムマスタ) |
| **t_** | Transaction (トランザクション) | ユーザーの操作やゲーム進行により頻繁に変更される状態データ。<br>例: `t_entity_persona` (現在の個性データ), `t_chats` (チャットログ) |
| **h_** | History (ヒストリ) | データの変更履歴、ログ、差分データ。<br>例: `h_entity_persona` (個性の変更履歴) |

---

## 2. Environment (可変データ) の構造

Entityに関連する可変データ（Environment）は、単一のJSONカラムに集約せず、**カテゴリごとにテーブルを分割**して管理します。これにより、データの検索性と保守性を向上させます。

### テーブル構成例

Entityの「個性 (Persona)」データを例とします。

1.  **実体定義 (Master/Base)**
    -   テーブル名: `m_entities` (または `entities` ※既存テーブルからの移行過渡期)
    -   内容: ID, 名前, 作成日などの不変・基本情報。

2.  **現在データ (Transaction)**
    -   テーブル名: `t_entity_persona`
    -   内容: そのEntityの「現在」の個性パラメータセット。JSON型で保持することを許容するが、カテゴリ単位で分離されていることが重要。

3.  **履歴データ (History)**
    -   テーブル名: `h_entity_persona`
    -   内容: 個性データの変更履歴。いつ、何が、どう変わったかの差分を保持する。

---

## 3. 差分データ形式 (Diff Format)

`h_` (History) テーブル等で保存する差分データは、以下のJSONフォーマットを使用します。これにより、変更の種類（追加、削除、更新）を明確にします。

```json
{
  "diff": {
    "add": {
      "new_key": { "val": 100, "vis": "vis_public" }
    },
    "del": {
      "removed_key": null
    },
    "upd": {
      "existing_key": { "val": 50, "vis": "vis_private" }
    }
  }
}
```

- **add**: 新規に追加されたキーと値。
- **del**: 削除されたキー（値はnullまたは削除対象を示す情報）。
- **upd**: 既存の値が変更された場合の新しい値。

---

## 4. 可変データ形式 (Variable Data Format)

Entity Environmentに含まれる**すべての可変データ**は、Key-Value形式で保存し、必ず「値 (`val`)」と「可視性 (`vis`)」を持つ構造に統一します。

### JSON構造定義

```json
{
  "key_name": {
    "val": <任意のデータ型>,
    "vis": "<可視性定数>"
  }
}
```

### 構成要素

- **key_name**: パラメータ名（例: "love", "bravery", "description"）。
- **val**: 実際の値。数値、文字列、ブール値など。
- **vis**: そのデータの可視性制御。定数テーブル等で管理される識別子を使用。

### データ例

```json
{
  "love": {
    "val": 30,
    "vis": "vis_public"
  },
  "secret_trait": {
    "val": "tsundere",
    "vis": "vis_private"
  },
  "custom_color": {
    "val": "#FF5733",
    "vis": "vis_public"
  }
}
```
