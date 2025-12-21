// customersテーブルをWebアプリ用に更新するマイグレーションスクリプト
require('dotenv').config();
const { Client } = require('pg');

async function migrateCustomersTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('データベースに接続しました');

    // customer_idカラムの追加（存在しない場合）
    try {
      await client.query(`
        ALTER TABLE customers 
        ADD COLUMN IF NOT EXISTS customer_id SERIAL;
      `);
      console.log('✅ customer_idカラムを追加しました');
    } catch (err) {
      console.log('  ⏭️  customer_idカラムは既に存在するか、エラー:', err.message);
    }

    // customer_idを主キーに設定（まだ主キーでない場合）
    try {
      // 既存の主キー制約を確認
      const pkCheck = await client.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'customers' 
        AND constraint_type = 'PRIMARY KEY'
      `);

      if (pkCheck.rows.length > 0) {
        // 既存の主キーがline_user_idの場合、削除してcustomer_idに変更
        if (pkCheck.rows[0].constraint_name.includes('line_user_id')) {
          await client.query(`
            ALTER TABLE customers 
            DROP CONSTRAINT customers_pkey;
          `);
          console.log('✅ 既存の主キー制約を削除しました');
        }
      }

      // customer_idを主キーに設定
      await client.query(`
        ALTER TABLE customers 
        ADD PRIMARY KEY (customer_id);
      `);
      console.log('✅ customer_idを主キーに設定しました');
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('duplicate')) {
        console.log('  ⏭️  customer_idは既に主キーです');
      } else {
        console.log('  ⚠️  主キー設定エラー:', err.message);
      }
    }

    // emailカラムの追加（存在しない場合）
    try {
      await client.query(`
        ALTER TABLE customers 
        ADD COLUMN IF NOT EXISTS email VARCHAR(255);
      `);
      console.log('✅ emailカラムを追加しました');
    } catch (err) {
      console.log('  ⏭️  emailカラムは既に存在するか、エラー:', err.message);
    }

    // line_user_idをUNIQUE制約に変更（まだでない場合）
    try {
      await client.query(`
        ALTER TABLE customers 
        ADD CONSTRAINT customers_line_user_id_unique UNIQUE (line_user_id);
      `);
      console.log('✅ line_user_idにUNIQUE制約を追加しました');
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('duplicate')) {
        console.log('  ⏭️  line_user_idのUNIQUE制約は既に存在します');
      } else {
        console.log('  ⚠️  UNIQUE制約追加エラー:', err.message);
      }
    }

    console.log('✅ マイグレーション完了！');

  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    await client.end();
  }
}

migrateCustomersTable();

