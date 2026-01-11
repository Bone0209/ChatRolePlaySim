# 行動解析 / Action Analysis

ChatRPGでは、ユーザーの自然言語入力を解析し、具体的な行動データとして処理するために「Action Analysis」プロセスを導入しています。

## 処理フロー

1. **ユーザー入力**: プレイヤーがチャット欄にテキストを入力（例: "剣で攻撃する！" "こんにちは"）。
2. **Action Analysis (Local LLM)**: 
   - 比較的高速なローカルLLM（8B-14Bクラス）に入力を渡します。
   - 入力を解析し、定義されたJSONフォーマットで出力します。
   - この際、キャラクターの好感度（Affection）に基づき、その行動が「受容 (Accepted)」されるか「拒否 (Refused)」されるかも判定させます（または判定のためのパラメータを抽出します）。
3. **Game State Update (Backend)**:
   - 解析された行動タイプ（Talk, Action, Look, etc.）に基づき、ゲーム内の時間やステップ数を進行させます。
   - 行動が拒否された場合は、ペナルティや進行のキャンセルなどが発生する可能性があります。
4. **Response Generation (Main LLM)**:
   - 解析結果と現在の状況をメインLLMに渡し、最終的なロールプレイ応答を生成します。

## JSON データ構造

ローカルLLMが出力するJSON構造は以下の通りです。

```json
{
  "actions": [
    {
      "type": "TALK", // TALK, ACTION, LOOK, SYSTEM
      "content": "こんにちは", // 抽出された具体的な内容
      "target": "Villager A", // 対象（明示的でなければnullまたは推定）
      "sentiment": "positive", // positive, negative, neutral
      "affection_score": 50 // この行動に対する好感度変動予測（オプション）
    }
  ],
  "is_refused": false, // キャラクターがこの行動を拒否するかどうか
  "refusal_reason": null // 拒否する場合の理由
}
```

### Action Types

| Type | Description | Cost (Steps) |
|Data Type|Description|Cost (Steps)|
|---|---|---|
| `TALK` | 会話、質問、挨拶など | 1 |
| `ACTION` | 攻撃、移動、使用、物理的な干渉 | 3 |
| `LOOK` | 調べる、観察する | 0 (or 1) |
| `SYSTEM` | ゲームシステムへの命令（セーブ、設定など） | 0 |

## プロンプト戦略

ローカルLLMには、以下の役割を与えます。
- ユーザー入力から「意図」を抽出すること。
- RPGのコンテキスト（現在地、対象）を考慮すること。
- 出力を厳密なJSONに限定すること。
