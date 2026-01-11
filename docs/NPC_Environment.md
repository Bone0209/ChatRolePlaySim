# NPC環境データ構造定義

このドキュメントは、NPCエンティティの `environment` JSONフィールドに格納されるデータ構造を定義します。
全てのプロパティを **統一されたレコード形式** で定義し、階層構造（Persona/Parameterなど）を廃止して **`category` フィールド** によるフラットな管理を採用します。

## データ型定義

全てのプロパティ値は以下の共通型を使用します。

```ts
type NpcProperty<T = any> = {
  value: T;           // 実際の値 (String, Number, Boolean, etc.)
  visible: boolean;   // プレイヤーに公開されているか
  category: 'basic' | 'persona' | 'parameter' | 'state'; // データの分類
}
```

## JSON構造

`environment` オブジェクトのルートに、各プロパティ項目がフラット配置されます。

### カテゴリ分類
- **basic**: 名前や種族など、キャラクターの根幹情報。基本的に公開。
- **persona**: 性格、背景、演出用データ。
- **parameter**: 能力値、統計データ。
- **state**: 現在の状態、好感度、変動値。

---

## 定義済みプロパティ一覧

### Basic (基本情報)
| キー | 型 | デフォルト可視性 | 説明 |
| :--- | :--- | :--- | :--- |
| `name` | String | **true** | フルネーム。 |
| `race` | String | **true** | 種族。 |
| `gender` | String | **true** | 性別。 |
| `ageGroup` | String | **true** | 年齢層。 |

### Persona (性格・背景)
| キー | 型 | デフォルト可視性 | 説明 |
| :--- | :--- | :--- | :--- |
| `title` | String | **true** | 肩書き。 |
| `appearance` | String | **true** | 外見。 |
| `publicQuote` | String | **true** | 公言セリフ。 |
| `role` | String | **false** | 役割（AI用）。 |
| `personality` | String | **false** | 性格詳細。 |
| `background` | String | **false** | 背景ストーリー。 |
| `speakingStyle`| String | **false** | 話し方。 |
| `romanticExperience` | String | **false** | 恋愛経験（例: 未経験, 死別, 豊富）。 |

### Parameter (能力値)
| キー | 型 | デフォルト可視性 | 説明 |
| :--- | :--- | :--- | :--- |
| `maxHp` | Number | **false** | 最大体力。 |
| `maxMp` | Number | **false** | 最大魔力。 |
| `strength` | Number | **false** | 筋力。 |
| `intelligence`| Number | **false** | 知力。 |
| `dexterity` | Number | **false** | 器用さ。 |
| `charisma` | Number | **false** | 魅力。 |
| `isCombative` | Boolean | **false** | 戦闘能力。 |
| `romanceThreshold` | Number | **false** | 恋愛関係になるための好感度閾値（標準: 400-700）。 |
| `marriageThreshold` | Number | **false** | 婚姻関係になるための好感度閾値（標準: 800-950）。 |

### State (状態)
| キー | 型 | デフォルト可視性 | 説明 |
| :--- | :--- | :--- | :--- |
| `currentHp` | Number | **true** | 現在体力（戦闘時などに表示）。 |
| `currentMp` | Number | **true** | 現在魔力。 |
| `condition` | String | **true** | 状態異常テキスト。 |
| `mood` | String | **true** | 現在の気分。 |
| `locationName`| String | **true** | 現在地。 |
| `affection` | Number | **false** | 好感度。 |

---

## JSONオブジェクトの例

```json
{
  "name": { 
    "value": "賢者エルドリン", 
    "category": "basic", 
    "visible": true 
  },
  "race": { 
    "value": "人間", 
    "category": "basic", 
    "visible": true 
  },
  "title": { 
    "value": "大図書館長", 
    "category": "persona", 
    "visible": true 
  },
  "strength": { 
    "value": 10, 
    "category": "parameter", 
    "visible": false 
  },
  "intelligence": { 
    "value": 95, 
    "category": "parameter", 
    "visible": false 
  },
  "affection": { 
    "value": 30, 
    "category": "state", 
    "visible": false 
  },
  "currentHp": { 
    "value": 80, 
    "category": "state", 
    "visible": true 
  },
  "mood": { 
    "value": "思索中", 
    "category": "state", 
    "visible": true 
  }
}
```
