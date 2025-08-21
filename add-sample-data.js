const { Client } = require('pg');
require('dotenv').config();

// データベース接続設定
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addSampleData() {
  try {
    // データベースに接続
    await client.connect();
    console.log('データベースに接続しました');

    // スタッフデータを追加
    const staffData = [
      { name: '田中 美香', email: 'tanaka@salon.com', working_hours: '10:00-19:00' },
      { name: '佐藤 雅子', email: 'sato@salon.com', working_hours: '9:00-18:00' },
      { name: '山田 花子', email: 'yamada@salon.com', working_hours: '11:00-20:00' }
    ];

    for (const staff of staffData) {
      // 既存チェック
      const existing = await client.query(
        'SELECT staff_id FROM staff WHERE name = $1',
        [staff.name]
      );

      if (existing.rows.length === 0) {
        await client.query(
          'INSERT INTO staff (name, email, working_hours) VALUES ($1, $2, $3)',
          [staff.name, staff.email, staff.working_hours]
        );
        console.log(`スタッフ追加: ${staff.name}`);
      } else {
        console.log(`スタッフ既存: ${staff.name}`);
      }
    }

    // メニューデータを追加
    const menuData = [
      { name: 'カット', price: 4000, duration: 60 },
      { name: 'カット + シャンプー', price: 5000, duration: 90 },
      { name: 'カラー', price: 8000, duration: 120 },
      { name: 'パーマ', price: 10000, duration: 150 },
      { name: 'カット + カラー', price: 11000, duration: 180 },
      { name: 'カット + パーマ', price: 13000, duration: 210 },
      { name: 'トリートメント', price: 3000, duration: 45 },
      { name: 'ヘッドスパ', price: 4500, duration: 60 }
    ];

    for (const menu of menuData) {
      // 既存チェック
      const existing = await client.query(
        'SELECT menu_id FROM menus WHERE name = $1',
        [menu.name]
      );

      if (existing.rows.length === 0) {
        await client.query(
          'INSERT INTO menus (name, price, duration) VALUES ($1, $2, $3)',
          [menu.name, menu.price, menu.duration]
        );
        console.log(`メニュー追加: ${menu.name} - ¥${menu.price} (${menu.duration}分)`);
      } else {
        console.log(`メニュー既存: ${menu.name}`);
      }
    }

    console.log('\n✅ サンプルデータの追加が完了しました！');
    console.log('スタッフ: 3名');
    console.log('メニュー: 8種類');

  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    // データベース接続を閉じる
    await client.end();
    console.log('データベース接続を終了しました');
  }
}

// 実行
addSampleData();