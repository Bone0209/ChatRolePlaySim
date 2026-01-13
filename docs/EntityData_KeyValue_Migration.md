# Entity Key-Value データ移行仕様書

> [!NOTE]
> 本ドキュメントは、現行のEntityデータ（Persona/Parameter/State）をJSON形式からKey-Value形式へ移行するための仕様を定義します。

---

## 1. 基本方針

1.  **物理テーブル分割**: `Persona`（性格・演出）、`Parameter`（能力値）、`State`（状態・現在値）は、それぞれ独立したテーブルで管理します。
2.  **Key-Value形式**: 従来のJSONカラムをやめ、1プロパティ＝1レコードのKey-Value形式（縦持ち）に移行します。
3.  **定義と値の分離**: 値（Value）はTransactionテーブル、そのデータの意味や表示設定（Meta）はMasterテーブルで管理します。
4.  **ハイブリッドMeta**: グローバル定義＋ワールド固有オーバーライドの二層構造を採用します。
5.  **定数管理**: `category`や`visibility`などの列挙値は`m_global_constants`で管理します。

---

## 2. 定数管理 (m_global_constants)

### 2.1 概要

システム全体で使用される定数値（列挙型相当）は、すべて `m_global_constants` テーブルで一元管理します。
コード内でのハードコーディングを避け、データベースで定数を管理することで、拡張性と保守性を確保します。

### 2.2 使用する定数カテゴリ

| category | 説明 | 値の例 |
| :--- | :--- | :--- |
| `attribute_category` | 属性のカテゴリ | `persona`, `parameter`, `state` |
| `value_type` | 値の型 | `string`, `number`, `boolean`, `json` |
| `visibility` | 公開範囲タイプ | `public`, `private`, `conditional` |

### 2.3 Seedデータ例

```typescript
// prisma/seed.ts - 定数の投入
const globalConstants = [
  // === 属性カテゴリ ===
  { category: 'attribute_category', keyName: 'persona', keyValue: 'persona' },
  { category: 'attribute_category', keyName: 'parameter', keyValue: 'parameter' },
  { category: 'attribute_category', keyName: 'state', keyValue: 'state' },
  
  // === 値の型 ===
  { category: 'value_type', keyName: 'string', keyValue: 'string' },
  { category: 'value_type', keyName: 'number', keyValue: 'number' },
  { category: 'value_type', keyName: 'boolean', keyValue: 'boolean' },
  { category: 'value_type', keyName: 'json', keyValue: 'json' },
  
  // === 公開範囲 ===
  { category: 'visibility', keyName: 'public', keyValue: '常時公開' },
  { category: 'visibility', keyName: 'private', keyValue: '常時非公開' },
  { category: 'visibility', keyName: 'affection_threshold', keyValue: '好感度条件' },
  { category: 'visibility', keyName: 'event_unlocked', keyValue: 'イベント解放' },
  { category: 'visibility', keyName: 'skill_required', keyValue: 'スキル必要' },
];

for (const constant of globalConstants) {
  await prisma.mGlobalConstant.upsert({
    where: { keyName: constant.keyName },
    update: constant,
    create: constant
  });
}
```

---

## 3. ハイブリッドMetaテーブル設計

### 3.1 設計思想

「好感度」「HP」などの基本パラメータはシステム共通で定義し、ワールド固有のパラメータ（例: 「正気度」「瘴気耐性」）やワールドごとの表示名カスタマイズを可能にします。

```
┌─────────────────────────────────────────────────────────────┐
│  MAttributeDefinition テーブル                              │
├─────────────────────────────────────────────────────────────┤
│ worldId = NULL (グローバル定義)                             │
│   ├── maxHp      → 表示名: "最大体力"                       │
│   ├── affection  → 表示名: "好感度"                         │
│   └── location   → 表示名: "現在地"                         │
├─────────────────────────────────────────────────────────────┤
│ worldId = "world-dark-fantasy" (ワールド固有)               │
│   ├── maxHp      → 表示名: "生命力" (グローバルを上書き)    │
│   └── sanity     → 表示名: "正気度" (このワールド専用)      │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Prismaモデル定義

```prisma
model MAttributeDefinition {
  id              Int      @id @default(autoincrement())
  worldId         String?  @map("world_id")  // NULLならグローバル定義
  keyName         String   @map("key_name")
  category        String                     // m_global_constants.attribute_category を参照
  displayName     String   @map("display_name")
  valueType       String   @map("value_type") // m_global_constants.value_type を参照
  description     String?
  displayOrder    Int      @default(0) @map("display_order")
  
  // === 公開範囲（条件付き対応） ===
  visibility      String   @default("public") // m_global_constants.visibility を参照
  visibilityParam String?  @map("visibility_param") // 条件パラメータ（JSON）
  
  // === 拡張用メタデータ ===
  metadata        Json?    // 将来の拡張用（icon, color, animation等）
  
  createdAt       DateTime @default(now()) @map("created_at")
  world           MWorld?  @relation(fields: [worldId], references: [id], onDelete: Cascade)

  @@unique([worldId, keyName])
  @@map("m_attribute_definitions")
}
```

---

## 4. 公開範囲（Visibility）の条件付き制御

### 4.1 公開範囲タイプ

| visibility | visibilityParam | 意味 |
| :--- | :--- | :--- |
| `public` | null | 常時公開 |
| `private` | null | 常時非公開（AI専用） |
| `affection_threshold` | `{"min": 50}` | 好感度が指定値以上で公開 |
| `event_unlocked` | `{"eventId": "secret_revealed"}` | イベントフラグで公開 |
| `skill_required` | `{"skill": "observation"}` | スキル所持で公開 |

### 4.2 公開判定ロジック

```typescript
interface PlayerContext {
  affection: number;
  unlockedEvents: string[];
  skills: string[];
}

function isAttributeVisible(
  definition: AttributeDefinition,
  playerContext: PlayerContext
): boolean {
  switch (definition.visibility) {
    case 'public':
      return true;
    case 'private':
      return false;
    case 'affection_threshold':
      const affParam = JSON.parse(definition.visibilityParam ?? '{}');
      return playerContext.affection >= (affParam.min ?? 0);
    case 'event_unlocked':
      const eventParam = JSON.parse(definition.visibilityParam ?? '{}');
      return playerContext.unlockedEvents.includes(eventParam.eventId);
    case 'skill_required':
      const skillParam = JSON.parse(definition.visibilityParam ?? '{}');
      return playerContext.skills.includes(skillParam.skill);
    default:
      return false;
  }
}
```

---

## 5. メタデータ拡張設計

### 5.1 拡張方針

| 項目の性質 | 格納場所 | 理由 |
| :--- | :--- | :--- |
| **必須・頻繁に検索** | 固定カラム | 型安全、インデックス可能 |
| **任意・ワールド依存** | `metadata` JSON | マイグレーション不要で柔軟 |

### 5.2 metadataカラムの使用例

```json
{
  "iconName": "heart",
  "colorCode": "#FF6B6B",
  "animationOnChange": "pulse",
  "tooltipTemplate": "現在の{displayName}は{value}です",
  "minValue": 0,
  "maxValue": 1000
}
```

### 5.3 新しいメタ情報を追加するとき

1. **頻繁に使う・全ワールド共通** → カラム追加（`prisma migrate`）
2. **一部ワールド・実験的** → `metadata` JSONに追加

```typescript
// metadata への追加例
await prisma.mAttributeDefinition.update({
  where: { worldId_keyName: { worldId: 'world-123', keyName: 'sanity' } },
  data: {
    metadata: {
      iconName: 'brain',
      colorCode: '#9B59B6',
      warningThreshold: 20  // 20以下で警告表示
    }
  }
});
```

---

## 6. 定義の解決ロジック（フォールバック）

データ取得時、以下の優先順位で定義を解決します：

```typescript
/**
 * 属性定義を取得する（ワールド固有 → グローバルの順でフォールバック）
 */
async function getAttributeDefinition(
  keyName: string, 
  worldId: string
): Promise<AttributeDefinition | null> {
  // 1. まずワールド固有の定義を探す
  let definition = await prisma.mAttributeDefinition.findUnique({
    where: { worldId_keyName: { worldId, keyName } }
  });
  
  // 2. なければグローバル定義にフォールバック
  if (!definition) {
    definition = await prisma.mAttributeDefinition.findUnique({
      where: { worldId_keyName: { worldId: null, keyName } }
    });
  }
  
  return definition;
}
```

---

## 7. Metaテーブル運用ガイド

### 7.1 グローバル定義の追加（システム起動時/Seed）

システム共通のパラメータは `prisma/seed.ts` で投入します。

```typescript
const globalDefinitions = [
  // --- Parameter ---
  { keyName: 'maxHp', category: 'parameter', displayName: '最大体力', valueType: 'number', visibility: 'public', displayOrder: 1 },
  { keyName: 'maxMp', category: 'parameter', displayName: '最大魔力', valueType: 'number', visibility: 'public', displayOrder: 2 },
  
  // --- State ---
  { keyName: 'affection', category: 'state', displayName: '好感度', valueType: 'number', visibility: 'private', displayOrder: 50 },
  { keyName: 'location', category: 'state', displayName: '現在地', valueType: 'string', visibility: 'public', displayOrder: 100 },
  
  // --- Persona ---
  { keyName: 'personality', category: 'persona', displayName: '性格', valueType: 'string', visibility: 'private' },
  { keyName: 'secretTrait', category: 'persona', displayName: '隠された特性', valueType: 'string', 
    visibility: 'affection_threshold', visibilityParam: '{"min": 80}' },
];

async function seedGlobalDefinitions() {
  for (const def of globalDefinitions) {
    await prisma.mAttributeDefinition.upsert({
      where: { worldId_keyName: { worldId: null, keyName: def.keyName } },
      update: def,
      create: { ...def, worldId: null }
    });
  }
}
```

### 7.2 ワールド固有定義の追加

```typescript
// ワールド生成時に独自パラメータを追加
await prisma.mAttributeDefinition.create({
  data: {
    worldId: worldId,
    keyName: 'sanity',
    category: 'state',
    displayName: '正気度',
    valueType: 'number',
    visibility: 'public',
    description: '精神の安定度。0になると発狂する。',
    displayOrder: 51,
    metadata: { iconName: 'brain', colorCode: '#9B59B6' }
  }
});
```

---

## 8. カテゴリ別データテーブル (Transaction Tables)

> [!IMPORTANT]
> T_テーブルからMetaテーブルへのリレーションは、**keyNameのみ**で参照します。
> フォールバックロジックはアプリケーション層で処理するため、Prismaの直接リレーションは使用しません。

### 8.1 Persona / Parameter / State

```prisma
model TEntityPersona {
  id          Int      @id @default(autoincrement())
  entityId    String   @map("entity_id")
  keyName     String   @map("key_name")
  keyValue    String   @map("key_value")
  updatedAt   DateTime @updatedAt @map("updated_at")

  entity      MEntity  @relation(fields: [entityId], references: [id], onDelete: Cascade)

  @@unique([entityId, keyName])
  @@map("t_entity_personas")
}

// TEntityParameter, TEntityState も同様の構造
```

---

## 9. 履歴テーブル構造 (History)

```prisma
model HEntityState {
  id          Int      @id @default(autoincrement())
  entityId    String   @map("entity_id")
  keyName     String   @map("key_name")
  oldValue    String?  @map("old_value")
  newValue    String?  @map("new_value")
  changeType  String   @map("change_type") // 'update', 'create', 'delete'
  createdAt   DateTime @default(now()) @map("created_at")

  entity      MEntity  @relation(fields: [entityId], references: [id], onDelete: Cascade)

  @@map("h_entity_states")
}
```

---

## 10. Entityモデルのリレーション変更

```prisma
model MEntity {
  id       String @id @default(uuid())
  worldId  String @map("world_id")

  world      MWorld @relation(fields: [worldId], references: [id], onDelete: Cascade)

  personas   TEntityPersona[]
  parameters TEntityParameter[]
  states     TEntityState[]

  historyPersonas   HEntityPersona[]
  historyParameters HEntityParameter[]
  historyStates     HEntityState[]
  
  @@map("m_entities")
}
```

---

## 11. 移行手順

1. **定数投入**: `m_global_constants` にカテゴリ・公開範囲タイプを投入
2. **Schema更新**: 新テーブル定義を `schema.prisma` に追加
3. **Setup**: `prisma db push` でDB構造を反映
4. **Seed**: グローバル `MAttributeDefinition` を投入
5. **Migration**: 既存JSONデータを各 `T_` テーブルへ展開
6. **Switch**: アプリケーションの参照先を切り替え
7. **Cleanup**: 旧テーブル削除

---

## 12. チェックリスト

- [ ] 定数管理（m_global_constants）への投入内容
- [ ] ハイブリッドMeta（グローバル+ワールド固有）の方針
- [ ] 公開範囲（visibility）の条件タイプ一覧
- [ ] グローバル定義に含めるべき基本パラメータ一覧
- [ ] metadata拡張フィールドの初期内容
