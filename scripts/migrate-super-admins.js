// スーパー管理者テーブル作成用のマイグレーション
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

    console.log('super_adminsテーブルを作成中...');
    
    // テーブルが存在するかチェック
    const checkResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'super_admins'
    `);

    if (checkResult.rows.length === 0) {
      await client.query(`
        CREATE TABLE super_admins (
          super_admin_id SERIAL PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          full_name VARCHAR(100),
          email VARCHAR(255),
          is_active BOOLEAN DEFAULT true,
          last_login TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // インデックスを作成
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_super_admins_username ON super_admins(username)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_super_admins_is_active ON super_admins(is_active)
      `);
      
      console.log('✅ super_adminsテーブルを作成しました');
    } else {
      console.log('ℹ️  super_adminsテーブルは既に存在します');
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

