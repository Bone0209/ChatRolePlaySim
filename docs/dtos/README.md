# DTO (Data Transfer Objects) 仕様書

## 概要

レイヤー間のデータ転送に使用するオブジェクト定義。
特にIPC層やUI層へのデータ受け渡しに使用される。

---

## ファイル一覧

| ファイル | 説明 |
|:---------|:-----|
| `GameStateDto.ts` | ゲーム状態 |
| `WorldDto.ts` | ワールド情報 |
| `ChatDto.ts` | チャット関連 |

---

## GameStateDto.ts

### GameStateDto

```typescript
interface GameStateDto {
    totalSteps: number;      // 累計ステップ数
    day: number;             // 経過日数
    timeOfDay: string;       // 時間帯
    currentStep: number;     // 日内ステップ
    locationName: string;    // 現在地名
    locationId: string;      // 現在地ID
    npcs: NpcInfoDto[];      // 周囲のNPC
    playerStatus: PlayerStatusDto;
}
```

### NpcInfoDto

```typescript
interface NpcInfoDto {
    id: string;
    name: string;
    role: string;
}
```

### PlayerStatusDto

```typescript
interface PlayerStatusDto {
    name: string;
    level: number;
    job: string;
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    condition: string;
}
```

### createDefaultGameState()

デフォルトのゲーム状態を生成するファクトリ関数。

---

## WorldDto.ts

### WorldDto

```typescript
interface WorldDto {
    id: string;
    name: string;
    prompt: string;
    createdAt: string;  // ISO 8601
}
```

### CreateWorldRequestDto

```typescript
interface CreateWorldRequestDto {
    id: string;
    name: string;
    prompt: string;
    entities: CreateEntityRequestDto[];
}
```

### CreateEntityRequestDto

```typescript
interface CreateEntityRequestDto {
    id: string;
    type: 'ENTITY_PLAYER' | 'ENTITY_NPC';
    name: string;
    description?: string;
    environment: Record<string, any>;
}
```

---

## ChatDto.ts

### SendMessageRequestDto

```typescript
interface SendMessageRequestDto {
    worldId: string;
    targetEntityId: string;
    message: string;
    history: ChatHistoryItemDto[];
}
```

### ChatHistoryItemDto

```typescript
interface ChatHistoryItemDto {
    role: 'user' | 'assistant' | 'system';
    content: string;
    speakerName: string;
    entityId?: string;
}
```

### SendMessageResponseDto

```typescript
interface SendMessageResponseDto {
    reply: string;
    emotion?: string;
    entityId: string;
    entityName: string;
}
```

### EntityDetailDto

```typescript
interface EntityDetailDto {
    id: string;
    name: string;
    type: string;
    description: string;
    environment: Record<string, { val: unknown; vis: string }>;
}
```

---

## ディレクトリ構造

```
main/application/dtos/
├── ChatDto.ts
├── GameStateDto.ts
├── WorldDto.ts
└── index.ts
```

---

## 変更履歴

| 日付 | 変更内容 |
|:-----|:---------|
| 2026-01-14 | 初版作成 |
