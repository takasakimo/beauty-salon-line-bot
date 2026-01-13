# データベースマイグレーションガイド

## 顧客テーブルにパスワードフィールドを追加

このマイグレーションは、顧客テーブルに`password_hash`カラムを追加します。

### 実行方法

#### 1. ローカル環境で実行する場合

```bash
# .envファイルにDATABASE_URLが設定されている場合
npm run db:migrate-password

# 環境変数として直接指定する場合
DATABASE_URL="postgresql://user:password@host:port/database" npm run db:migrate-password
```

#### 2. 本番環境（Vercel）で実行する場合

```bash
# Vercel環境変数を取得
vercel env pull .env.local

# マイグレーション実行
npm run db:migrate-password
```

#### 3. 本番環境（Heroku）で実行する場合

```bash
# Herokuで直接実行
heroku run npm run db:migrate-password

# または、ローカルでHerokuのDATABASE_URLを使用
heroku config:get DATABASE_URL
# 上記で取得したURLを使用して実行
DATABASE_URL="取得したURL" npm run db:migrate-password
```

### 実行されるSQL

```sql
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
```

### 注意事項

- このマイグレーションは冪等性があります（何度実行しても安全です）
- 既存の顧客レコードの`password_hash`は`NULL`になります
- 既存顧客は次回ログイン時にパスワードを設定する必要があります

### トラブルシューティング

#### 接続エラーが発生する場合

1. `DATABASE_URL`が正しく設定されているか確認
2. データベースサーバーが起動しているか確認
3. ファイアウォール設定を確認
4. SSL接続が必要な場合は、接続文字列にSSLパラメータが含まれているか確認

#### カラムが既に存在する場合

エラーは発生せず、スキップされます。これは正常な動作です。





