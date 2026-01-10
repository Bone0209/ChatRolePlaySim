# LunaChatRPG

Nextron (Next.js + Electron) ベースのチャットRPGアプリケーション。

## セットアップ (Setup)

### 1. 依存パッケージのインストール
```bash
npm install
```

### 2. 環境変数の設定
`.env.sample` をコピーして `.env` を作成し、必要なAPIキーを設定してください。

```bash
cp .env.sample .env
```

**設定項目 (.env):**
- **MAIN_MODEL**: 高度な推論（チャット応答、ワールド詳細生成）に使用します（例: NanoGPT / GLM-4.7）。
- **SUB_MODEL**: 高速・軽量な処理（判定、単純なネーミング）に使用します（例: LM Studio）。
- **DATABASE_URL**: `file:./prisma/dev.db` （通常は変更不要）

### 3. データベースの初期化
初回起動時や、データベースをリセットしたい場合は以下のコマンドを実行してください。
これにより `dev.db` が作成され、テーブルが構築されます。

```bash
npm run db:reset
```

## 開発 (Development)

アプリケーションを開発モードで起動します。

```bash
npm run dev
```

## ビルド (Build)

プロダクション用のビルドを作成します。

```bash
npm run build
```

## 構成について

- **Frontend**: `renderer/` (Next.js)
- **Backend (Main Process)**: `main/` (Electron)
- **Database**: Prisma + SQLite (`prisma/dev.db`) - **Git管理外**です。各自で作成してください。
