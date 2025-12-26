require('dotenv').config();
const { Pool } = require('pg');

// 接続文字列を取得
let connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;

// SSL設定の調整（sslmodeパラメータを削除）
if (connectionString) {
  try {
    const url = new URL(connectionString);
    url.searchParams.delete('sslmode');
    url.searchParams.delete('supa');
    connectionString = url.toString();
  } catch (e) {
    // URL解析に失敗した場合はそのまま使用
  }
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: (process.env.DATABASE_URL || process.env.POSTGRES_URL) ? {
    rejectUnauthorized: false
  } : false
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // menu_categoriesテーブルを作成
    console.log('Creating menu_categories table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS menu_categories (
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
      CREATE INDEX IF NOT EXISTS idx_menu_categories_tenant_id ON menu_categories(tenant_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_menu_categories_is_active ON menu_categories(is_active)
    `);

    console.log('✅ menu_categoriesテーブルを作成しました');
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

