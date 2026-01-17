# らくっぽリザーブ - Next.js版

個人サロン向けの予約管理システム（Webアプリ版）

## 概要

このプロジェクトは、Express.js + LIFFアプリからNext.jsベースのWebアプリケーションに移行したバージョンです。

### 主な変更点

- ✅ Next.js 14（App Router）を使用
- ✅ TypeScript対応
- ✅ Tailwind CSSでスタイリング
- ✅ LIFF連携を削除し、Webブラウザで完結
- ✅ マルチテナント対応（複数店舗対応）
- ✅ 管理画面と顧客向け画面を統合

## 技術スタック

- **フロントエンド**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes
- **データベース**: PostgreSQL
- **認証**: セッション管理（Cookieベース）

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local`ファイルを作成し、以下の変数を設定してください：

```env
DATABASE_URL=postgresql://user:password@host:port/database
```

### 3. データベースの初期化

```bash
# テーブル作成
npm run db:init

# マルチテナント対応のマイグレーション
npm run db:migrate

# customersテーブルのマイグレーション（Webアプリ用）
npm run db:migrate-customers
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## プロジェクト構造

```
beauty-salon-line-bot/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── admin/         # 管理画面用API
│   │   ├── customers/     # 顧客API
│   │   ├── menus/         # メニューAPI
│   │   ├── reservations/  # 予約API
│   │   └── staff/         # スタッフAPI
│   ├── admin/             # 管理画面
│   │   ├── login/         # ログイン画面
│   │   └── dashboard/     # ダッシュボード
│   ├── reservation/       # 予約ページ
│   ├── mypage/            # マイページ
│   ├── layout.tsx          # ルートレイアウト
│   └── page.tsx           # ホームページ
├── lib/                    # ユーティリティ
│   ├── db.ts              # データベース接続
│   └── auth.ts            # 認証機能
├── scripts/                # スクリプト
│   ├── init-db.js          # DB初期化
│   ├── add-tenant-support.js  # テナント対応
│   └── migrate-customers-table.js  # customersテーブルマイグレーション
└── package.json
```

## 主な機能

### 顧客向け機能

- 予約作成（メニュー選択 → スタッフ選択 → 日時選択 → 確認）
- マイページ（予約履歴の確認）
- 顧客情報検索（メールアドレスまたは電話番号）

### 管理画面機能

- ダッシュボード（統計情報の表示）
- 予約管理
- 顧客管理
- メニュー管理
- スタッフ管理

## API エンドポイント

### 顧客向けAPI

- `POST /api/customers/register` - 顧客登録
- `POST /api/customers/check` - 顧客情報確認
- `GET /api/menus` - メニュー一覧取得
- `GET /api/staff` - スタッフ一覧取得
- `POST /api/reservations` - 予約作成
- `GET /api/reservations/current` - 現在の予約取得
- `GET /api/reservations/history` - 予約履歴取得
- `GET /api/reservations/available-slots` - 空き時間取得

### 管理画面API

- `POST /api/admin/login` - 管理者ログイン
- `POST /api/admin/logout` - ログアウト
- `GET /api/admin/statistics` - 統計データ取得

## マルチテナント対応

このシステムは複数の美容院（テナント）に対応しています。

- 各テナントは`tenant_code`で識別されます
- デフォルトのテナントコード: `beauty-salon-001`
- URLパラメータまたはヘッダーでテナントを指定できます

## デプロイ

詳細なデプロイ手順は [DEPLOY.md](./DEPLOY.md) を参照してください。

### クイックスタート（Vercel）

1. Vercelアカウントを作成
2. GitHubリポジトリをインポート
3. 環境変数を設定：
   - `DATABASE_URL`: 本番データベースURL
   - `NODE_ENV`: `production`
4. デプロイ

### クイックスタート（Heroku）

```bash
heroku create your-app-name
heroku addons:create heroku-postgresql:essential-0
git push heroku main
heroku run npm run db:init
heroku run npm run db:migrate
heroku run npm run db:migrate-customers
```

## 本番環境の設定

### 実装済みの機能

- ✅ データベース接続プール（pg.Pool使用）
- ✅ 環境変数の検証
- ✅ エラーハンドリングの強化
- ✅ セキュリティヘッダー（middleware.ts）
- ✅ 本番環境用のログ設定
- ✅ Vercel/Herokuデプロイ設定

### 本番環境での注意事項

1. **セッション管理**: 現在はメモリベースのセッション管理を使用しています。本番環境でスケールする場合は、Redisなどの外部ストレージの使用を推奨します。

2. **データベース接続**: 接続プールの設定は`lib/db.ts`で調整可能です。本番環境の負荷に応じて調整してください。

3. **環境変数**: 必ず本番環境で`DATABASE_URL`と`NODE_ENV=production`を設定してください。

4. **セキュリティ**: 
   - HTTPSの強制（Vercel/Herokuで自動）
   - セキュリティヘッダー（middleware.tsで設定済み）
   - 環境変数の保護

5. **監視**: 
   - `/api/health` エンドポイントでヘルスチェック
   - `/api/init` エンドポイントで初期化確認

## ライセンス

ISC

