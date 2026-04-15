-- 企業・企業管理者 用マイグレーション（SQLEditor 等で実行）
-- 企業・店舗管理者 仕様に基づく Phase 1

-- 1. companies
CREATE TABLE IF NOT EXISTS companies (
  company_id SERIAL PRIMARY KEY,
  company_code VARCHAR(50) UNIQUE NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. company_admins
CREATE TABLE IF NOT EXISTS company_admins (
  company_admin_id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_company_admins_company_id ON company_admins(company_id);
CREATE INDEX IF NOT EXISTS idx_company_admins_username ON company_admins(username);
CREATE INDEX IF NOT EXISTS idx_company_admins_is_active ON company_admins(is_active);

-- 3. tenants に company_id 追加
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(company_id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_company_id ON tenants(company_id);

-- 4. sessions に company_id, company_admin_id 追加
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS company_admin_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_sessions_company_id ON sessions(company_id);
