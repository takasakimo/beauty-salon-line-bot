// データベースの状態を確認するスクリプト
require('dotenv').config({ path: '.env.local' });
if (require('fs').existsSync('.env')) {
  require('dotenv').config({ path: '.env' });
}
const { Client } = require('pg');

async function checkDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  
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

    // テーブル一覧を取得
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('📋 存在するテーブル:');
    if (tablesResult.rows.length === 0) {
      console.log('  (テーブルが存在しません)');
    } else {
      tablesResult.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
    }

    // customersテーブルの存在確認
    const customersExists = tablesResult.rows.some(row => row.table_name === 'customers');
    console.log(`\n${customersExists ? '✅' : '❌'} customersテーブル: ${customersExists ? '存在します' : '存在しません'}`);

    if (customersExists) {
      // customersテーブルのカラムを確認
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'customers'
        ORDER BY ordinal_position;
      `);
      
      console.log('\n📊 customersテーブルのカラム:');
      columnsResult.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? '[NULL可]' : '[NOT NULL]'}`);
      });

      // password_hashカラムの存在確認
      const passwordHashExists = columnsResult.rows.some(col => col.column_name === 'password_hash');
      console.log(`\n${passwordHashExists ? '✅' : '❌'} password_hashカラム: ${passwordHashExists ? '存在します' : '存在しません'}`);
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
  } finally {
    await client.end();
  }
}

checkDatabase();



