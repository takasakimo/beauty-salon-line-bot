-- beauty-salon-01のログイン問題をデバッグするSQLクエリ
-- SupabaseのSQL Editorで実行してください

-- 1. テナント情報を確認
SELECT 
    tenant_id,
    tenant_code,
    salon_name,
    is_active
FROM tenants
WHERE tenant_code = 'beauty-salon-01';

-- 2. 管理者情報を詳細確認
SELECT 
    admin_id,
    username,
    email,
    full_name,
    role,
    is_active,
    created_at,
    last_login,
    -- パスワードハッシュ全体を表示（デバッグ用）
    password_hash,
    LENGTH(password_hash) AS password_hash_length
FROM tenant_admins
WHERE tenant_id = (
    SELECT tenant_id 
    FROM tenants 
    WHERE tenant_code = 'beauty-salon-01' 
    LIMIT 1
)
ORDER BY admin_id ASC;

-- 3. メールアドレスまたはユーザー名で検索（ログイン時の検索と同じ）
SELECT 
    ta.admin_id,
    ta.username,
    ta.email,
    ta.password_hash,
    ta.is_active,
    t.tenant_code,
    t.salon_name,
    t.is_active as tenant_is_active
FROM tenant_admins ta
INNER JOIN tenants t ON ta.tenant_id = t.tenant_id
WHERE (LOWER(TRIM(ta.email)) = LOWER(TRIM('info@aims-ngy.com')) 
   OR LOWER(TRIM(ta.username)) = LOWER(TRIM('info@aims-ngy.com')))
AND ta.is_active = true
AND t.is_active = true;

-- 4. パスワードハッシュの検証
-- Demo1234のSHA256ハッシュ: b22f213ec710f0b0e86297d10279d69171f50f01a04edf40f472a563e7ad8576
SELECT 
    admin_id,
    username,
    email,
    CASE 
        WHEN password_hash = 'b22f213ec710f0b0e86297d10279d69171f50f01a04edf40f472a563e7ad8576' 
        THEN '✅ Demo1234と一致'
        WHEN password_hash IS NULL
        THEN '⚠️ パスワード未設定'
        ELSE '❌ Demo1234と不一致（現在のハッシュ: ' || SUBSTRING(password_hash, 1, 20) || '...）'
    END AS password_check,
    password_hash
FROM tenant_admins
WHERE tenant_id = (
    SELECT tenant_id 
    FROM tenants 
    WHERE tenant_code = 'beauty-salon-01' 
    LIMIT 1
)
ORDER BY admin_id ASC;

-- 5. 管理者を直接更新（念のため）
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
)
RETURNING admin_id, username, email, is_active;
