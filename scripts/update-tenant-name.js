// テナント名を更新するスクリプト
require('dotenv').config({ path: '.env.local' });
if (require('fs').existsSync('.env')) {
  require('dotenv').config({ path: '.env' });
}
const { Client } = require('pg');

async function updateTenantName() {
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

    // 現在のテナント情報を確認
    const currentTenant = await client.query(
      'SELECT tenant_id, tenant_code, salon_name FROM tenants WHERE tenant_code = $1',
      ['beauty-salon-001']
    );

    if (currentTenant.rows.length === 0) {
      console.error('❌ テナントが見つかりません');
      process.exit(1);
    }

    const tenant = currentTenant.rows[0];
    console.log('現在のテナント情報:');
    console.log(`  店舗コード: ${tenant.tenant_code}`);
    console.log(`  店舗名: ${tenant.salon_name}\n`);

    // 新しい店舗名を取得（コマンドライン引数またはプロンプト）
    const newSalonName = process.argv[2];
    
    if (!newSalonName) {
      console.log('使用方法:');
      console.log('  npm run tenant:update "新しい店舗名"');
      console.log('');
      console.log('例:');
      console.log('  npm run tenant:update "らくポチビューティー"');
      process.exit(1);
    }

    // テナント名を更新
    await client.query(
      'UPDATE tenants SET salon_name = $1, updated_at = CURRENT_TIMESTAMP WHERE tenant_code = $2',
      [newSalonName, 'beauty-salon-001']
    );

    console.log('✅ テナント名を更新しました');
    console.log(`  新しい店舗名: ${newSalonName}\n`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

updateTenantName();



