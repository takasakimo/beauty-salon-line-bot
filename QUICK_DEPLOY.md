# クイックデプロイガイド

## ✅ 準備完了

- ✅ ビルド成功
- ✅ Gitコミット完了
- ✅ Vercel CLIインストール済み

## デプロイ手順

### ステップ1: Vercelにログイン

```bash
vercel login
```

ブラウザが開き、Vercelアカウントでログインしてください。

### ステップ2: プロジェクトをリンク

```bash
vercel link
```

以下の質問に答えてください：
- Set up and deploy? **Yes**
- Which scope? **あなたのアカウントを選択**
- Link to existing project? **No** (新規プロジェクト)
- Project name? **beauty-salon-line-bot** (または任意の名前)
- Directory? **./** (現在のディレクトリ)

### ステップ3: 環境変数を設定

```bash
# データベースURLを設定（本番環境のURLに置き換えてください）
vercel env add DATABASE_URL production
# プロンプトで本番データベースURLを入力

# 環境変数を設定
vercel env add NODE_ENV production
# プロンプトで "production" と入力
```

### ステップ4: デプロイ

```bash
vercel --prod
```

### ステップ5: データベースマイグレーション

デプロイ後、本番環境のデータベースに対してマイグレーションを実行：

```bash
# 本番環境のデータベースURLを設定
export DATABASE_URL=your_production_database_url

# マイグレーション実行
npm run db:init
npm run db:migrate
npm run db:migrate-customers
```

## デプロイ後の確認

デプロイが完了すると、URLが表示されます。以下のエンドポイントで動作確認：

1. **ヘルスチェック**: `https://your-app.vercel.app/api/health`
2. **初期化チェック**: `https://your-app.vercel.app/api/init`
3. **ホームページ**: `https://your-app.vercel.app/`

## トラブルシューティング

### 認証エラー
```bash
vercel logout
vercel login
```

### ビルドエラー
- 環境変数が正しく設定されているか確認
- Vercelダッシュボードの「Settings」→「Environment Variables」で確認

### データベース接続エラー
- `DATABASE_URL`が正しく設定されているか確認
- データベースが外部接続を許可しているか確認（VercelのIPアドレス）

## 次のステップ

デプロイが完了したら：
1. カスタムドメインの設定（オプション）
2. 監視とログの設定
3. パフォーマンス最適化





