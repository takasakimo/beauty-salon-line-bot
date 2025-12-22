// 顧客テーブルにパスワードフィールドを追加するマイグレーションスクリプト
// 環境変数の読み込み順序:
// 1. システム環境変数（Vercelなどで設定済み）
// 2. .env.local（Vercel CLIで取得した場合）
// 3. .env（ローカル開発用、オプション）
if (require('fs').existsSync('.env.local')) {
  require('dotenv').config({ path: '.env.local' });
}
if (require('fs').existsSync('.env')) {
  require('dotenv').config({ path: '.env' });
}
const { Client } = require('pg');

async function migrateCustomerPassword() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ エラー: DATABASE_URL環境変数が設定されていません');
    console.log('');
    console.log('以下のいずれかの方法でDATABASE_URLを設定してください:');
    console.log('1. 環境変数として設定:');
    console.log('   export DATABASE_URL="postgresql://user:password@host:port/database"');
    console.log('   npm run db:migrate-password');
    console.log('');
    console.log('2. コマンドラインで直接指定:');
    console.log('   DATABASE_URL="postgresql://user:password@host:port/database" npm run db:migrate-password');
    console.log('');
    console.log('3. .envファイルに設定:');
    console.log('   echo \'DATABASE_URL=postgresql://user:password@host:port/database\' >> .env');
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
    console.error('エラーが発生しました:', error);
  } finally {
    await client.end();
  }
}

migrateCustomerPassword();

