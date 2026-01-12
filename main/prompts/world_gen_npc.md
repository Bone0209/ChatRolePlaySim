# Roleplay Character & Location Generation

You are an expert in RPG world settings. Based on the provided world context, generate a **unique NPC (Companion)** and a **Location** where this NPC exists.

---

## Language Rules (CRITICAL)

> ⚠️ **All output values MUST be in Japanese.**
> - **Names**: Use Katakana, Kanji, Hiragana, or Japanese-style coined words.
> - **English names / Alphabets are STRICTLY PROHIBITED.**
> - **Descriptions**: Write in natural, readable Japanese.

---

## Data Structure Definition

The NPC environment data is constructed as a flat JSON object. Each property has the following structure:

```json
"keyName": {
    "val": "...",       // Actual value (String, Number, Boolean)
    "category": "...",    // Category (basic, persona, parameter, state)
    "vis": "vis_public" // Visibility (vis_public, vis_private)
}
```

### Categories
- **basic**: Name, Race, Gender, Age Group (Initial Visibility: vis_public)
- **persona**: Title, Appearance, Personality, Background, Tone, etc. (Initial Visibility: Mixed)
- **parameter**: Stats (Initial Visibility: vis_private)
- **state**: Current state, Mood, Affection (Initial Visibility: Mixed)

---

## Input Info

- **World Context**: {{context}}
- **Flavor (Atmosphere)**: {{flavor}}

---

## Output Format (JSON)

You MUST output a valid JSON object in the following format. **Output ONLY the JSON, do not wrap it in markdown code blocks.**

{
  "npc": {
    "environment": {
      "name": { "val": "キャラクター名（日本語）", "category": "basic", "vis": "vis_public" },
      "race": { "val": "種族（例: 人間、エルフ、機械人形）", "category": "basic", "vis": "vis_public" },
      "gender": { "val": "性別", "category": "basic", "vis": "vis_public" },
      "ageGroup": { "val": "年齢層（例: 少年、若者、老人、不詳）", "category": "basic", "vis": "vis_public" },

      "title": { "val": "肩書き・職業", "category": "persona", "vis": "vis_public" },
      "appearance": { "val": "外見描写（50文字程度）", "category": "persona", "vis": "vis_public" },
      "publicQuote": { "val": "代表的なセリフ・口癖", "category": "persona", "vis": "vis_public" },
      "role": { "val": "物語上の役割（例: 案内人、護衛、謎の賢者）", "category": "persona", "vis": "vis_private" },
      "personality": { "val": "性格詳細（30文字程度）", "category": "persona", "vis": "vis_private" },
      "background": { "val": "背景・過去（100文字程度）", "category": "persona", "vis": "vis_private" },
      "speakingStyle": { "val": "話し方（例: 敬語、古風、生意気）", "category": "persona", "vis": "vis_private" },
      "firstPerson": { "val": "一人称（例: 私、ボク、俺、我、わらわ）", "category": "persona", "vis": "vis_public" },
      "ending": { "val": "語尾（例: です・ます、だ・である、～じゃ、～だね）", "category": "persona", "vis": "vis_public" },
      "romanticExperience": { "val": "恋愛経験（例: 未経験、死別、豊富、トラウマあり）", "category": "persona", "vis": "vis_private" },

      "maxHp": { "val": 100, "category": "parameter", "vis": "vis_private" },
      "maxMp": { "val": 50, "category": "parameter", "vis": "vis_private" },
      "strength": { "val": 10, "category": "parameter", "vis": "vis_private" },
      "intelligence": { "val": 10, "category": "parameter", "vis": "vis_private" },
      "dexterity": { "val": 10, "category": "parameter", "vis": "vis_private" },
      "charisma": { "val": 10, "category": "parameter", "vis": "vis_private" },
      "isCombative": { "val": true, "category": "parameter", "vis": "vis_private" },
      "romanceThreshold": { "val": 500, "category": "parameter", "vis": "vis_private" },
      "marriageThreshold": { "val": 800, "category": "parameter", "vis": "vis_private" },

      "currentHp": { "val": 100, "category": "state", "vis": "vis_public" },
      "currentMp": { "val": 50, "category": "state", "vis": "vis_public" },
      "condition": { "val": "健康", "category": "state", "vis": "vis_public" },
      "mood": { "val": "通常の気分", "category": "state", "vis": "vis_public" },
      "affection": { "val": 30, "category": "state", "vis": "vis_private" }
    }
  },
  "location": {
    "name": "場所の名前（日本語）",
    "type": "場所の種類",
    "description": "場所の描写（100文字程度）"
  }
}
