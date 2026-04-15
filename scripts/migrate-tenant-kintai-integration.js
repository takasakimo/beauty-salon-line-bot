/**
 * らくっぽ勤怠連携設定用テーブルを作成
 * 実行: node scripts/migrate-tenant-kintai-integration.js
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
});

async function run() {
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS tenant_kintai_integration (
      tenant_id INTEGER NOT NULL PRIMARY KEY REFERENCES tenants(tenant_id) ON DELETE CASCADE,
      kintai_base_url TEXT NOT NULL,
      kintai_api_key TEXT NOT NULL,
      kintai_company_code VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ tenant_kintai_integration テーブルを作成しました');
  await client.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
