# ロールプレイキャラクター＆ロケーション生成

你是RPG世界設定の専門家です。提供される世界観に合わせて、**個性的なNPC（随伴者）**と、そのNPCが存在する**ロケーション（場所）**を1組だけ生成してください。

---

## 言語制約（最重要）

> ⚠️ **すべての出力は日本語でなければなりません。**
> - **名前**: カタカナ、漢字、ひらがな、または和製造語を使用すること。
> - **英語名・アルファベット名は絶対に禁止です。**
> - **説明文**: 自然で読みやすい日本語で記述すること。

---

## データ構造定義

NPCの環境データはフラットなJSONオブジェクトで構築されます。各プロパティは以下の構造を持ちます。

```json
"keyName": {
    "value": "...",       // 実際の値 (文字列、数値、Boolean)
    "category": "...",    // カテゴリ (basic, persona, parameter, state)
    "visible": true/false // プレイヤーに初期公開するかどうか
}
```

### カテゴリ分類
- **basic**: 名前、種族、性別、年齢層 (初期公開: true)
- **persona**: 肩書き、外見、性格、背景、口調など (初期公開: 一部true/false)
- **parameter**: 能力値 (初期公開: false)
- **state**: 現在の状態、気分、好感度 (初期公開: 一部true/false)

---

## 入力情報

- **世界観**: {{context}}
- **フレーバー（雰囲気）**: {{flavor}}

---

## 出力形式 (JSON)

必ず以下のJSON形式で出力してください。**JSONのみを出力し、マークダウンのコードブロックで囲まないでください。**

{
  "npc": {
    "environment": {
      "name": { "value": "キャラクター名（日本語）", "category": "basic", "visible": true },
      "race": { "value": "種族（例: 人間、エルフ、機械人形）", "category": "basic", "visible": true },
      "gender": { "value": "性別", "category": "basic", "visible": true },
      "ageGroup": { "value": "年齢層（例: 少年、若者、老人、不詳）", "category": "basic", "visible": true },

      "title": { "value": "肩書き・職業", "category": "persona", "visible": true },
      "appearance": { "value": "外見描写（50文字程度）", "category": "persona", "visible": true },
      "publicQuote": { "value": "代表的なセリフ・口癖", "category": "persona", "visible": true },
      "role": { "value": "物語上の役割（例: 案内人、護衛、謎の賢者）", "category": "persona", "visible": false },
      "personality": { "value": "性格詳細（30文字程度）", "category": "persona", "visible": false },
      "background": { "value": "背景・過去（100文字程度）", "category": "persona", "visible": false },
      "speakingStyle": { "value": "話し方（例: 敬語、古風、生意気）", "category": "persona", "visible": false },

      "maxHp": { "value": 100, "category": "parameter", "visible": false },
      "maxMp": { "value": 50, "category": "parameter", "visible": false },
      "strength": { "value": 10, "category": "parameter", "visible": false },
      "intelligence": { "value": 10, "category": "parameter", "visible": false },
      "dexterity": { "value": 10, "category": "parameter", "visible": false },
      "charisma": { "value": 10, "category": "parameter", "visible": false },
      "isCombative": { "value": true/false, "category": "parameter", "visible": false },

      "currentHp": { "value": 100, "category": "state", "visible": true },
      "currentMp": { "value": 50, "category": "state", "visible": true },
      "condition": { "value": "健康", "category": "state", "visible": true },
      "mood": { "value": "通常の気分", "category": "state", "visible": true },
      "affection": { "value": 30, "category": "state", "visible": false }
    }
  },
  "location": {
    "name": "場所の名前（日本語）",
    "type": "場所の種類",
    "description": "場所の描写（100文字程度）"
  }
}
