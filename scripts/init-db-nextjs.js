// Next.jsアプリケーション用のデータベース初期化スクリプト
require('dotenv').config({ path: '.env.local' });
if (require('fs').existsSync('.env')) {
  require('dotenv').config({ path: '.env' });
}
const { Client } = require('pg');

async function initDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL環境変数が設定されていません');
    console.log('Vercelの環境変数を取得してください:');
    console.log('  vercel env pull .env.local --environment=production');
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

    // 1. テナント（美容室）テーブルの作成
    console.log('1. tenantsテーブルを作成中...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        tenant_id SERIAL PRIMARY KEY,
        tenant_code VARCHAR(50) UNIQUE NOT NULL,
        salon_name VARCHAR(255) NOT NULL,
        owner_name VARCHAR(100),
        email VARCHAR(255),
        phone_number VARCHAR(20),
        address VARCHAR(500),
        postal_code VARCHAR(10),
        business_hours TEXT,
        subscription_plan VARCHAR(50) DEFAULT 'basic',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ tenantsテーブルを作成しました');

    // 2. 管理者テーブルの作成
    console.log('2. tenant_adminsテーブルを作成中...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenant_admins (
        admin_id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        username VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100),
        email VARCHAR(255),
        role VARCHAR(50) DEFAULT 'admin',
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, username)
      );
    `);
    console.log('✅ tenant_adminsテーブルを作成しました');

    // 3. 顧客テーブルの作成（マルチテナント対応）
    console.log('3. customersテーブルを作成中...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        customer_id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        line_user_id VARCHAR(255),
        line_user_id_old VARCHAR(255),
        email VARCHAR(255),
        real_name VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20),
        password_hash VARCHAR(255),
        address TEXT,
        birthday DATE,
        allergy_info TEXT,
        preferences TEXT,
        registered_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ customersテーブルを作成しました');

    // 4. スタッフテーブルの作成
    console.log('4. staffテーブルを作成中...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff (
        staff_id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone_number VARCHAR(20),
        working_hours TEXT,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ staffテーブルを作成しました');

    // 5. メニューテーブルの作成
    console.log('5. menusテーブルを作成中...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS menus (
        menu_id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        price INTEGER NOT NULL,
        duration INTEGER NOT NULL,
        description TEXT,
        category VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ menusテーブルを作成しました');
    
    // 5-1. is_activeカラムが存在しない場合は追加（既存テーブル用）
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'menus' AND column_name = 'is_active'
    `);
    if (columnCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE menus 
        ADD COLUMN is_active BOOLEAN DEFAULT true
      `);
      console.log('✅ is_activeカラムを追加しました');
    }

    // 6. 予約テーブルの作成
    console.log('6. reservationsテーブルを作成中...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        reservation_id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        customer_id INTEGER REFERENCES customers(customer_id) ON DELETE SET NULL,
        staff_id INTEGER REFERENCES staff(staff_id) ON DELETE SET NULL,
        menu_id INTEGER REFERENCES menus(menu_id) ON DELETE SET NULL,
        reservation_date TIMESTAMP NOT NULL,
        status VARCHAR(50) DEFAULT 'confirmed',
        price INTEGER,
        notes TEXT,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ reservationsテーブルを作成しました');

    // 7. デフォルトテナントの作成
    console.log('7. デフォルトテナントを作成中...');
    const tenantResult = await client.query(`
      SELECT tenant_id FROM tenants WHERE tenant_code = 'beauty-salon-001'
    `);
    
    if (tenantResult.rows.length === 0) {
      await client.query(`
        INSERT INTO tenants (tenant_code, salon_name, is_active)
        VALUES ('beauty-salon-001', 'デフォルト美容室', true)
        RETURNING tenant_id
      `);
      console.log('✅ デフォルトテナントを作成しました');
    } else {
      console.log('✅ デフォルトテナントは既に存在します');
    }

    console.log('\n✅ データベースの初期化が完了しました！');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

initDatabase();

