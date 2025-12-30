require('dotenv').config();
const { Client } = require('pg');

async function migrateStaffImageUrl() {
  // 環境変数の優先順位: POSTGRES_URL > POSTGRES_URL_NON_POOLING > DATABASE_URL
  const databaseUrl = process.env.POSTGRES_URL || 
                      process.env.POSTGRES_URL_NON_POOLING ||
                      process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('データベース接続URLが見つかりません。環境変数を確認してください。');
    process.exit(1);
  }
  
  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') ? false : {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('データベースに接続しました');

    // staffテーブルにimage_urlカラムを追加（Base64データURIを保存するためTEXT型）
    console.log('staffテーブルにimage_urlカラムを追加中...');
    await client.query(`
      ALTER TABLE staff 
      ADD COLUMN IF NOT EXISTS image_url TEXT;
    `);
    console.log('✅ staffテーブルにimage_urlカラムを追加しました');
    
    // 既存のVARCHAR(500)カラムをTEXT型に変更（存在する場合）
    try {
      await client.query(`
        ALTER TABLE staff 
        ALTER COLUMN image_url TYPE TEXT;
      `);
      console.log('✅ image_urlカラムをTEXT型に変更しました');
    } catch (error) {
      // カラムが存在しない、または既にTEXT型の場合は無視
      if (error.message && !error.message.includes('does not exist') && !error.message.includes('already')) {
        console.warn('image_urlカラムの型変更エラー（無視）:', error.message);
      }
    }

    console.log('マイグレーションが完了しました！');
  } catch (error) {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrateStaffImageUrl();

