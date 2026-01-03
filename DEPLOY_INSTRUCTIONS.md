# デプロイ手順

## ビルド完了 ✅

プロジェクトのビルドが正常に完了しました。

## Vercelへのデプロイ

### 方法1: Vercel CLIを使用（推奨）

```bash
# Vercelにログイン（初回のみ）
vercel login

# プロジェクトをデプロイ
vercel --prod

# 環境変数を設定（デプロイ後）
vercel env add DATABASE_URL production
# 本番環境のデータベースURLを入力

vercel env add NODE_ENV production
# production と入力
```

### 方法2: Vercelダッシュボードを使用

1. [Vercel](https://vercel.com)にアクセスしてログイン
2. 「New Project」をクリック
3. GitHubリポジトリをインポート（または手動でアップロード）
4. プロジェクト設定：
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. 環境変数を設定：
   - `DATABASE_URL`: 本番データベースURL
   - `NODE_ENV`: `production`
6. 「Deploy」をクリック

## デプロイ後の確認

1. ヘルスチェック: `https://your-app.vercel.app/api/health`
2. 初期化チェック: `https://your-app.vercel.app/api/init`
3. ホームページ: `https://your-app.vercel.app/`

## データベースマイグレーション

デプロイ後、本番環境のデータベースに対してマイグレーションを実行：

```bash
# 環境変数を設定
export DATABASE_URL=your_production_database_url

# マイグレーション実行
npm run db:init
npm run db:migrate
npm run db:migrate-customers
```

## トラブルシューティング

### ビルドエラー
- 環境変数が正しく設定されているか確認
- ローカルで `npm run build` が成功するか確認

### データベース接続エラー
- `DATABASE_URL` が正しく設定されているか確認
- データベースが外部接続を許可しているか確認

### パフォーマンス問題
- Vercelの関数タイムアウト設定を確認（最大30秒）
- データベース接続プールの設定を確認



