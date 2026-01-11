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
    "value": "...",       // Actual value (String, Number, Boolean)
    "category": "...",    // Category (basic, persona, parameter, state)
    "visible": true/false // Whether it is initially visible to the player
}
```

### Categories
- **basic**: Name, Race, Gender, Age Group (Initial Visibility: true)
- **persona**: Title, Appearance, Personality, Background, Tone, etc. (Initial Visibility: Mixed)
- **parameter**: Stats (Initial Visibility: false)
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
      "firstPerson": { "value": "一人称（例: 私、ボク、俺、我、わらわ）", "category": "persona", "visible": true },
      "ending": { "value": "語尾（例: です・ます、だ・である、～じゃ、～だね）", "category": "persona", "visible": true },
      "romanticExperience": { "value": "恋愛経験（例: 未経験、死別、豊富、トラウマあり）", "category": "persona", "visible": false },

      "maxHp": { "value": 100, "category": "parameter", "visible": false },
      "maxMp": { "value": 50, "category": "parameter", "visible": false },
      "strength": { "value": 10, "category": "parameter", "visible": false },
      "intelligence": { "value": 10, "category": "parameter", "visible": false },
      "dexterity": { "value": 10, "category": "parameter", "visible": false },
      "charisma": { "value": 10, "category": "parameter", "visible": false },
      "isCombative": { "value": true, "category": "parameter", "visible": false },
      "romanceThreshold": { "value": 500, "category": "parameter", "visible": false },
      "marriageThreshold": { "value": 800, "category": "parameter", "visible": false },

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
