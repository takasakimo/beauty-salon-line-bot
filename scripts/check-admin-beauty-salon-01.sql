-- beauty-salon-01の現在の管理者情報を確認するSQLクエリ
-- SupabaseのSQL Editorで実行してください

-- テナント情報を確認
SELECT 
    tenant_id,
    tenant_code,
    salon_name,
    is_active
FROM tenants
WHERE tenant_code = 'beauty-salon-01';

-- 管理者情報を確認
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
    SUBSTRING(password_hash, 1, 20) || '...' AS password_hash_preview
FROM tenant_admins
WHERE tenant_id = (
    SELECT tenant_id 
    FROM tenants 
    WHERE tenant_code = 'beauty-salon-01' 
    LIMIT 1
)
ORDER BY admin_id ASC;

-- よく使われるデフォルトパスワードのハッシュと比較
-- admin123のSHA256ハッシュ: 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
-- Demo1234のSHA256ハッシュ: b22f213ec710f0b0e86297d10279d69171f50f01a04edf40f472a563e7ad8576

SELECT 
    'admin123' AS test_password,
    '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9' AS hash_value,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM tenant_admins 
            WHERE tenant_id = (SELECT tenant_id FROM tenants WHERE tenant_code = 'beauty-salon-01' LIMIT 1)
            AND password_hash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'
        ) THEN '✅ 一致'
        ELSE '❌ 不一致'
    END AS match_status
UNION ALL
SELECT 
    'Demo1234' AS test_password,
    'b22f213ec710f0b0e86297d10279d69171f50f01a04edf40f472a563e7ad8576' AS hash_value,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM tenant_admins 
            WHERE tenant_id = (SELECT tenant_id FROM tenants WHERE tenant_code = 'beauty-salon-01' LIMIT 1)
            AND password_hash = 'b22f213ec710f0b0e86297d10279d69171f50f01a04edf40f472a563e7ad8576'
        ) THEN '✅ 一致'
        ELSE '❌ 不一致'
    END AS match_status;
