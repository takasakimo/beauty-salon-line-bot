// 環境変数の読み込み順序:
// 1. .env.local（Vercel CLIで取得した場合）
// 2. .env（ローカル開発用、オプション）
if (require('fs').existsSync('.env.local')) {
  require('dotenv').config({ path: '.env.local' });
}
if (require('fs').existsSync('.env')) {
  require('dotenv').config({ path: '.env' });
}

const { Pool } = require('pg');

// データベース接続URLを取得（優先順位: POSTGRES_URL > POSTGRES_URL_NON_POOLING > DATABASE_URL）
let databaseUrl = process.env.POSTGRES_URL || 
                  process.env.POSTGRES_URL_NON_POOLING ||
                  process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ エラー: データベース接続URLが見つかりません');
  console.log('以下の環境変数のいずれかが設定されている必要があります:');
  console.log('  - POSTGRES_URL');
  console.log('  - POSTGRES_URL_NON_POOLING');
  console.log('  - DATABASE_URL');
  process.exit(1);
}

// postgres://をpostgresql://に変換
if (databaseUrl.startsWith('postgres://')) {
  databaseUrl = databaseUrl.replace('postgres://', 'postgresql://');
}

// 接続URLのSSL設定を確認・修正
const urlObj = new URL(databaseUrl);
urlObj.searchParams.delete('sslmode');
urlObj.searchParams.delete('supa');
const cleanDatabaseUrl = urlObj.toString();

// データベース接続設定
const pool = new Pool({
  connectionString: cleanDatabaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function deleteDemoReservations() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('デモ予約データの削除を開始します...');
    
    // デモテナントを取得（beauty-salon-001）
    const tenantResult = await client.query(
      `SELECT tenant_id, tenant_code
       FROM tenants 
       WHERE tenant_code = 'beauty-salon-001' AND is_active = true`
    );
    
    if (tenantResult.rows.length === 0) {
      console.log('⚠️  デモテナント（beauty-salon-001）が見つかりません');
      await client.query('COMMIT');
      return;
    }
    
    const tenantId = tenantResult.rows[0].tenant_id;
    console.log(`テナントID: ${tenantId}`);
    
    // 削除前の予約数を確認
    const countResult = await client.query(
      `SELECT COUNT(*) as count
       FROM reservations 
       WHERE tenant_id = $1`,
      [tenantId]
    );
    
    const countBefore = parseInt(countResult.rows[0].count);
    console.log(`削除前の予約数: ${countBefore}件`);
    
    if (countBefore === 0) {
      console.log('削除する予約がありませんでした');
      await client.query('COMMIT');
      return;
    }
    
    // 確認メッセージ
    console.log(`\n⚠️  警告: デモテナント（beauty-salon-001）の予約データ ${countBefore}件 を削除します。`);
    console.log('続行するには、このスクリプトを実行してください。');
    
    // 予約を削除（reservation_menusも自動的に削除されるはず）
    const deleteResult = await client.query(
      `DELETE FROM reservations 
       WHERE tenant_id = $1
       RETURNING reservation_id`,
      [tenantId]
    );
    
    const deletedCount = deleteResult.rows.length;
    
    // reservation_menusテーブルからも削除（念のため）
    await client.query(
      `DELETE FROM reservation_menus 
       WHERE reservation_id IN (
         SELECT reservation_id FROM reservations WHERE tenant_id = $1
       )`,
      [tenantId]
    );
    
    await client.query('COMMIT');
    
    console.log(`\n✅ デモ予約データの削除が完了しました！`);
    console.log(`削除件数: ${deletedCount}件`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('エラーが発生しました:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 実行
deleteDemoReservations()
  .then(() => {
    console.log('処理が正常に完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('処理中にエラーが発生しました:', error);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });
