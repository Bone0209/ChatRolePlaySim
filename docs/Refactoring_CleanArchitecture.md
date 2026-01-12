# Refactoring Plan: Clean Architecture & DDD

本ドキュメントは、現在のコードベースをクリーンアーキテクチャおよびドメイン駆動設計（DDD）に基づいた構成へリファクタリングするための計画書です。

## 1. 目的

- **関心の分離**: ビジネスロジック、データアクセス、UI/IPC層を明確に分離する。
- **保守性の向上**: 各コンポーネントの役割を明確にし、変更の影響範囲を限定する。
- **テスト容易性**: 依存関係逆転の原則（DIP）を用い、ビジネスロジックを単体テスト可能にする。

## 2. アーキテクチャ構成 (Directory Structure)

`main/` ディレクトリ配下を以下の層に再構成します。

```text
main/
├── domain/                     # ドメイン層 (Entities, Value Objects, Repository Interfaces)
│   ├── entities/               # ドメインエンティティ
│   │   ├── World.ts
│   │   ├── GameEntity.ts
│   │   └── ChatMessage.ts
│   ├── value-objects/          # 値オブジェクト (不変)
│   │   ├── Visibility.ts
│   │   └── ParameterValue.ts
│   ├── repositories/           # リポジトリインターフェース
│   │   ├── IWorldRepository.ts
│   │   ├── IEntityRepository.ts
│   │   └── IChatRepository.ts
│   └── index.ts
│
├── application/                # アプリケーション層 (Use Cases, DTOs)
│   ├── dtos/                   # データ転送オブジェクト
│   │   ├── GameStateDto.ts
│   │   ├── WorldDto.ts
│   │   └── ChatDto.ts
│   ├── usecases/
│   │   ├── game/
│   │   │   ├── GetGameStateUseCase.ts
│   │   │   ├── ProcessActionUseCase.ts
│   │   │   └── UpdateAffectionUseCase.ts
│   │   └── world/
│   │       ├── CreateWorldUseCase.ts
│   │       └── GetWorldsUseCase.ts
│   └── index.ts
│
├── infrastructure/             # インフラストラクチャ層
│   ├── config/                 # 設定管理
│   │   └── config.ts
│   ├── database/               # データベース接続
│   │   └── prisma.ts
│   ├── gateways/               # 外部APIゲートウェイ
│   │   └── LlmGateway.ts
│   ├── logging/                # ロギング
│   │   └── logger.ts
│   ├── prompts/                # プロンプトテンプレート
│   │   └── PromptTemplate.ts
│   ├── repositories/           # リポジトリ実装 (Prisma依存)
│   │   ├── PrismaWorldRepository.ts
│   │   ├── PrismaEntityRepository.ts
│   │   └── PrismaChatRepository.ts
│   ├── utils/                  # 共通ユーティリティ
│   │   └── uuid.ts
│   └── index.ts
│
├── interface-adapters/         # インターフェースアダプター層
│   └── ipc/                    # IPC Handlers (Controller相当)
│       ├── WorldHandler.ts
│       └── GameHandler.ts
│
├── ipc/                        # (レガシー: 段階的に移行)
│   ├── worlds.ts
│   └── game.ts
│
├── prompts/                    # プロンプトテンプレートファイル (*.md)
│
└── background.ts               # Electronメインプロセスエントリポイント
```

## 3. レイヤー定義と役割

### 3.1 Domain Layer (最内層)
他の層に依存しない、純粋なビジネスルールとドメインロジックを記述します。
- **Entities**: 一意の識別子を持ち、ライフサイクルを持つオブジェクト（例: `GameEntity`, `World`）。
- **Value Objects**: 属性によって定義される不変オブジェクト（例: `ParameterValue`, `Visibility`）。
- **Repository Interfaces**: データの保存・復元を行うための抽象定義。

### 3.2 Application Layer
ドメインオブジェクトを調整し、ユースケース（ユーザーがやりたいこと）を実現します。
- **Use Cases**: 「ワールドを作成する」「アクションを実行する」といった具体的な処理の流れ。
- **DTOs**: UIやIPC層との入出力データ形式を定義。
- Repository Interface をコンストラクタインジェクションで受け取り、実装には依存しません。

### 3.3 Infrastructure Layer
技術的詳細（DB、外部API、設定、ログ）を扱います。
- **config/**: 環境変数・設定ファイルの読み込み。
- **database/**: Prismaクライアントインスタンス。
- **repositories/**: Prisma を使用したリポジトリ実装。
- **gateways/**: LLM APIなど外部サービスへの接続。
- **logging/**: ログ出力機能。
- **prompts/**: プロンプトテンプレート処理。
- **utils/**: UUID生成などの汎用ユーティリティ。

### 3.4 Interface Adapters Layer
外界からの入力をアプリケーション層へ渡します。
- **IPC Handlers**: ElectronのIPCイベントを受け取り、適切なUseCaseを実行し、結果を返します。

## 4. ViewModelについて

本アーキテクチャでは **ViewModel は不要** と判断しました。

**理由:**
1. **DTOが直接UI消費可能**: Application層のDTOはUIで使用しやすい形式で設計済み。
2. **IPC Handlersが変換を担当**: 必要なデータ変換はIPC Handler層で行える。
3. **React側の責務**: 表示ロジックはReactコンポーネント内で処理可能。
4. **複雑性回避**: 小〜中規模アプリにViewModelを導入すると過剰設計になる可能性。

> [!NOTE]
> 将来的にUI表示用の複雑な変換ロジックが増えた場合は、`interface-adapters/presenters/` を追加することを検討してください。

## 5. ルール (Rules to Observe)

- **依存の方向**: 外側の層から内側の層へのみ依存してよい（Domainは他に依存しない）。
- **Prisma依存の排除**: Domain層やApplication層で `prisma` クライアントを直接インポートしないこと。
- **DI (Dependency Injection)**: Use Case はリポジトリの実装クラスではなく、インターフェースに依存させる。実体は Handler 層等で注入する。

## 6. 移行状況

| ステップ | 状況 |
|---------|------|
| Domain Layer 定義 | ✅ 完了 |
| Repository Interface 定義 | ✅ 完了 |
| Infrastructure Layer 実装 | ✅ 完了 |
| Application Layer (Use Cases) 実装 | ✅ 完了 |
| Interface Adapters (IPC Handlers) 作成 | ✅ 完了 |
| 既存 `main/ipc/` の移行・削除 | 🔄 進行中 |
| `background.ts` のリファクタリング | 🔄 進行中 |

---
このドキュメントに基づき、段階的なリファクタリングを実施します。
