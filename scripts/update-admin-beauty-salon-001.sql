-- beauty-salon-001の管理者IDとパスワードを変更するSQLスクリプト
-- SupabaseのSQL Editorで実行してください

-- パスワードハッシュ: Demo1234 -> b22f213ec710f0b0e86297d10279d69171f50f01a04edf40f472a563e7ad8576

-- 1. 現在の管理者情報を確認
SELECT 
    ta.admin_id,
    ta.username,
    ta.email,
    ta.is_active,
    t.tenant_code,
    t.salon_name
FROM tenant_admins ta
INNER JOIN tenants t ON ta.tenant_id = t.tenant_id
WHERE t.tenant_code = 'beauty-salon-001'
ORDER BY ta.admin_id ASC;

-- 2. 管理者を更新（存在する場合）
UPDATE tenant_admins
SET 
    username = 'info@aims-ngy.com',
    password_hash = 'b22f213ec710f0b0e86297d10279d69171f50f01a04edf40f472a563e7ad8576',
    email = 'info@aims-ngy.com',
    full_name = 'info',
    is_active = true
WHERE tenant_id = (
    SELECT tenant_id 
    FROM tenants 
    WHERE tenant_code = 'beauty-salon-001' 
    LIMIT 1
)
AND admin_id = (
    SELECT admin_id 
    FROM tenant_admins 
    WHERE tenant_id = (
        SELECT tenant_id 
        FROM tenants 
        WHERE tenant_code = 'beauty-salon-001' 
        LIMIT 1
    )
    ORDER BY admin_id ASC 
    LIMIT 1
)
RETURNING admin_id, username, email, is_active;

-- 3. 管理者が存在しない場合は新規作成
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
WHERE tenant_code = 'beauty-salon-001'
AND NOT EXISTS (
    SELECT 1 
    FROM tenant_admins 
    WHERE tenant_id = (
        SELECT tenant_id 
        FROM tenants 
        WHERE tenant_code = 'beauty-salon-001' 
        LIMIT 1
    )
)
RETURNING admin_id, username, email, is_active;

-- 4. 最終確認
SELECT 
    ta.admin_id,
    ta.username,
    ta.email,
    ta.is_active,
    t.tenant_code,
    t.salon_name,
    CASE 
        WHEN ta.password_hash = 'b22f213ec710f0b0e86297d10279d69171f50f01a04edf40f472a563e7ad8576' 
        THEN '✅ パスワード一致（Demo1234）'
        ELSE '❌ パスワード不一致'
    END AS password_check
FROM tenant_admins ta
INNER JOIN tenants t ON ta.tenant_id = t.tenant_id
WHERE t.tenant_code = 'beauty-salon-001'
ORDER BY ta.admin_id ASC;
