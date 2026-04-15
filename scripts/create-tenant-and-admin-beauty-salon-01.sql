-- beauty-salon-01のテナントと管理者を確実に作成するSQL
-- SupabaseのSQL Editorで実行してください

-- 1. テナントが存在するか確認
SELECT tenant_id, tenant_code, salon_name, is_active
FROM tenants
WHERE tenant_code = 'beauty-salon-01';

-- 2. テナントが存在しない場合は作成
INSERT INTO tenants (tenant_code, salon_name, is_active)
SELECT 'beauty-salon-01', 'ビューティーサロン名古屋', true
WHERE NOT EXISTS (
    SELECT 1 FROM tenants WHERE tenant_code = 'beauty-salon-01'
)
RETURNING tenant_id, tenant_code, salon_name;

-- 3. 管理者を確実に作成または更新
-- まず既存の管理者を削除（念のため）
DELETE FROM tenant_admins
WHERE tenant_id = (
    SELECT tenant_id 
    FROM tenants 
    WHERE tenant_code = 'beauty-salon-01' 
    LIMIT 1
);

-- 4. 新しい管理者を作成
INSERT INTO tenant_admins (tenant_id, username, password_hash, full_name, email, role, is_active)
SELECT 
    tenant_id,
    'info@aims-ngy.com',
    'b22f213ec710f0b0e86297d10279d69171f50f01a04edf40f472a563e7ad8576',
    'info',
    'info@aims-ngy.com',
    'admin',
    true
FROM tenants
WHERE tenant_code = 'beauty-salon-01'
RETURNING admin_id, username, email, is_active;

-- 5. 最終確認
SELECT 
    ta.admin_id,
    ta.username,
    ta.email,
    ta.is_active as admin_is_active,
    t.tenant_id,
    t.tenant_code,
    t.salon_name,
    t.is_active as tenant_is_active,
    CASE 
        WHEN ta.password_hash = 'b22f213ec710f0b0e86297d10279d69171f50f01a04edf40f472a563e7ad8576' 
        THEN '✅ パスワード一致（Demo1234）'
        ELSE '❌ パスワード不一致'
    END AS password_check
FROM tenant_admins ta
INNER JOIN tenants t ON ta.tenant_id = t.tenant_id
WHERE t.tenant_code = 'beauty-salon-01';
