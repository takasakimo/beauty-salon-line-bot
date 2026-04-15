/**
 * 企業と企業管理者を1件作成するスクリプト
 * 実行: node scripts/create-company-admin-user.js [company_code] [company_name] [username] [password]
 * 例: node scripts/create-company-admin-user.js COMPANY01 "サンプル企業" company_admin mypassword
 */
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const { Client } = require('pg');
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const companyCode = process.argv[2] || 'COMPANY01';
const companyName = process.argv[3] || 'サンプル企業';
const username = process.argv[4] || 'company_admin';
const password = process.argv[5] || 'companyadmin123';

const databaseUrl = process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL 等が設定されていません');
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function run() {
  await client.connect();

  let companyId;
  const existingCompany = await client.query('SELECT company_id FROM companies WHERE company_code = $1', [companyCode]);
  if (existingCompany.rows.length > 0) {
    companyId = existingCompany.rows[0].company_id;
    console.log('既存の企業を使用:', companyCode, 'company_id=', companyId);
  } else {
    const insert = await client.query(
      'INSERT INTO companies (company_code, company_name, is_active) VALUES ($1, $2, true) RETURNING company_id',
      [companyCode, companyName]
    );
    companyId = insert.rows[0].company_id;
    console.log('企業を作成しました:', companyCode, companyName, 'company_id=', companyId);
  }

  const passwordHash = hashPassword(password);
  const existingAdmin = await client.query(
    'SELECT company_admin_id FROM company_admins WHERE company_id = $1 AND username = $2',
    [companyId, username]
  );
  if (existingAdmin.rows.length > 0) {
    await client.query(
      'UPDATE company_admins SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE company_id = $2 AND username = $3',
      [passwordHash, companyId, username]
    );
    console.log('企業管理者のパスワードを更新しました:', username);
  } else {
    await client.query(
      `INSERT INTO company_admins (company_id, username, email, password_hash, full_name, is_active)
       VALUES ($1, $2, $3, $4, $5, true)`,
      [companyId, username, `${username}@example.com`, passwordHash, '企業管理者']
    );
    console.log('企業管理者を作成しました:', username);
  }

  console.log('\nログインURL: / （トップページのログインから企業管理者としてログイン）');
  console.log('ユーザー名:', username, ' パスワード: (入力した値)');
  await client.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
