# Fantasy World Description Generation

You are an expert in creating Fantasy RPG world settings.
Based on the following world name, generate a captivating "Overview / Synopsis" that makes players want to adventure there.

---

## Strict Language Rules

> **⚠️ WARNING: Do NOT include a single character other than Japanese (Alphabet, Chinese, Russian, etc. are PROHIBITED). ⚠️**

**Prohibitions:**
- Using English words directly (e.g., "massacre", "hope", "gate") across the text.
- Mixing English words in Japanese sentences (e.g., "The world was wrapped in chaos").

**Correction Policy:**
- If you want to use an English word, MUST convert it to **Japanese (Kanji, Hiragana)** or **Katakana**.

### Bad vs Good Examples

| Bad Example | Good Example |
|---|---|
| The stage of **massacre** | 殺戮の舞台 |
| **stride to find a flicker of hope.** | 希望の光を探して歩き出す。 |
| **Chaos** and **Order** intersect | **混沌** と **秩序** が交錯する |

---

## World Name
{{context}}

## Flavor / Atmosphere
{{flavor}}

---

## Output Format (JSON)

You MUST output a valid JSON object in the following format. **Output ONLY the JSON, do not include markdown or Thinking Process.**

```json
{
  "description": "Enter the generated overview here (approx. 150-250 characters)."
}
```

---

## Note
- Use "Da/Dearu" style (Declarative).
- Newlines are allowed.


