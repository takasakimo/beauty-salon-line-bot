require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

// SSL設定の調整（sslmodeパラメータを削除）
if (pool.options.connectionString) {
  const url = new URL(pool.options.connectionString);
  url.searchParams.delete('sslmode');
  url.searchParams.delete('supa');
  pool.options.connectionString = url.toString();
}

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // reservationsテーブルにコメント欄を追加
    console.log('Adding note columns to reservations table...');
    
    // note1, note2, note3カラムを追加（既に存在する場合はスキップ）
    const columns = ['note1', 'note2', 'note3'];
    for (const column of columns) {
      try {
        await client.query(`
          ALTER TABLE reservations 
          ADD COLUMN IF NOT EXISTS ${column} TEXT
        `);
        console.log(`✓ Added column: ${column}`);
      } catch (error) {
        if (error.code === '42701') {
          console.log(`  Column ${column} already exists, skipping...`);
        } else {
          throw error;
        }
      }
    }

    await client.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);

