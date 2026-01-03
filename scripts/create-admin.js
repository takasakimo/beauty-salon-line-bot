// 管理者アカウントを作成するスクリプト
require('dotenv').config({ path: '.env.local' });
if (require('fs').existsSync('.env')) {
  require('dotenv').config({ path: '.env' });
}
const { Client } = require('pg');
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function createAdmin() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL環境変数が設定されていません');
    console.log('Vercelの環境変数を取得してください:');
    console.log('  vercel env pull .env.local --environment=production');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ データベースに接続しました\n');

    // デフォルトテナントを取得または作成
    let tenantResult = await client.query(
      'SELECT tenant_id FROM tenants WHERE tenant_code = $1',
      ['beauty-salon-001']
    );

    let tenantId;
    if (tenantResult.rows.length === 0) {
      console.log('デフォルトテナントを作成中...');
      const insertResult = await client.query(
        `INSERT INTO tenants (tenant_code, salon_name, is_active)
         VALUES ('beauty-salon-001', 'デフォルト美容室', true)
         RETURNING tenant_id`
      );
      tenantId = insertResult.rows[0].tenant_id;
      console.log('✅ デフォルトテナントを作成しました');
    } else {
      tenantId = tenantResult.rows[0].tenant_id;
      console.log('✅ デフォルトテナントを確認しました');
    }

    // 管理者アカウント情報
    const username = process.argv[2] || 'admin';
    const password = process.argv[3] || 'admin123';
    const fullName = process.argv[4] || '管理者';

    console.log(`\n管理者アカウントを作成します:`);
    console.log(`  ユーザー名: ${username}`);
    console.log(`  パスワード: ${password}`);
    console.log(`  名前: ${fullName}\n`);

    // 既存の管理者を確認
    const existingAdmin = await client.query(
      'SELECT admin_id FROM tenant_admins WHERE tenant_id = $1 AND username = $2',
      [tenantId, username]
    );

    if (existingAdmin.rows.length > 0) {
      console.log('⚠️  既に同じユーザー名の管理者が存在します');
      console.log('パスワードを更新します...');
      
      const passwordHash = hashPassword(password);
      await client.query(
        `UPDATE tenant_admins 
         SET password_hash = $1, full_name = $2, is_active = true
         WHERE tenant_id = $3 AND username = $4`,
        [passwordHash, fullName, tenantId, username]
      );
      console.log('✅ 管理者アカウントのパスワードを更新しました');
    } else {
      // 新しい管理者を作成
      const passwordHash = hashPassword(password);
      await client.query(
        `INSERT INTO tenant_admins (tenant_id, username, password_hash, full_name, role, is_active)
         VALUES ($1, $2, $3, $4, 'admin', true)`,
        [tenantId, username, passwordHash, fullName]
      );
      console.log('✅ 管理者アカウントを作成しました');
    }

    console.log('\n========================================');
    console.log('管理者ログイン情報');
    console.log('========================================');
    console.log(`店舗コード: beauty-salon-001`);
    console.log(`ユーザー名: ${username}`);
    console.log(`パスワード: ${password}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createAdmin();



