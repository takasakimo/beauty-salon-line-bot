require('dotenv').config();
const { Client } = require('pg');

async function initDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('データベースに接続しました');

    // 顧客テーブル作成
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        line_user_id VARCHAR(255) PRIMARY KEY,
        line_display_name VARCHAR(255),
        real_name VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20),
        address TEXT,
        birthday DATE,
        allergy_info TEXT,
        preferences TEXT,
        registered_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('customersテーブルを作成しました');

    // スタッフテーブル作成
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff (
        staff_id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone_number VARCHAR(20),
        working_hours TEXT,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('staffテーブルを作成しました');

    // メニューテーブル作成
    await client.query(`
      CREATE TABLE IF NOT EXISTS menus (
        menu_id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price INTEGER NOT NULL,
        duration INTEGER NOT NULL,
        description TEXT,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('menusテーブルを作成しました');

    // 予約テーブル作成
    await client.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        reservation_id SERIAL PRIMARY KEY,
        customer_id VARCHAR(255) REFERENCES customers(line_user_id),
        staff_id INTEGER REFERENCES staff(staff_id),
        menu_id INTEGER REFERENCES menus(menu_id),
        reservation_date TIMESTAMP NOT NULL,
        status VARCHAR(50) DEFAULT 'confirmed',
        notes TEXT,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('reservationsテーブルを作成しました');

    // 施術履歴テーブル作成
    await client.query(`
      CREATE TABLE IF NOT EXISTS treatment_history (
        history_id SERIAL PRIMARY KEY,
        customer_id VARCHAR(255) REFERENCES customers(line_user_id),
        staff_id INTEGER REFERENCES staff(staff_id),
        treatment_date TIMESTAMP NOT NULL,
        menu_used VARCHAR(255),
        products_used TEXT,
        staff_memo TEXT,
        photos_url TEXT,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('treatment_historyテーブルを作成しました');

    console.log('全てのテーブルが正常に作成されました！');

  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    await client.end();
  }
}

initDatabase();