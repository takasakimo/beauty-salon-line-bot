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

// ランダムな整数を生成（min以上max以下）
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 配列からランダムに要素を選択
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// 日付を文字列に変換（YYYY-MM-DD形式）
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function generateDemoShifts() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('デモシフトデータの生成を開始します...');
    
    // デモテナントを取得（beauty-salon-001）
    const tenantResult = await client.query(
      `SELECT tenant_id, tenant_code
       FROM tenants 
       WHERE tenant_code = 'beauty-salon-001' AND is_active = true`
    );
    
    if (tenantResult.rows.length === 0) {
      throw new Error('デモテナント（beauty-salon-001）が見つかりません');
    }
    
    const tenant = tenantResult.rows[0];
    const tenantId = tenant.tenant_id;
    
    console.log('テナント情報:', {
      tenantId,
      tenantCode: tenant.tenant_code
    });
    
    // スタッフを取得
    const staffResult = await client.query(
      `SELECT staff_id, name, working_hours 
       FROM staff 
       WHERE tenant_id = $1 
       ORDER BY staff_id`,
      [tenantId]
    );
    
    if (staffResult.rows.length === 0) {
      throw new Error('スタッフデータが見つかりません');
    }
    
    const staff = staffResult.rows;
    console.log(`スタッフ数: ${staff.length}名`);
    
    // 既存のシフトを取得（重複チェック用）
    const existingShiftsResult = await client.query(
      `SELECT shift_date, staff_id 
       FROM staff_shifts 
       WHERE tenant_id = $1 
       AND shift_date >= CURRENT_DATE 
       ORDER BY shift_date, staff_id`,
      [tenantId]
    );
    
    // シフトを日付とスタッフIDで管理（重複チェック用）
    const shiftMap = new Map();
    existingShiftsResult.rows.forEach(row => {
      const dateKey = row.shift_date.toISOString().split('T')[0];
      const shiftKey = `${dateKey}_${row.staff_id}`;
      shiftMap.set(shiftKey, true);
    });
    
    console.log(`既存のシフト数: ${existingShiftsResult.rows.length}件`);
    
    // 今日から30日間のシフトを生成
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 30);
    
    let generatedCount = 0;
    const shiftsToInsert = [];
    
    // 各日付に対してシフトを生成
    for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
      const currentDate = new Date(d);
      const dayOfWeek = currentDate.getDay(); // 0=日曜日, 6=土曜日
      const dateKey = formatDate(currentDate);
      
      // 各スタッフに対してシフトを生成
      for (const staffMember of staff) {
        const shiftKey = `${dateKey}_${staffMember.staff_id}`;
        
        // 既存のシフトがある場合はスキップ
        if (shiftMap.has(shiftKey)) {
          continue;
        }
        
        // 日曜日は休みの確率を高くする（30%の確率で出勤）
        if (dayOfWeek === 0 && Math.random() > 0.3) {
          // 休み
          shiftsToInsert.push({
            tenant_id: tenantId,
            staff_id: staffMember.staff_id,
            shift_date: dateKey,
            start_time: null,
            end_time: null,
            is_off: true,
            break_times: null
          });
          generatedCount++;
          continue;
        }
        
        // スタッフの勤務時間を取得
        let startTime = '10:00';
        let endTime = '19:00';
        
        if (staffMember.working_hours) {
          const workingHoursMatch = staffMember.working_hours.match(/(\d{2}):(\d{2})-(\d{2}):(\d{2})/);
          if (workingHoursMatch) {
            startTime = `${workingHoursMatch[1]}:${workingHoursMatch[2]}`;
            endTime = `${workingHoursMatch[3]}:${workingHoursMatch[4]}`;
          }
        }
        
        // ランダムにシフト時間を変更（±1時間の範囲）
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        
        const startHourVariation = randomInt(-1, 1);
        const endHourVariation = randomInt(-1, 1);
        
        const actualStartHour = Math.max(9, Math.min(11, startHour + startHourVariation));
        const actualEndHour = Math.max(18, Math.min(21, endHour + endHourVariation));
        
        const actualStartTime = `${String(actualStartHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
        const actualEndTime = `${String(actualEndHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
        
        // 休憩時間を生成（12:00-13:00または13:00-14:00）
        const breakStartHour = randomInt(12, 13);
        const breakEndHour = breakStartHour + 1;
        const breakTimes = [{
          start: `${String(breakStartHour).padStart(2, '0')}:00`,
          end: `${String(breakEndHour).padStart(2, '0')}:00`
        }];
        
        shiftsToInsert.push({
          tenant_id: tenantId,
          staff_id: staffMember.staff_id,
          shift_date: dateKey,
          start_time: actualStartTime,
          end_time: actualEndTime,
          is_off: false,
          break_times: JSON.stringify(breakTimes)
        });
        
        generatedCount++;
      }
    }
    
    console.log(`\n生成されたシフト数: ${generatedCount}件`);
    
    // シフトを一括挿入
    if (shiftsToInsert.length > 0) {
      console.log('シフトデータをデータベースに挿入中...');
      
      for (const shift of shiftsToInsert) {
        // break_timesカラムが存在するかチェック
        let hasBreakTimes = false;
        try {
          const columnCheck = await client.query(
            `SELECT column_name 
             FROM information_schema.columns 
             WHERE table_name = 'staff_shifts' AND column_name = 'break_times'`
          );
          hasBreakTimes = columnCheck.rows.length > 0;
        } catch (checkError) {
          console.warn('break_timesカラムのチェックエラー:', checkError);
        }
        
        if (hasBreakTimes) {
          await client.query(
            `INSERT INTO staff_shifts (
              tenant_id, 
              staff_id, 
              shift_date, 
              start_time, 
              end_time, 
              is_off,
              break_times,
              created_at,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (staff_id, tenant_id, shift_date) 
            DO UPDATE SET
              start_time = EXCLUDED.start_time,
              end_time = EXCLUDED.end_time,
              is_off = EXCLUDED.is_off,
              break_times = EXCLUDED.break_times,
              updated_at = CURRENT_TIMESTAMP
            RETURNING shift_id`,
            [
              shift.tenant_id,
              shift.staff_id,
              shift.shift_date,
              shift.start_time,
              shift.end_time,
              shift.is_off,
              shift.break_times
            ]
          );
        } else {
          await client.query(
            `INSERT INTO staff_shifts (
              tenant_id, 
              staff_id, 
              shift_date, 
              start_time, 
              end_time, 
              is_off,
              created_at,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (staff_id, tenant_id, shift_date) 
            DO UPDATE SET
              start_time = EXCLUDED.start_time,
              end_time = EXCLUDED.end_time,
              is_off = EXCLUDED.is_off,
              updated_at = CURRENT_TIMESTAMP
            RETURNING shift_id`,
            [
              shift.tenant_id,
              shift.staff_id,
              shift.shift_date,
              shift.start_time,
              shift.end_time,
              shift.is_off
            ]
          );
        }
      }
      
      console.log(`✅ ${shiftsToInsert.length}件のシフトを追加しました`);
    } else {
      console.log('追加するシフトがありませんでした');
    }
    
    await client.query('COMMIT');
    console.log('\n✅ デモシフトデータの生成が完了しました！');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('エラーが発生しました:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 実行
generateDemoShifts()
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


