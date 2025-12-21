# 本番環境デプロイガイド

## 前提条件

- Node.js 18以上
- PostgreSQLデータベース（本番環境用）
- VercelまたはHerokuアカウント

## デプロイ前の準備

### 1. データベースの準備

```bash
# 本番環境のデータベースURLを取得
# 例: postgresql://user:password@host:port/database

# マイグレーションの実行（本番環境のデータベースに対して）
DATABASE_URL=your_production_database_url npm run db:init
DATABASE_URL=your_production_database_url npm run db:migrate
DATABASE_URL=your_production_database_url npm run db:migrate-customers
```

### 2. 環境変数の設定

本番環境で必要な環境変数：

```env
DATABASE_URL=postgresql://user:password@host:port/database
NODE_ENV=production
```

## Vercelへのデプロイ

### 1. Vercel CLIを使用する場合

```bash
# Vercel CLIのインストール
npm i -g vercel

# ログイン
vercel login

# デプロイ
vercel --prod
```

### 2. Vercelダッシュボードを使用する場合

1. [Vercel](https://vercel.com)にログイン
2. 「New Project」をクリック
3. GitHubリポジトリをインポート
4. 環境変数を設定：
   - `DATABASE_URL`: 本番データベースURL
   - `NODE_ENV`: `production`
5. 「Deploy」をクリック

### 3. 環境変数の設定

Vercelダッシュボードで：
1. プロジェクト設定 → Environment Variables
2. 以下の変数を追加：
   - `DATABASE_URL` (Production, Preview, Development)
   - `NODE_ENV` (Productionのみ)

## Herokuへのデプロイ

### 1. Heroku CLIのインストール

```bash
# Heroku CLIのインストール（macOS）
brew tap heroku/brew && brew install heroku

# ログイン
heroku login
```

### 2. アプリケーションの作成

```bash
# Herokuアプリの作成
heroku create your-app-name

# PostgreSQLアドオンの追加
heroku addons:create heroku-postgresql:essential-0

# 環境変数の確認
heroku config:get DATABASE_URL
```

### 3. デプロイ

```bash
# Gitリポジトリの初期化（まだの場合）
git init
git add .
git commit -m "Initial commit"

# Herokuリモートの追加
heroku git:remote -a your-app-name

# デプロイ
git push heroku main
```

### 4. データベースマイグレーション

```bash
# Heroku上でマイグレーションを実行
heroku run npm run db:init
heroku run npm run db:migrate
heroku run npm run db:migrate-customers
```

### 5. アプリケーションの確認

```bash
# ログの確認
heroku logs --tail

# アプリケーションの起動確認
heroku open
```

## デプロイ後の確認

### 1. ヘルスチェック

```bash
# ヘルスチェックエンドポイント
curl https://your-app-url.vercel.app/api/health

# 初期化チェック
curl https://your-app-url.vercel.app/api/init
```

### 2. 機能テスト

- [ ] ホームページが表示される
- [ ] 予約ページが動作する
- [ ] 管理画面にログインできる
- [ ] データベース接続が正常

## トラブルシューティング

### データベース接続エラー

```bash
# 接続文字列の確認
echo $DATABASE_URL

# データベースへの直接接続テスト
psql $DATABASE_URL
```

### ビルドエラー

```bash
# ローカルでビルドテスト
npm run build

# エラーの詳細確認
npm run build -- --debug
```

### パフォーマンス問題

- データベース接続プールの設定を確認
- Vercelの関数タイムアウト設定を確認（最大30秒）
- 不要な依存関係を削除

## 本番環境のベストプラクティス

1. **セキュリティ**
   - 環境変数は絶対にコミットしない
   - HTTPSを強制（Vercel/Herokuで自動）
   - セキュリティヘッダーを設定（middleware.ts）

2. **パフォーマンス**
   - データベース接続プールを使用
   - 不要なログを本番環境で無効化
   - 画像最適化を有効化

3. **監視**
   - エラーログの監視
   - データベース接続の監視
   - レスポンスタイムの監視

4. **バックアップ**
   - データベースの定期バックアップ
   - 環境変数のバックアップ

## ロールバック

### Vercel

```bash
# 以前のデプロイにロールバック
vercel rollback
```

### Heroku

```bash
# 以前のリリースにロールバック
heroku rollback v123
```

## サポート

問題が発生した場合：
1. ログを確認
2. 環境変数を確認
3. データベース接続を確認
4. GitHub Issuesで報告

