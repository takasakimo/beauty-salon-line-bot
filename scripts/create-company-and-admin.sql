-- 企業・企業管理者 作成用（SQLEditor 等で実行）
-- 1. 企業を1件作成
-- 2. 既存のテナントをその企業に紐づける（任意）
-- 3. 企業管理者を1件作成（パスワードは SHA256 ハッシュ。例: 'password' → 要アプリ側で hashPassword した値をここに設定）

-- 企業の作成（company_code はらくっぽ勤怠の企業コードと揃えると連携しやすい）
INSERT INTO companies (company_code, company_name, is_active)
VALUES ('COMPANY01', 'サンプル企業', true)
ON CONFLICT (company_code) DO NOTHING;

-- 既存テナントを企業に紐づける（tenant_id を環境に合わせて変更）
-- UPDATE tenants SET company_id = (SELECT company_id FROM companies WHERE company_code = 'COMPANY01') WHERE tenant_id = 1;

-- 企業管理者の作成は node scripts/create-company-admin-user.js を推奨（パスワードをハッシュ化して登録）
-- 手動で行う場合: password_hash は Node で require('crypto').createHash('sha256').update('your-password').digest('hex') の結果を設定
-- INSERT INTO company_admins (company_id, username, email, password_hash, full_name, is_active)
-- SELECT company_id, 'company_admin', 'company@example.com', '(ハッシュ値)', '企業管理者', true
-- FROM companies WHERE company_code = 'COMPANY01';
