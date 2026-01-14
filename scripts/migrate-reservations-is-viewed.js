// 予約テーブルにis_viewedカラムを追加するマイグレーション
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

    console.log('reservationsテーブルにis_viewedカラムを追加中...');
    
    // カラムが存在するかチェック
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'reservations' AND column_name = 'is_viewed'
    `);

    if (checkResult.rows.length === 0) {
      await client.query(`
        ALTER TABLE reservations 
        ADD COLUMN is_viewed BOOLEAN DEFAULT false
      `);
      
      // インデックスを作成（未読予約の検索を高速化）
      await client.query(`
        CREATE INDEX idx_reservations_is_viewed ON reservations(tenant_id, is_viewed) 
        WHERE is_viewed = false
      `);
      
      console.log('✅ is_viewedカラムを追加しました');
      console.log('✅ インデックスを作成しました');
    } else {
      console.log('ℹ️  is_viewedカラムは既に存在します');
    }

    console.log('\n✅ マイグレーションが完了しました');
  } catch (error) {
    console.error('❌ マイグレーションエラー:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
