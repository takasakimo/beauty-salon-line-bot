-- デモ予約データを削除するSQL
-- SQLエディタで実行してください

-- 1. デモテナント（beauty-salon-001）の予約を確認
SELECT 
  t.tenant_id,
  t.tenant_code,
  t.salon_name,
  COUNT(r.reservation_id) as reservation_count
FROM tenants t
LEFT JOIN reservations r ON t.tenant_id = r.tenant_id
WHERE t.tenant_code = 'beauty-salon-001'
GROUP BY t.tenant_id, t.tenant_code, t.salon_name;

-- 2. デモテナントの予約詳細を確認（最新10件）
SELECT 
  r.reservation_id,
  r.reservation_date,
  r.status,
  r.created_date,
  c.real_name as customer_name,
  m.name as menu_name
FROM reservations r
LEFT JOIN customers c ON r.customer_id = c.customer_id
LEFT JOIN menus m ON r.menu_id = m.menu_id
WHERE r.tenant_id = (
  SELECT tenant_id FROM tenants WHERE tenant_code = 'beauty-salon-001' LIMIT 1
)
ORDER BY r.created_date DESC
LIMIT 10;

-- 3. デモテナントの予約を削除（実行前に必ず確認してください）
-- reservation_menusテーブルからも削除（存在する場合）
DELETE FROM reservation_menus 
WHERE reservation_id IN (
  SELECT reservation_id 
  FROM reservations 
  WHERE tenant_id = (
    SELECT tenant_id FROM tenants WHERE tenant_code = 'beauty-salon-001' LIMIT 1
  )
);

-- 予約を削除
DELETE FROM reservations 
WHERE tenant_id = (
  SELECT tenant_id FROM tenants WHERE tenant_code = 'beauty-salon-001' LIMIT 1
);

-- 4. 実際の店舗のテナントIDを指定して予約を確認・削除する場合
-- 以下のSQLでテナントIDを2に変更してください

-- 4-1. 特定のテナントの予約を確認
-- SELECT 
--   r.reservation_id,
--   r.reservation_date,
--   r.status,
--   r.created_date,
--   c.real_name as customer_name,
--   m.name as menu_name
-- FROM reservations r
-- LEFT JOIN customers c ON r.customer_id = c.customer_id
-- LEFT JOIN menus m ON r.menu_id = m.menu_id
-- WHERE r.tenant_id = 2  -- 実際の店舗のテナントIDに変更
-- ORDER BY r.created_date DESC;

-- 4-2. 特定のテナントの予約を削除（実行前に必ず確認してください）
-- DELETE FROM reservation_menus 
-- WHERE reservation_id IN (
--   SELECT reservation_id FROM reservations WHERE tenant_id = 2  -- 実際の店舗のテナントIDに変更
-- );
-- 
-- DELETE FROM reservations 
-- WHERE tenant_id = 2;  -- 実際の店舗のテナントIDに変更
