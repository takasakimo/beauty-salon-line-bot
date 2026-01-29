-- beauty-salon-01の管理者パスワードをリセットするSQLスクリプト
-- SupabaseのSQL Editorで実行してください

-- パスワードハッシュを計算（Demo1234）
-- SHA256ハッシュ: Demo1234 -> b22f213ec710f0b0e86297d10279d69171f50f01a04edf40f472a563e7ad8576

-- 既存の管理者を更新（存在する場合）
UPDATE tenant_admins
SET 
    username = 'info@aims-ngy.com',
    password_hash = 'b22f213ec710f0b0e86297d10279d69171f50f01a04edf40f472a563e7ad8576',
    email = 'info@aims-ngy.com',
    full_name = 'info',
    is_active = true,
    updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = (
    SELECT tenant_id 
    FROM tenants 
    WHERE tenant_code = 'beauty-salon-01' 
    LIMIT 1
)
AND admin_id = (
    SELECT admin_id 
    FROM tenant_admins 
    WHERE tenant_id = (
        SELECT tenant_id 
        FROM tenants 
        WHERE tenant_code = 'beauty-salon-01' 
        LIMIT 1
    )
    ORDER BY admin_id ASC 
    LIMIT 1
);

-- 管理者が存在しない場合は新規作成
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
AND NOT EXISTS (
    SELECT 1 
    FROM tenant_admins 
    WHERE tenant_id = (
        SELECT tenant_id 
        FROM tenants 
        WHERE tenant_code = 'beauty-salon-01' 
        LIMIT 1
    )
)
LIMIT 1;
