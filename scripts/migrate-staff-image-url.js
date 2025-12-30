require('dotenv').config();
const { Client } = require('pg');

async function migrateStaffImageUrl() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('データベースに接続しました');

    // staffテーブルにimage_urlカラムを追加
    console.log('staffテーブルにimage_urlカラムを追加中...');
    await client.query(`
      ALTER TABLE staff 
      ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
    `);
    console.log('✅ staffテーブルにimage_urlカラムを追加しました');

    console.log('マイグレーションが完了しました！');
  } catch (error) {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrateStaffImageUrl();

