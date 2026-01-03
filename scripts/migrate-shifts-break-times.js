require('dotenv').config();
const { Client } = require('pg');

async function migrateShiftsBreakTimes() {
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

    // break_timesカラムが存在するかチェック
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'staff_shifts' AND column_name = 'break_times'
    `);

    if (columnCheck.rows.length === 0) {
      console.log('break_timesカラムを追加中...');
      await client.query(`
        ALTER TABLE staff_shifts 
        ADD COLUMN break_times JSONB DEFAULT '[]'::jsonb
      `);
      console.log('✅ break_timesカラムを追加しました');
    } else {
      console.log('✅ break_timesカラムは既に存在します');
    }

    console.log('マイグレーションが完了しました！');
  } catch (error) {
    console.error('マイグレーションエラー:', error);
    throw error;
  } finally {
    await client.end();
  }
}

migrateShiftsBreakTimes()
  .then(() => {
    console.log('✅ マイグレーションが正常に完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ マイグレーションが失敗しました:', error);
    process.exit(1);
  });

