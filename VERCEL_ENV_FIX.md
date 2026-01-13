# Vercel環境変数の問題解決方法

## 問題
環境変数が正しく設定されているのに、データベース接続エラーが発生する。

## 確認手順

### 1. Vercelダッシュボードで環境変数を確認
1. https://vercel.com/dashboard にアクセス
2. プロジェクトを選択
3. Settings → Environment Variables
4. **Production環境**の`DATABASE_URL`と`POSTGRES_URL`を確認

### 2. 環境変数の値が正しいか確認
- `DATABASE_URL`または`POSTGRES_URL`は以下の形式である必要があります：
  - `postgresql://...` または `postgres://...`
  - ホスト名は `aws-1-ap-northeast-1.pooler.supabase.com` または `db.xxx.supabase.co`
  - `?sslmode=require` が含まれていること

### 3. 環境変数を再設定
もし古い値（`db.zimzroduelmakaahcpkz.supabase.co`）が設定されている場合：

1. `POSTGRES_URL`の値をコピー
2. `DATABASE_URL`を削除して再作成
3. `POSTGRES_URL`と同じ値を設定
4. **Production, Preview, Developmentすべて**に設定

### 4. 強制的に再デプロイ
環境変数を変更した後：

1. Deploymentsタブを開く
2. 最新のデプロイを選択
3. 「Redeploy」をクリック
4. または、GitHubに空のコミットをプッシュ：
   ```bash
   git commit --allow-empty -m "Force redeploy"
   git push origin main
   ```

### 5. Vercelのログで確認
デプロイ後、Logsタブで以下を確認：
- 「環境変数確認:」のログ
- 「データベース接続URL使用:」のログ
- ホスト名が正しいか確認

## トラブルシューティング

### エラー: `getaddrinfo ENOTFOUND db.zimzroduelmakaahcpkz.supabase.co`
→ 古い接続文字列が使われています。環境変数を更新して再デプロイしてください。

### エラー: `password authentication failed`
→ 接続文字列のパスワードが間違っています。Supabaseダッシュボードで正しいパスワードを確認してください。

### エラー: `SSL connection required`
→ 接続文字列に`?sslmode=require`が含まれているか確認してください。





