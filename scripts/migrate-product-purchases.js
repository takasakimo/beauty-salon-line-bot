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

    // product_purchasesテーブルを作成
    console.log('Creating product_purchases table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_purchases (
        purchase_id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        customer_id INTEGER NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
        product_name VARCHAR(255) NOT NULL,
        product_category VARCHAR(100),
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price INTEGER NOT NULL,
        total_price INTEGER NOT NULL,
        purchase_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        staff_id INTEGER REFERENCES staff(staff_id) ON DELETE SET NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // インデックスを作成
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_product_purchases_tenant_id ON product_purchases(tenant_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_product_purchases_customer_id ON product_purchases(customer_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_product_purchases_purchase_date ON product_purchases(purchase_date)
    `);

    console.log('✅ product_purchasesテーブルを作成しました');
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

