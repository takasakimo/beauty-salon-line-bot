require('dotenv').config();
const { Client } = require('pg');

async function migrateStaffShifts() {
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

    // staff_shiftsテーブルを作成
    console.log('staff_shiftsテーブルを作成中...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff_shifts (
        shift_id SERIAL PRIMARY KEY,
        staff_id INTEGER NOT NULL,
        tenant_id INTEGER NOT NULL,
        shift_date DATE NOT NULL,
        start_time TIME,
        end_time TIME,
        is_off BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(staff_id, tenant_id, shift_date),
        FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE,
        FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
      );
    `);
    console.log('✅ staff_shiftsテーブルを作成しました');
    
    // インデックスを作成
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_staff_shifts_staff_date 
      ON staff_shifts(staff_id, shift_date);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_staff_shifts_tenant_date 
      ON staff_shifts(tenant_id, shift_date);
    `);
    console.log('✅ インデックスを作成しました');

    console.log('マイグレーションが完了しました！');
  } catch (error) {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrateStaffShifts();

