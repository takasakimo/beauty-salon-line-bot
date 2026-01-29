// 管理者アカウントのIDとパスワードを更新するスクリプト
require('dotenv').config({ path: '.env.local' });
if (require('fs').existsSync('.env')) {
  require('dotenv').config({ path: '.env' });
}
const { Client } = require('pg');
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function updateAdmin() {
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

    // テナントコード（beauty-salon-001またはbeauty-salon-01）
    const tenantCode = process.argv[2] || 'beauty-salon-001';
    const newUsername = process.argv[3] || 'info@aims-ngy.com';
    const newPassword = process.argv[4] || 'Demo1234';
    const newEmail = process.argv[5] || newUsername;

    console.log(`管理者アカウントを更新します:`);
    console.log(`  テナントコード: ${tenantCode}`);
    console.log(`  新しいユーザー名: ${newUsername}`);
    console.log(`  新しいパスワード: ${newPassword}`);
    console.log(`  新しいメールアドレス: ${newEmail}\n`);

    // テナントを取得
    const tenantResult = await client.query(
      'SELECT tenant_id FROM tenants WHERE tenant_code = $1',
      [tenantCode]
    );

    if (tenantResult.rows.length === 0) {
      console.error(`❌ テナントコード "${tenantCode}" が見つかりません`);
      process.exit(1);
    }

    const tenantId = tenantResult.rows[0].tenant_id;
    console.log(`✅ テナントを確認しました (tenant_id: ${tenantId})\n`);

    // 既存の管理者を確認（emailまたはusernameで検索）
    const existingAdmin = await client.query(
      `SELECT admin_id, username, email FROM tenant_admins 
       WHERE tenant_id = $1 
       AND (username = $2 OR email = $2 OR username LIKE '%@%' OR email LIKE '%@%')
       ORDER BY admin_id ASC
       LIMIT 1`,
      [tenantId, newUsername]
    );

    if (existingAdmin.rows.length > 0) {
      const admin = existingAdmin.rows[0];
      console.log(`⚠️  既存の管理者が見つかりました (admin_id: ${admin.admin_id})`);
      console.log(`  現在のユーザー名: ${admin.username || '(なし)'}`);
      console.log(`  現在のメールアドレス: ${admin.email || '(なし)'}`);
      console.log('パスワードとユーザー名を更新します...\n');
      
      const passwordHash = hashPassword(newPassword);
      await client.query(
        `UPDATE tenant_admins 
         SET username = $1, password_hash = $2, email = $3, full_name = $4, is_active = true, updated_at = CURRENT_TIMESTAMP
         WHERE admin_id = $5 AND tenant_id = $6`,
        [newUsername, passwordHash, newEmail, newUsername.split('@')[0] || '管理者', admin.admin_id, tenantId]
      );
      console.log('✅ 管理者アカウントを更新しました');
    } else {
      // 既存の管理者がいない場合、最初の管理者を更新または新規作成
      const allAdmins = await client.query(
        `SELECT admin_id, username, email FROM tenant_admins 
         WHERE tenant_id = $1 
         ORDER BY admin_id ASC
         LIMIT 1`,
        [tenantId]
      );

      if (allAdmins.rows.length > 0) {
        const admin = allAdmins.rows[0];
        console.log(`⚠️  既存の管理者が見つかりました (admin_id: ${admin.admin_id})`);
        console.log(`  現在のユーザー名: ${admin.username || '(なし)'}`);
        console.log(`  現在のメールアドレス: ${admin.email || '(なし)'}`);
        console.log('パスワードとユーザー名を更新します...\n');
        
        const passwordHash = hashPassword(newPassword);
        await client.query(
          `UPDATE tenant_admins 
           SET username = $1, password_hash = $2, email = $3, full_name = $4, is_active = true, updated_at = CURRENT_TIMESTAMP
           WHERE admin_id = $5 AND tenant_id = $6`,
          [newUsername, passwordHash, newEmail, newUsername.split('@')[0] || '管理者', admin.admin_id, tenantId]
        );
        console.log('✅ 管理者アカウントを更新しました');
      } else {
        // 新しい管理者を作成
        console.log('新しい管理者アカウントを作成します...\n');
        const passwordHash = hashPassword(newPassword);
        await client.query(
          `INSERT INTO tenant_admins (tenant_id, username, password_hash, full_name, email, role, is_active)
           VALUES ($1, $2, $3, $4, $5, 'admin', true)`,
          [tenantId, newUsername, passwordHash, newUsername.split('@')[0] || '管理者', newEmail]
        );
        console.log('✅ 管理者アカウントを作成しました');
      }
    }

    console.log('\n========================================');
    console.log('管理者ログイン情報');
    console.log('========================================');
    console.log(`テナントコード: ${tenantCode}`);
    console.log(`ユーザー名: ${newUsername}`);
    console.log(`パスワード: ${newPassword}`);
    console.log(`メールアドレス: ${newEmail}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

updateAdmin();
