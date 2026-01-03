// Vercel環境でマイグレーションを実行するスクリプト
// 使用方法: vercel env pull .env.local && node scripts/migrate-customer-password-vercel.js
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function migrateCustomerPassword() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ エラー: DATABASE_URL環境変数が設定されていません');
    console.log('');
    console.log('Vercelの環境変数を取得してください:');
    console.log('  vercel env pull .env.local');
    console.log('');
    process.exit(1);
  }

  console.log('データベースに接続中...');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ データベースに接続しました');

    // password_hashカラムの追加（存在しない場合）
    try {
      await client.query(`
        ALTER TABLE customers 
        ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
      `);
      console.log('✅ password_hashカラムを追加しました');
    } catch (err) {
      console.log('  ⏭️  password_hashカラムは既に存在するか、エラー:', err.message);
    }

    console.log('✅ マイグレーション完了！');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    if (error.code === '28P01') {
      console.log('');
      console.log('パスワード認証エラーが発生しました。');
      console.log('Vercelの環境変数が正しく取得できているか確認してください:');
      console.log('  vercel env pull .env.local');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrateCustomerPassword();



