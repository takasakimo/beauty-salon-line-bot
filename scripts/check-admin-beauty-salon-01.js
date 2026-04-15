// beauty-salon-01の管理者アカウント情報を確認するスクリプト
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

    // テナントを確認
    const tenantResult = await client.query(
      'SELECT tenant_id, tenant_code, salon_name FROM tenants WHERE tenant_code = $1',
      ['beauty-salon-01']
    );

    if (tenantResult.rows.length === 0) {
      console.error('❌ テナントコード "beauty-salon-01" が見つかりません');
      process.exit(1);
    }

    const tenant = tenantResult.rows[0];
    console.log('テナント情報:');
    console.log(`  ID: ${tenant.tenant_id}`);
    console.log(`  コード: ${tenant.tenant_code}`);
    console.log(`  名前: ${tenant.salon_name}\n`);

    // 管理者を確認
    const adminResult = await client.query(
      'SELECT admin_id, username, email, full_name, role, is_active, password_hash FROM tenant_admins WHERE tenant_id = $1 ORDER BY admin_id ASC',
      [tenant.tenant_id]
    );

    if (adminResult.rows.length === 0) {
      console.log('❌ 管理者アカウントが見つかりません');
      console.log('管理者アカウントを作成してください:');
      console.log('  node scripts/update-admin.js beauty-salon-01 info@aims-ngy.com Demo1234');
      process.exit(1);
    }

    console.log('管理者アカウント:');
    adminResult.rows.forEach(admin => {
      console.log(`  管理者ID: ${admin.admin_id}`);
      console.log(`  ユーザー名: ${admin.username || '(なし)'}`);
      console.log(`  メールアドレス: ${admin.email || '(なし)'}`);
      console.log(`  名前: ${admin.full_name || '(なし)'}`);
      console.log(`  ロール: ${admin.role}`);
      console.log(`  有効: ${admin.is_active}`);
      console.log(`  パスワードハッシュ: ${admin.password_hash ? admin.password_hash.substring(0, 20) + '...' : 'NULL'}`);
      console.log('');
    });

    // よく使われるパスワードの検証テスト
    console.log('パスワード検証テスト:');
    const testPasswords = ['admin123', 'Demo1234', 'admin', 'password', '123456'];
    
    for (const testPassword of testPasswords) {
      const testHash = hashPassword(testPassword);
      const passwordMatch = adminResult.rows.some(admin => admin.password_hash === testHash);
      console.log(`  ${testPassword}: ${passwordMatch ? '✅ 一致' : '❌ 不一致'}`);
    }
    console.log('');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkAdmin();
