-- beauty-salon-01の管理者情報を確認・検証するSQLクエリ
-- SupabaseのSQL Editorで実行してください

-- 1. テナント情報を確認
SELECT 
    tenant_id,
    tenant_code,
    salon_name,
    is_active,
    created_at
FROM tenants
WHERE tenant_code = 'beauty-salon-01';

-- 2. 管理者情報を確認
SELECT 
    admin_id,
    username,
    email,
    full_name,
    role,
    is_active,
    created_at,
    last_login,
    -- パスワードハッシュの一部を表示（セキュリティのため）
    SUBSTRING(password_hash, 1, 20) || '...' AS password_hash_preview,
    LENGTH(password_hash) AS password_hash_length
FROM tenant_admins
WHERE tenant_id = (
    SELECT tenant_id 
    FROM tenants 
    WHERE tenant_code = 'beauty-salon-01' 
    LIMIT 1
)
ORDER BY admin_id ASC;

-- 3. パスワードハッシュの検証
-- Demo1234のSHA256ハッシュ: b22f213ec710f0b0e86297d10279d69171f50f01a04edf40f472a563e7ad8576
SELECT 
    admin_id,
    username,
    CASE 
        WHEN password_hash = 'b22f213ec710f0b0e86297d10279d69171f50f01a04edf40f472a563e7ad8576' 
        THEN '✅ Demo1234と一致'
        ELSE '❌ Demo1234と不一致'
    END AS password_check
FROM tenant_admins
WHERE tenant_id = (
    SELECT tenant_id 
    FROM tenants 
    WHERE tenant_code = 'beauty-salon-01' 
    LIMIT 1
)
ORDER BY admin_id ASC;
