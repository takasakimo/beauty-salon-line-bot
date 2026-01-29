-- beauty-salon-01の管理者パスワードをリセットするSQLスクリプト
-- SupabaseのSQL Editorで実行してください

-- パスワードハッシュを計算（Demo1234）
-- SHA256ハッシュ: Demo1234 -> b22f213ec710f0b0e86297d10279d69171f50f01a04edf40f472a563e7ad8576

-- 1. テナントIDを取得
DO $$
DECLARE
    v_tenant_id INTEGER;
    v_admin_id INTEGER;
    v_password_hash TEXT;
BEGIN
    -- テナントIDを取得
    SELECT tenant_id INTO v_tenant_id
    FROM tenants
    WHERE tenant_code = 'beauty-salon-01'
    LIMIT 1;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'テナントコード beauty-salon-01 が見つかりません';
    END IF;

    -- パスワードハッシュを計算（Demo1234）
    -- SHA256ハッシュを計算（Node.jsのcrypto.createHash('sha256')と同じ方法）
    -- Demo1234のSHA256ハッシュ（小文字）: b22f213ec710f0b0e86297d10279d69171f50f01a04edf40f472a563e7ad8576
    v_password_hash := 'b22f213ec710f0b0e86297d10279d69171f50f01a04edf40f472a563e7ad8576';

    -- 既存の管理者を確認
    SELECT admin_id INTO v_admin_id
    FROM tenant_admins
    WHERE tenant_id = v_tenant_id
    ORDER BY admin_id ASC
    LIMIT 1;

    IF v_admin_id IS NOT NULL THEN
        -- 既存の管理者を更新
        UPDATE tenant_admins
        SET 
            username = 'info@aims-ngy.com',
            password_hash = v_password_hash,
            email = 'info@aims-ngy.com',
            full_name = 'info',
            is_active = true,
            updated_at = CURRENT_TIMESTAMP
        WHERE admin_id = v_admin_id AND tenant_id = v_tenant_id;

        RAISE NOTICE '管理者アカウントを更新しました (admin_id: %)', v_admin_id;
    ELSE
        -- 新しい管理者を作成
        INSERT INTO tenant_admins (tenant_id, username, password_hash, full_name, email, role, is_active)
        VALUES (v_tenant_id, 'info@aims-ngy.com', v_password_hash, 'info', 'info@aims-ngy.com', 'admin', true)
        RETURNING admin_id INTO v_admin_id;

        RAISE NOTICE '管理者アカウントを作成しました (admin_id: %)', v_admin_id;
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE '管理者ログイン情報';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'テナントコード: beauty-salon-01';
    RAISE NOTICE 'ユーザー名: info@aims-ngy.com';
    RAISE NOTICE 'パスワード: Demo1234';
    RAISE NOTICE 'メールアドレス: info@aims-ngy.com';
    RAISE NOTICE '========================================';
END $$;
