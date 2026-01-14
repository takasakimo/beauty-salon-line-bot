# 新着予約通知システム デプロイ確認チェックリスト

## ✅ デプロイ完了
- Git push完了: `c9cdbad`
- 変更ファイル:
  - `app/admin/dashboard/page.tsx` - 新着予約通知UI追加
  - `app/admin/reservations/page.tsx` - 既読処理追加
  - `app/api/admin/statistics/route.ts` - 新着予約情報取得
  - `app/api/admin/reservations/route.ts` - 予約作成時のis_viewed設定
  - `app/api/admin/reservations/[id]/view/route.ts` - 既読更新API（新規）
  - `app/api/reservations/route.ts` - 顧客側予約作成時のis_viewed設定

## 📋 デプロイ後の確認手順

### 1. SQLエディタでマイグレーション実行
以下のSQLを実行してください（`scripts/migrate-reservations-is-viewed.sql`）:

```sql
-- 予約テーブルにis_viewedカラムを追加するマイグレーション
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'reservations' AND column_name = 'is_viewed'
    ) THEN
        ALTER TABLE reservations 
        ADD COLUMN is_viewed BOOLEAN DEFAULT false;
        
        CREATE INDEX idx_reservations_is_viewed ON reservations(tenant_id, is_viewed) 
        WHERE is_viewed = false;
        
        RAISE NOTICE 'is_viewedカラムとインデックスを追加しました';
    ELSE
        RAISE NOTICE 'is_viewedカラムは既に存在します';
    END IF;
END $$;
```

### 2. Vercelデプロイ状況確認
1. Vercelダッシュボードにアクセス
2. 最新のデプロイメントが成功しているか確認
3. エラーがないか確認

### 3. 動作確認

#### 3-1. ダッシュボードの新着予約通知
- [ ] 管理画面のダッシュボードにアクセス
- [ ] 未読予約がある場合、ピンク色の通知バナーが表示される
- [ ] 新着予約の一覧が表示される（顧客名、予約日時、メニュー名）
- [ ] 「すべての予約を見る」ボタンが機能する

#### 3-2. 予約詳細表示時の既読処理
- [ ] 新着予約をクリックして予約詳細ページに遷移
- [ ] 予約詳細モーダルを開く
- [ ] ダッシュボードに戻ると、その予約が新着予約から消えている

#### 3-3. 新規予約作成時の動作
- [ ] 新規予約を作成
- [ ] ダッシュボードに新着予約として表示される
- [ ] `is_viewed`が`false`で作成されている

### 4. エラー確認
以下のエラーが出ていないか確認:
- [ ] ブラウザのコンソールエラー
- [ ] Vercelのログエラー
- [ ] データベース接続エラー

## 🔧 トラブルシューティング

### 新着予約が表示されない場合
1. SQLマイグレーションが実行されているか確認
2. ブラウザのコンソールでエラーを確認
3. ネットワークタブでAPIリクエストが成功しているか確認

### 既読にならない場合
1. `/api/admin/reservations/[id]/view` エンドポイントが正しく動作しているか確認
2. ブラウザのネットワークタブでPOSTリクエストが成功しているか確認
3. データベースで`is_viewed`カラムが更新されているか確認

## 📝 注意事項
- 既存の予約は`is_viewed`が`NULL`または`false`として扱われます
- マイグレーション実行前の予約も新着予約として表示される可能性があります
- 必要に応じて既存予約を一括で既読にするSQLを実行できます:

```sql
-- 既存の予約をすべて既読にする（オプション）
UPDATE reservations SET is_viewed = true WHERE is_viewed IS NULL OR is_viewed = false;
```
