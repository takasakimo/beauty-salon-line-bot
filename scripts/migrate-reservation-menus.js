// 予約とメニューの関連テーブル作成用のマイグレーション
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

    console.log('reservation_menusテーブルを作成中...');
    
    // テーブルが存在するかチェック
    const checkResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'reservation_menus'
    `);

    if (checkResult.rows.length === 0) {
      await client.query(`
        CREATE TABLE reservation_menus (
          reservation_menu_id SERIAL PRIMARY KEY,
          reservation_id INTEGER NOT NULL REFERENCES reservations(reservation_id) ON DELETE CASCADE,
          menu_id INTEGER NOT NULL REFERENCES menus(menu_id) ON DELETE CASCADE,
          tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
          price INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(reservation_id, menu_id)
        )
      `);
      
      // インデックスを作成
      await client.query(`
        CREATE INDEX idx_reservation_menus_reservation_id ON reservation_menus(reservation_id)
      `);
      await client.query(`
        CREATE INDEX idx_reservation_menus_menu_id ON reservation_menus(menu_id)
      `);
      await client.query(`
        CREATE INDEX idx_reservation_menus_tenant_id ON reservation_menus(tenant_id)
      `);
      
      console.log('✅ reservation_menusテーブルを作成しました');
      
      // 既存の予約データを移行（menu_idが存在する場合）
      console.log('既存の予約データを移行中...');
      const existingReservations = await client.query(`
        SELECT reservation_id, menu_id, price, tenant_id
        FROM reservations
        WHERE menu_id IS NOT NULL
      `);
      
      if (existingReservations.rows.length > 0) {
        for (const reservation of existingReservations.rows) {
          try {
            await client.query(`
              INSERT INTO reservation_menus (reservation_id, menu_id, tenant_id, price)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (reservation_id, menu_id) DO NOTHING
            `, [
              reservation.reservation_id,
              reservation.menu_id,
              reservation.tenant_id,
              reservation.price || 0
            ]);
          } catch (error) {
            console.error(`予約ID ${reservation.reservation_id} の移行エラー:`, error.message);
          }
        }
        console.log(`✅ ${existingReservations.rows.length}件の予約データを移行しました`);
      }
    } else {
      console.log('ℹ️  reservation_menusテーブルは既に存在します');
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

