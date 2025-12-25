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

    console.log('Adding inventory management columns to products table...');
    
    // productsテーブルに在庫管理用のカラムを追加
    const columns = [
      { name: 'manufacturer', type: 'VARCHAR(255)' },
      { name: 'jan_code', type: 'VARCHAR(50)' },
      { name: 'stock_quantity', type: 'INTEGER DEFAULT 0' }
    ];
    
    for (const column of columns) {
      try {
        await client.query(`
          ALTER TABLE products 
          ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}
        `);
        console.log(`✓ Added column: ${column.name}`);
      } catch (error) {
        if (error.code === '42701') {
          console.log(`  Column ${column.name} already exists, skipping...`);
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

