// 出勤人数（最大同時予約数）設定用のマイグレーション
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

  // SSL設定
  const sslConfig = {
    rejectUnauthorized: false
  };

  const client = new Client({
    connectionString: cleanUrl,
    ssl: sslConfig
  });

  try {
    await client.connect();
    console.log('✅ データベースに接続しました\n');

    console.log('tenantsテーブルにmax_concurrent_reservationsカラムを追加中...');
    
    // カラムが存在するかチェック
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'max_concurrent_reservations'
    `);

    if (checkResult.rows.length === 0) {
      await client.query(`
        ALTER TABLE tenants 
        ADD COLUMN max_concurrent_reservations INTEGER DEFAULT 3
      `);
      console.log('✅ max_concurrent_reservationsカラムを追加しました');
    } else {
      console.log('ℹ️  max_concurrent_reservationsカラムは既に存在します');
    }

    // 既存のテナントにデフォルト値を設定（NULLの場合）
    await client.query(`
      UPDATE tenants 
      SET max_concurrent_reservations = 3 
      WHERE max_concurrent_reservations IS NULL
    `);
    console.log('✅ 既存テナントにデフォルト値を設定しました');

    console.log('\n✅ マイグレーションが完了しました');
  } catch (error) {
    console.error('❌ マイグレーションエラー:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();

