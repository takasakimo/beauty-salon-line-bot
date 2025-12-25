// スーパー管理者アカウントを作成するスクリプト
require('dotenv').config({ path: '.env.local' });
if (require('fs').existsSync('.env.vercel')) {
  require('dotenv').config({ path: '.env.vercel' });
}
if (require('fs').existsSync('.env')) {
  require('dotenv').config({ path: '.env' });
}
const { Client } = require('pg');
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function createSuperAdmin() {
  const databaseUrl = process.env.POSTGRES_URL || 
                      process.env.POSTGRES_URL_NON_POOLING ||
                      process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ データベース接続URLが見つかりません');
    process.exit(1);
  }

  // postgres://をpostgresql://に変換
  let cleanUrl = databaseUrl;
  if (cleanUrl.startsWith('postgres://')) {
    cleanUrl = cleanUrl.replace('postgres://', 'postgresql://');
  }

  const client = new Client({
    connectionString: cleanUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ データベースに接続しました\n');

    // スーパー管理者アカウント情報
    const username = process.argv[2] || 'superadmin';
    const password = process.argv[3] || 'superadmin123';
    const fullName = process.argv[4] || 'スーパー管理者';
    const email = process.argv[5] || '';

    console.log(`スーパー管理者アカウントを作成します:`);
    console.log(`  ユーザー名: ${username}`);
    console.log(`  パスワード: ${password}`);
    console.log(`  名前: ${fullName}`);
    if (email) {
      console.log(`  メール: ${email}`);
    }
    console.log('');

    // 既存のスーパー管理者を確認
    const existingAdmin = await client.query(
      'SELECT super_admin_id FROM super_admins WHERE username = $1',
      [username]
    );

    if (existingAdmin.rows.length > 0) {
      console.log('⚠️  既に同じユーザー名のスーパー管理者が存在します');
      console.log('パスワードを更新します...');
      
      const passwordHash = hashPassword(password);
      await client.query(
        `UPDATE super_admins 
         SET password_hash = $1, full_name = $2, email = $3, is_active = true, updated_at = CURRENT_TIMESTAMP
         WHERE username = $4`,
        [passwordHash, fullName, email || null, username]
      );
      console.log('✅ スーパー管理者アカウントのパスワードを更新しました');
    } else {
      // 新しいスーパー管理者を作成
      const passwordHash = hashPassword(password);
      await client.query(
        `INSERT INTO super_admins (username, password_hash, full_name, email, is_active)
         VALUES ($1, $2, $3, $4, true)`,
        [username, passwordHash, fullName, email || null]
      );
      console.log('✅ スーパー管理者アカウントを作成しました');
    }

    console.log('\n========================================');
    console.log('スーパー管理者ログイン情報');
    console.log('========================================');
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

createSuperAdmin();

