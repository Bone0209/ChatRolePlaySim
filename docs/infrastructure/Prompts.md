# Prompts (PromptTemplate) 仕様書

## 概要

マークダウンファイルからプロンプトを読み込み、変数置換を行うテンプレートエンジン。

---

## 基本情報

| 項目 | 内容 |
|:-----|:-----|
| **ファイルパス** | `main/infrastructure/prompts/PromptTemplate.ts` |

---

## クラス: PromptTemplate

### constructor(filePath: string)

テンプレートファイルを読み込む。

**エラー**: ファイルが存在しない場合はエラーをスロー

---

### render(variables: Record<string, unknown>): string

テンプレート内のプレースホルダーを値で置換。

**プレースホルダー形式**: `{{key}}`

**変換ルール**:
- オブジェクト・配列: `JSON.stringify(value, null, 2)`
- その他: `String(value)`

---

## 使用例

```typescript
const template = new PromptTemplate('prompts/world_gen_npc.md');

const prompt = template.render({
    context: 'ファンタジー世界',
    flavor: '魔法と剣の世界',
    seed: 'abc123'
});
```

---

## プロンプトファイル一覧

| ファイル | 用途 |
|:---------|:-----|
| `system.md` | チャットシステムプロンプト |
| `user_prompt.md` | チャットユーザープロンプト |
| `action_analysis.md` | アクション分析 |
| `world_gen_system.md` | ワールド生成システム |
| `world_gen_title.md` | タイトル生成 |
| `world_gen_desc.md` | 説明生成 |
| `world_gen_npc.md` | NPC生成 |

---

## 関連ドキュメント

- [LlmGateway.md](../gateways/LlmGateway.md) - テンプレート使用先
- [WorldHandler.md](../handlers/WorldHandler.md) - AI生成処理

---

## 変更履歴

| 日付 | 変更内容 |
|:-----|:---------|
| 2026-01-14 | 初版作成 |
