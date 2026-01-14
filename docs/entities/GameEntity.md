# GameEntity エンティティ仕様書

## 概要

ゲーム内のエンティティ（プレイヤー、NPC等）を表すドメインエンティティ。
Persona（性格）、Parameter（能力値）、State（状態）の3カテゴリのパラメータを持つ。

---

## 基本情報

| 項目 | 内容 |
|:-----|:-----|
| **ファイルパス** | `main/domain/entities/GameEntity.ts` |
| **識別子** | id (string, UUID) |

---

## 型定義

```typescript
type EntityType = 'ENTITY_WORLD' | 'ENTITY_PLAYER' | 'ENTITY_NPC';

type ParameterMap = Map<string, ParameterValue<unknown>>;
```

---

## プロパティ

| プロパティ | 型 | 説明 |
|:-----------|:---|:-----|
| id | string | 一意識別子 |
| worldId | string | 所属ワールドID |
| type | EntityType | エンティティ種類 |
| name | string | 名前 |
| description | string | 説明 |
| createdAt | Date | 作成日時 |
| persona | ParameterMap | 性格・背景パラメータ |
| parameter | ParameterMap | 能力値パラメータ |
| state | ParameterMap | 状態パラメータ |

---

## ファクトリメソッド

### GameEntity.create(params)

新しいエンティティを作成。

### GameEntity.reconstruct(params)

DBから復元。

---

## ビジネスメソッド

### isPlayer() / isNpc()

種類判定。

### getAffection(): number

好感度を取得（`parameter['affection']`、デフォルト0）。

### getLocation(): string

現在地名を取得（`state['location']`）。

### getLocationId(): string

現在地IDを取得（`state['locationId']`）。

### updateState(key, value): GameEntity

Stateパラメータを更新した新しいエンティティを返す（不変性維持）。

### updateParameterValue(key, value): GameEntity

Parameterを更新した新しいエンティティを返す。

### updateAffection(newValue): GameEntity

好感度を更新した新しいエンティティを返す。

### getParameterValue(key): unknown

全カテゴリから指定キーの値を検索。

### getPublicParameters(): Record<string, unknown>

公開パラメータのみを取得。

### getAllParameters(): Record<string, { val, vis, category }>

全パラメータをフラットなオブジェクトで取得。

---

## パラメータカテゴリ

| カテゴリ | 内容 | 例 |
|:---------|:-----|:---|
| persona | 性格・背景 | personality, role, background |
| parameter | 能力値 | maxHp, strength, affection |
| state | 現在状態 | location, mood, currentHp |

---

## テーブルマッピング

| テーブル群 | 役割 |
|:-----------|:-----|
| m_entities | 基本情報 |
| m/t/h_entity_personas | Personaデータ |
| m/t/h_entity_parameters | Parameterデータ |
| m/t/h_entity_states | Stateデータ |

---

## 関連ドキュメント

- [IEntityRepository.md](../repositories/IEntityRepository.md) - リポジトリ
- [NPC_Environment.md](../NPC_Environment.md) - NPCデータ構造
- [ParameterValue.md](../value-objects/ParameterValue.md) - パラメータ値

---

## 変更履歴

| 日付 | 変更内容 |
|:-----|:---------|
| 2026-01-14 | 初版作成 |
