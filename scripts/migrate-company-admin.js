/**
 * 企業・企業管理者対応のマイグレーション
 * - companies テーブル作成
 * - company_admins テーブル作成
 * - tenants に company_id 追加
 * - sessions に company_id, company_admin_id 追加
 * 実行: node scripts/migrate-company-admin.js
 */
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const { Client } = require('pg');

const databaseUrl = process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL 等が設定されていません');
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function run() {
  await client.connect();

  // 1. companies テーブル
  await client.query(`
    CREATE TABLE IF NOT EXISTS companies (
      company_id SERIAL PRIMARY KEY,
      company_code VARCHAR(50) UNIQUE NOT NULL,
      company_name VARCHAR(255) NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ companies テーブルを作成しました');

  // 2. company_admins テーブル
  await client.query(`
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
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_company_admins_company_id ON company_admins(company_id);
    CREATE INDEX IF NOT EXISTS idx_company_admins_username ON company_admins(username);
    CREATE INDEX IF NOT EXISTS idx_company_admins_is_active ON company_admins(is_active);
  `);
  console.log('✅ company_admins テーブルを作成しました');

  // 3. tenants に company_id 追加
  const tenantCol = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'company_id'
  `);
  if (tenantCol.rows.length === 0) {
    await client.query(`
      ALTER TABLE tenants ADD COLUMN company_id INTEGER REFERENCES companies(company_id) ON DELETE SET NULL;
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tenants_company_id ON tenants(company_id);`);
    console.log('✅ tenants に company_id を追加しました');
  } else {
    console.log('✅ tenants.company_id は既に存在します');
  }

  // 4. sessions に company_id, company_admin_id 追加
  const sessCompanyId = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'company_id'
  `);
  if (sessCompanyId.rows.length === 0) {
    await client.query(`ALTER TABLE sessions ADD COLUMN company_id INTEGER;`);
    console.log('✅ sessions に company_id を追加しました');
  }
  const sessCompanyAdminId = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'company_admin_id'
  `);
  if (sessCompanyAdminId.rows.length === 0) {
    await client.query(`ALTER TABLE sessions ADD COLUMN company_admin_id INTEGER;`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_company_id ON sessions(company_id);`);
    console.log('✅ sessions に company_admin_id を追加しました');
  } else {
    console.log('✅ sessions の company_id / company_admin_id は既に存在します');
  }

  await client.end();
  console.log('\n✅ 企業・企業管理者マイグレーションが完了しました');
}

run().catch((e) => { console.error(e); process.exit(1); });
