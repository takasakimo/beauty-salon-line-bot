# beauty-salon-01の管理者情報更新手順

## 更新内容
- **テナントコード**: beauty-salon-01
- **ユーザー名**: info@aims-ngy.com
- **パスワード**: Demo1234
- **メールアドレス**: info@aims-ngy.com

## 更新方法

### 方法1: SQLスクリプトを実行（推奨）

1. Supabaseダッシュボードにアクセス
2. SQL Editorを開く
3. `scripts/update-admin-beauty-salon-01.sql` の内容をコピーして実行

### 方法2: APIエンドポイントを使用

以下のコマンドで管理者情報を更新できます：

```bash
curl -X POST https://your-vercel-app.vercel.app/api/admin/reset-admin-password \
  -H "Content-Type: application/json" \
  -d '{
    "tenantCode": "beauty-salon-01",
    "username": "info@aims-ngy.com",
    "password": "Demo1234",
    "email": "info@aims-ngy.com",
    "secretKey": "YOUR_ADMIN_RESET_SECRET_KEY"
  }'
```

**注意**: `ADMIN_RESET_SECRET_KEY`環境変数がVercelに設定されている必要があります。

### 方法3: ローカルスクリプトを実行

環境変数が設定されている場合：

```bash
# Vercelの環境変数を取得
vercel env pull .env.local --environment=production

# スクリプトを実行
node scripts/update-admin.js beauty-salon-01 info@aims-ngy.com Demo1234
```

## 確認方法

更新後、以下の情報でログインできることを確認してください：
- テナントコード: `beauty-salon-01`
- ユーザー名: `info@aims-ngy.com`
- パスワード: `Demo1234`

## デプロイ状況

- ✅ SQLスクリプトを作成済み
- ✅ GitHubにプッシュ済み
- ⏳ Vercelで自動デプロイ中（数分かかります）
