# IEntityRepository 仕様書

## 概要

ゲームエンティティ（GameEntity）の永続化とパラメータ管理を担当するリポジトリインターフェース。
プレイヤーやNPCのCRUD操作に加え、パラメータ更新と履歴記録を提供する。

---

## 基本情報

| 項目 | 内容 |
|:-----|:-----|
| **ファイルパス** | `main/domain/repositories/IEntityRepository.ts` |
| **対象エンティティ** | GameEntity |
| **実装クラス** | PrismaEntityRepository |

---

## 型定義

```typescript
type ParameterCategory = 'state' | 'persona' | 'parameter';
```

---

## メソッド一覧

### findById(id: string): Promise<GameEntity | null>

IDでエンティティを検索。

---

### findByWorldId(worldId: string): Promise<GameEntity[]>

ワールドに属するすべてのエンティティを取得。

---

### findByType(type: EntityType, worldId?: string): Promise<GameEntity[]>

種類（ENTITY_PLAYER, ENTITY_NPC等）でエンティティを検索。
ワールドIDで絞り込み可能。

---

### findPlayer(worldId: string): Promise<GameEntity | null>

ワールドのプレイヤーエンティティを取得。

---

### findNpcsByLocation(locationId: string, worldId: string): Promise<GameEntity[]>

指定した場所にいるNPCを検索。

---

### save(entity: GameEntity): Promise<GameEntity>

エンティティを保存（新規作成または更新）。

**保存先テーブル**:
- `m_entities`: 基本情報
- `m_entity_personas` / `t_entity_personas`: Personaデータ
- `m_entity_parameters` / `t_entity_parameters`: Parameterデータ
- `m_entity_states` / `t_entity_states`: Stateデータ

---

### updateParameter(entityId, category, key, value): Promise<void>

特定のパラメータを更新し、履歴テーブルに変更を記録。

| パラメータ | 型 | 説明 |
|:-----------|:---|:-----|
| entityId | string | エンティティID |
| category | ParameterCategory | カテゴリ（state/persona/parameter） |
| key | string | パラメータキー |
| value | ParameterValue<unknown> | 新しい値 |

**履歴記録先**:
- `h_entity_personas`
- `h_entity_parameters`
- `h_entity_states`

---

### delete(id: string): Promise<void>

エンティティを削除。CASCADE設定により関連データも削除される。

---

## テーブルマッピング

| カテゴリ | Master | Transaction | History |
|:---------|:-------|:------------|:--------|
| Base | m_entities | - | - |
| Persona | m_entity_personas | t_entity_personas | h_entity_personas |
| Parameter | m_entity_parameters | t_entity_parameters | h_entity_parameters |
| State | m_entity_states | t_entity_states | h_entity_states |

---

## 関連ドキュメント

- [GameEntity.md](../entities/GameEntity.md) - GameEntityエンティティ
- [UpdateAffectionUseCase.md](../usecases/UpdateAffectionUseCase.md) - パラメータ更新の使用例
- [Database_Specification.md](../Database_Specification.md) - M/T/Hテーブル構造

---

## 変更履歴

| 日付 | 変更内容 |
|:-----|:---------|
| 2026-01-14 | 初版作成 |
