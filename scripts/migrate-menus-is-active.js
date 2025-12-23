// menusテーブルにis_activeカラムを追加するマイグレーション
require('dotenv').config({ path: '.env.local' });
if (require('fs').existsSync('.env')) {
  require('dotenv').config({ path: '.env' });
}
const { Client } = require('pg');

async function migrateMenusIsActive() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  
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

    // is_activeカラムが存在するか確認
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'menus' AND column_name = 'is_active'
    `);

    if (columnCheck.rows.length > 0) {
      console.log('✅ is_activeカラムは既に存在します');
      await client.end();
      return;
    }

    // is_activeカラムを追加
    console.log('is_activeカラムを追加中...');
    await client.query(`
      ALTER TABLE menus 
      ADD COLUMN is_active BOOLEAN DEFAULT true
    `);

    // 既存のメニューをすべて有効にする
    await client.query(`
      UPDATE menus 
      SET is_active = true 
      WHERE is_active IS NULL
    `);

    console.log('✅ is_activeカラムを追加しました');
    console.log('✅ 既存のメニューをすべて有効に設定しました');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrateMenusIsActive();

