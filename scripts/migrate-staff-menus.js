// スタッフとメニューの関連テーブル作成用のマイグレーション
require('dotenv').config({ path: '.env.local' });
if (require('fs').existsSync('.env.vercel')) {
  require('dotenv').config({ path: '.env.vercel' });
}
if (require('fs').existsSync('.env')) {
  require('dotenv').config({ path: '.env' });
}

const { Client } = require('pg');

async function migrate() {
  const databaseUrl = process.env.POSTGRES_URL || 
                      process.env.POSTGRES_URL_NON_POOLING ||
                      process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ データベース接続URLが見つかりません');
    process.exit(1);
  }

  // postgres://をpostgresql://に変換
  let cleanUrl = databaseUrl;
  if (cleanUrl.startsWith('postgres://')) {
    cleanUrl = cleanUrl.replace('postgres://', 'postgresql://');
  }

  // SSL設定
  const sslConfig = {
    rejectUnauthorized: false
  };

  const client = new Client({
    connectionString: cleanUrl,
    ssl: sslConfig
  });

  try {
    await client.connect();
    console.log('✅ データベースに接続しました\n');

    console.log('staff_menusテーブルを作成中...');
    
    // テーブルが存在するかチェック
    const checkResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'staff_menus'
    `);

    if (checkResult.rows.length === 0) {
      await client.query(`
        CREATE TABLE staff_menus (
          staff_menu_id SERIAL PRIMARY KEY,
          staff_id INTEGER NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
          menu_id INTEGER NOT NULL REFERENCES menus(menu_id) ON DELETE CASCADE,
          tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(staff_id, menu_id)
        )
      `);
      
      // インデックスを作成
      await client.query(`
        CREATE INDEX idx_staff_menus_staff_id ON staff_menus(staff_id)
      `);
      await client.query(`
        CREATE INDEX idx_staff_menus_menu_id ON staff_menus(menu_id)
      `);
      await client.query(`
        CREATE INDEX idx_staff_menus_tenant_id ON staff_menus(tenant_id)
      `);
      
      console.log('✅ staff_menusテーブルを作成しました');
    } else {
      console.log('ℹ️  staff_menusテーブルは既に存在します');
    }

    console.log('\n✅ マイグレーションが完了しました');
  } catch (error) {
    console.error('❌ マイグレーションエラー:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();

