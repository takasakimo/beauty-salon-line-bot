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

// 時間を分単位に変換
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// 分を時間文字列に変換
function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

// 日付を文字列に変換（YYYY-MM-DD HH:mm:ss形式）
function formatDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

async function fixDemoReservationTimes() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('デモ予約データの時間修正を開始します...');
    
    // デモテナントを取得（beauty-salon-001）
    const tenantResult = await client.query(
      `SELECT tenant_id, tenant_code
       FROM tenants 
       WHERE tenant_code = 'beauty-salon-001' AND is_active = true`
    );
    
    if (tenantResult.rows.length === 0) {
      throw new Error('デモテナント（beauty-salon-001）が見つかりません');
    }
    
    const tenantId = tenantResult.rows[0].tenant_id;
    console.log(`テナントID: ${tenantId}`);
    
    // 営業時間（10:00-20:00）
    const openMinutes = timeToMinutes('10:00');
    const closeMinutes = timeToMinutes('20:00');
    
    // 未来の予約を取得
    const reservationsResult = await client.query(
      `SELECT r.reservation_id, r.reservation_date, m.duration
       FROM reservations r
       LEFT JOIN menus m ON r.menu_id = m.menu_id
       WHERE r.tenant_id = $1 
       AND r.reservation_date >= CURRENT_DATE
       AND r.status = 'confirmed'
       ORDER BY r.reservation_date`,
      [tenantId]
    );
    
    console.log(`対象予約数: ${reservationsResult.rows.length}件`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    
    for (const reservation of reservationsResult.rows) {
      const reservationDate = new Date(reservation.reservation_date);
      const reservationMinutes = reservationDate.getHours() * 60 + reservationDate.getMinutes();
      const duration = reservation.duration || 60;
      const endMinutes = reservationMinutes + duration;
      
      // 営業時間外かチェック
      if (reservationMinutes < openMinutes || endMinutes > closeMinutes) {
        // 営業時間内に収まるように調整
        let newStartMinutes = reservationMinutes;
        
        // 開始時間が営業時間前の場合
        if (reservationMinutes < openMinutes) {
          newStartMinutes = openMinutes;
        }
        
        // 終了時間が営業時間後の場合
        if (endMinutes > closeMinutes) {
          newStartMinutes = closeMinutes - duration;
          // メニューの時間が長すぎて営業時間内に収まらない場合
          if (newStartMinutes < openMinutes) {
            newStartMinutes = openMinutes;
            // メニューの時間を短縮（実際にはメニュー時間は変更しないが、警告を出す）
            console.warn(`⚠️  予約ID ${reservation.reservation_id}: メニュー時間(${duration}分)が長すぎて営業時間内に収まりません。開始時間を10:00に設定します。`);
          }
        }
        
        // 15分単位に丸める
        newStartMinutes = Math.floor(newStartMinutes / 15) * 15;
        
        // 新しい予約時間を設定
        const newReservationDate = new Date(reservationDate);
        newReservationDate.setHours(Math.floor(newStartMinutes / 60), newStartMinutes % 60, 0, 0);
        
        // 予約時間を更新
        await client.query(
          `UPDATE reservations 
           SET reservation_date = $1::timestamp
           WHERE reservation_id = $2`,
          [formatDateTime(newReservationDate), reservation.reservation_id]
        );
        
        console.log(`✅ 予約ID ${reservation.reservation_id}: ${minutesToTime(reservationMinutes)} → ${minutesToTime(newStartMinutes)}`);
        fixedCount++;
      } else {
        skippedCount++;
      }
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ デモ予約データの時間修正が完了しました！');
    console.log(`修正件数: ${fixedCount}件`);
    console.log(`スキップ件数: ${skippedCount}件`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('エラーが発生しました:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 実行
fixDemoReservationTimes()
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

