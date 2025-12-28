const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function addTemporaryClosedDays() {
  try {
    await client.connect();
    console.log('データベースに接続しました');

    // temporary_closed_daysカラムを追加
    console.log('temporary_closed_daysカラムを追加中...');
    await client.query(`
      ALTER TABLE tenants 
      ADD COLUMN IF NOT EXISTS temporary_closed_days TEXT;
    `);
    console.log('✅ temporary_closed_daysカラムを追加しました');

    // special_business_hoursカラムを追加
    console.log('special_business_hoursカラムを追加中...');
    await client.query(`
      ALTER TABLE tenants 
      ADD COLUMN IF NOT EXISTS special_business_hours TEXT;
    `);
    console.log('✅ special_business_hoursカラムを追加しました');

    console.log('✅ マイグレーションが完了しました');
  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    await client.end();
  }
}

addTemporaryClosedDays();

