// 管理者アカウントの存在とパスワードを確認するスクリプト
require('dotenv').config({ path: '.env.local' });
if (require('fs').existsSync('.env')) {
  require('dotenv').config({ path: '.env' });
}
const { Client } = require('pg');
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function checkAdmin() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL環境変数が設定されていません');
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

    // テナントを確認
    const tenantResult = await client.query(
      'SELECT tenant_id, tenant_code, salon_name FROM tenants WHERE tenant_code = $1',
      ['beauty-salon-001']
    );

    if (tenantResult.rows.length === 0) {
      console.error('❌ テナントが見つかりません');
      process.exit(1);
    }

    const tenant = tenantResult.rows[0];
    console.log('テナント情報:');
    console.log(`  ID: ${tenant.tenant_id}`);
    console.log(`  コード: ${tenant.tenant_code}`);
    console.log(`  名前: ${tenant.salon_name}\n`);

    // 管理者を確認
    const adminResult = await client.query(
      'SELECT admin_id, username, full_name, role, is_active, password_hash FROM tenant_admins WHERE tenant_id = $1',
      [tenant.tenant_id]
    );

    if (adminResult.rows.length === 0) {
      console.log('❌ 管理者アカウントが見つかりません');
      console.log('管理者アカウントを作成してください:');
      console.log('  npm run admin:create');
      process.exit(1);
    }

    console.log('管理者アカウント:');
    adminResult.rows.forEach(admin => {
      console.log(`  ユーザー名: ${admin.username}`);
      console.log(`  名前: ${admin.full_name}`);
      console.log(`  ロール: ${admin.role}`);
      console.log(`  有効: ${admin.is_active}`);
      console.log(`  パスワードハッシュ: ${admin.password_hash ? admin.password_hash.substring(0, 20) + '...' : 'NULL'}`);
      
      // パスワード検証テスト
      const testPassword = 'admin123';
      const testHash = hashPassword(testPassword);
      const passwordMatch = admin.password_hash === testHash;
      console.log(`  パスワード検証 (admin123): ${passwordMatch ? '✅ 一致' : '❌ 不一致'}`);
      console.log('');
    });

    // パスワード検証テスト
    console.log('パスワード検証テスト:');
    const testPassword = 'admin123';
    const testHash = hashPassword(testPassword);
    console.log(`  テストパスワード: ${testPassword}`);
    console.log(`  ハッシュ: ${testHash}\n`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkAdmin();



