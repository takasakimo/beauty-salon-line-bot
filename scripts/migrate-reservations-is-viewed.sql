-- 予約テーブルにis_viewedカラムを追加するマイグレーション
-- SQLエディタで実行してください

-- カラムが存在しない場合のみ追加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'reservations' AND column_name = 'is_viewed'
    ) THEN
        ALTER TABLE reservations 
        ADD COLUMN is_viewed BOOLEAN DEFAULT false;
        
        -- インデックスを作成（未読予約の検索を高速化）
        CREATE INDEX idx_reservations_is_viewed ON reservations(tenant_id, is_viewed) 
        WHERE is_viewed = false;
        
        RAISE NOTICE 'is_viewedカラムとインデックスを追加しました';
    ELSE
        RAISE NOTICE 'is_viewedカラムは既に存在します';
    END IF;
END $$;
