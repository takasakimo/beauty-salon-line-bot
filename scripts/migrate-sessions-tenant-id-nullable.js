// sessionsテーブルのtenant_idカラムをNULL許可に変更するマイグレーション
require('dotenv').config({ path: '.env.local' });
if (require('fs').existsSync('.env.vercel')) {
  require('dotenv').config({ path: '.env.vercel' });
}
if (require('fs').existsSync('.env')) {
  require('dotenv').config({ path: '.env' });
}

const { Client } = require('pg');

async function migrate() {
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

  // 接続URLのSSL設定を確認・修正
  const urlObj = new URL(cleanUrl);
  urlObj.searchParams.delete('sslmode');
  urlObj.searchParams.delete('supa');
  cleanUrl = urlObj.toString();

  const client = new Client({
    connectionString: cleanUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ データベースに接続しました\n');

    // tenant_idカラムの制約を確認
    const columnCheck = await client.query(`
      SELECT 
        column_name,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'sessions' AND column_name = 'tenant_id'
    `);

    if (columnCheck.rows.length === 0) {
      console.log('❌ sessionsテーブルまたはtenant_idカラムが見つかりません');
      await client.end();
      process.exit(1);
    }

    const column = columnCheck.rows[0];
    if (column.is_nullable === 'YES') {
      console.log('ℹ️  tenant_idカラムは既にNULL許可です');
      await client.end();
      return;
    }

    console.log('tenant_idカラムをNULL許可に変更中...');
    
    // tenant_idカラムをNULL許可に変更
    await client.query(`
      ALTER TABLE sessions 
      ALTER COLUMN tenant_id DROP NOT NULL
    `);
    
    console.log('✅ tenant_idカラムをNULL許可に変更しました');

    console.log('\n✅ マイグレーションが完了しました');
  } catch (error) {
    console.error('❌ マイグレーションエラー:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();

