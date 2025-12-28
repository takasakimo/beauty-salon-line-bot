-- reservation_menusテーブル作成用のSQLスクリプト
-- Supabase SQL Editorで直接実行してください

-- テーブルが存在しない場合のみ作成
CREATE TABLE IF NOT EXISTS reservation_menus (
  reservation_menu_id SERIAL PRIMARY KEY,
  reservation_id INTEGER NOT NULL REFERENCES reservations(reservation_id) ON DELETE CASCADE,
  menu_id INTEGER NOT NULL REFERENCES menus(menu_id) ON DELETE CASCADE,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  price INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(reservation_id, menu_id)
);

-- インデックスを作成（既に存在する場合はエラーになるが、無視してOK）
CREATE INDEX IF NOT EXISTS idx_reservation_menus_reservation_id ON reservation_menus(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_menus_menu_id ON reservation_menus(menu_id);
CREATE INDEX IF NOT EXISTS idx_reservation_menus_tenant_id ON reservation_menus(tenant_id);

-- 既存の予約データを移行（menu_idが存在する場合）
INSERT INTO reservation_menus (reservation_id, menu_id, tenant_id, price)
SELECT reservation_id, menu_id, tenant_id, COALESCE(price, 0)
FROM reservations
WHERE menu_id IS NOT NULL
ON CONFLICT (reservation_id, menu_id) DO NOTHING;

