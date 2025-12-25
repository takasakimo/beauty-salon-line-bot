// sessionsテーブルを作成するマイグレーション
require('dotenv').config({ path: '.env.local' });
if (require('fs').existsSync('.env')) {
  require('dotenv').config({ path: '.env' });
}
if (require('fs').existsSync('.env.vercel')) {
  require('dotenv').config({ path: '.env.vercel' });
}
const { Client } = require('pg');

async function migrateSessionsTable() {
  // POSTGRES_URLを優先（Supabaseの新しい形式）
  let databaseUrl = process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL環境変数が設定されていません');
    process.exit(1);
  }

  // 古い形式のURLを検出した場合はエラー
  if (databaseUrl.includes('db.') && databaseUrl.includes('.supabase.co') && !databaseUrl.includes('pooler')) {
    console.error('❌ 古い形式のデータベースURLが検出されました。POSTGRES_URLを使用してください。');
    process.exit(1);
  }

  // postgres://をpostgresql://に変換
  if (databaseUrl.startsWith('postgres://')) {
    databaseUrl = databaseUrl.replace('postgres://', 'postgresql://');
  }

  // 接続文字列からsslmodeパラメータを削除
  const urlObj = new URL(databaseUrl);
  urlObj.searchParams.delete('sslmode');
  urlObj.searchParams.delete('supa');
  const cleanDatabaseUrl = urlObj.toString();

  const client = new Client({
    connectionString: cleanDatabaseUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ データベースに接続しました\n');

    // sessionsテーブルが存在するか確認
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'sessions'
    `);

    if (tableCheck.rows.length > 0) {
      console.log('✅ sessionsテーブルは既に存在します');
      // カラムの確認
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'sessions'
      `);
      console.log(`   カラム数: ${columnCheck.rows.length}`);
      await client.end();
      return;
    }

    // sessionsテーブルを作成
    console.log('sessionsテーブルを作成中...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_token VARCHAR(255) PRIMARY KEY,
        admin_id INTEGER,
        customer_id INTEGER,
        tenant_id INTEGER, -- NULL許可（スーパー管理者の場合）
        username VARCHAR(100),
        email VARCHAR(255),
        role VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
      )
    `);

    // インデックスを作成
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_admin_id ON sessions(admin_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_customer_id ON sessions(customer_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_tenant_id ON sessions(tenant_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)
    `);

    console.log('✅ sessionsテーブルを作成しました');
    console.log('✅ インデックスを作成しました');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrateSessionsTable();

