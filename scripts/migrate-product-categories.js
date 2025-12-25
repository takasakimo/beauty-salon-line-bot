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

    // product_categoriesテーブルを作成
    console.log('Creating product_categories table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_categories (
        category_id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        category_name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, category_name)
      )
    `);

    // インデックスを作成
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_product_categories_tenant_id ON product_categories(tenant_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_product_categories_is_active ON product_categories(is_active)
    `);

    console.log('✅ product_categoriesテーブルを作成しました');
    console.log('✅ インデックスを作成しました');

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

