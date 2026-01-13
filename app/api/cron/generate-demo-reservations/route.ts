import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Vercel Cron Jobsからのリクエストを検証
function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // CRON_SECRETが設定されている場合は検証
  if (cronSecret) {
    return authHeader === `Bearer ${cronSecret}`;
  }
  
  // CRON_SECRETが設定されていない場合は、VercelのCronヘッダーを確認
  const cronHeader = request.headers.get('x-vercel-cron');
  return cronHeader === '1';
}

// ランダムな整数を生成（min以上max以下）
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 配列からランダムに要素を選択
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// 日付を文字列に変換（YYYY-MM-DD HH:mm:ss形式）
function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 時間を分単位に変換
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export async function GET(request: NextRequest) {
  try {
    // Cronリクエストの検証
    if (!verifyCronRequest(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const pool = getPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log('デモ予約データの自動生成を開始します...');
      
      // デモテナントを取得（beauty-salon-001）
      const tenantResult = await client.query(
        `SELECT tenant_id, tenant_code, max_concurrent_reservations, business_hours, closed_days, temporary_closed_days
         FROM tenants 
         WHERE tenant_code = 'beauty-salon-001' AND is_active = true`
      );
      
      if (tenantResult.rows.length === 0) {
        throw new Error('デモテナント（beauty-salon-001）が見つかりません');
      }
      
      const tenant = tenantResult.rows[0];
      const tenantId = tenant.tenant_id;
      const maxConcurrent = tenant.max_concurrent_reservations || 3;
      
      // 営業時間をパース
      let businessHours: any = {};
      if (tenant.business_hours) {
        try {
          businessHours = typeof tenant.business_hours === 'string' 
            ? JSON.parse(tenant.business_hours) 
            : tenant.business_hours;
        } catch (e) {
          console.warn('営業時間のパースエラー、デフォルト値を使用:', e);
          businessHours = { default: { open: '10:00', close: '20:00' } };
        }
      } else {
        businessHours = { default: { open: '10:00', close: '20:00' } };
      }
      
      // 定休日をパース
      let closedDays: number[] = [];
      if (tenant.closed_days) {
        try {
          closedDays = typeof tenant.closed_days === 'string' 
            ? JSON.parse(tenant.closed_days) 
            : tenant.closed_days;
          if (!Array.isArray(closedDays)) {
            closedDays = [];
          }
        } catch (e) {
          console.warn('定休日のパースエラー:', e);
          closedDays = [];
        }
      }
      
      // 臨時休業日をパース
      let temporaryClosedDays: any[] = [];
      if (tenant.temporary_closed_days) {
        try {
          temporaryClosedDays = typeof tenant.temporary_closed_days === 'string' 
            ? JSON.parse(tenant.temporary_closed_days) 
            : tenant.temporary_closed_days;
          if (!Array.isArray(temporaryClosedDays)) {
            temporaryClosedDays = [];
          }
        } catch (e) {
          console.warn('臨時休業日のパースエラー:', e);
          temporaryClosedDays = [];
        }
      }
      
      // 顧客を取得
      const customersResult = await client.query(
        `SELECT customer_id, real_name, email, phone_number 
         FROM customers 
         WHERE tenant_id = $1 
         ORDER BY customer_id`,
        [tenantId]
      );
      
      if (customersResult.rows.length === 0) {
        throw new Error('顧客データが見つかりません');
      }
      
      const customers = customersResult.rows;
      
      // メニューを取得
      const menusResult = await client.query(
        `SELECT menu_id, name, price, duration 
         FROM menus 
         WHERE tenant_id = $1 AND is_active = true 
         ORDER BY menu_id`,
        [tenantId]
      );
      
      if (menusResult.rows.length === 0) {
        throw new Error('メニューデータが見つかりません');
      }
      
      const menus = menusResult.rows;
      
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
      
      // 既存の予約を取得（未来の予約のみ）
      const existingReservationsResult = await client.query(
        `SELECT reservation_date, staff_id, menu_id
         FROM reservations 
         WHERE tenant_id = $1 
         AND reservation_date >= CURRENT_DATE 
         AND status = 'confirmed'
         ORDER BY reservation_date`,
        [tenantId]
      );
      
      // 予約を時系列で管理（重複チェック用）
      const reservationMap = new Map<string, Array<{ date: Date; staffId: number | null; menuId: number }>>();
      existingReservationsResult.rows.forEach(row => {
        const dateKey = row.reservation_date.toISOString().split('T')[0];
        if (!reservationMap.has(dateKey)) {
          reservationMap.set(dateKey, []);
        }
        reservationMap.get(dateKey)!.push({
          date: row.reservation_date,
          staffId: row.staff_id,
          menuId: row.menu_id
        });
      });
      
      // 今日から30日間の予約を生成
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 30);
      
      let generatedCount = 0;
      const reservationsToInsert: any[] = [];
      
      // 各日付に対して予約を生成
      for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
        const currentDate = new Date(d);
        const dayOfWeek = currentDate.getDay(); // 0=日曜日, 6=土曜日
        const dateKey = currentDate.toISOString().split('T')[0];
        
        // 定休日チェック
        if (closedDays.includes(dayOfWeek)) {
          continue;
        }
        
        // 臨時休業日チェック
        if (temporaryClosedDays.some((closedDate: any) => {
          const closedDateStr = typeof closedDate === 'string' 
            ? closedDate.split('T')[0] 
            : new Date(closedDate).toISOString().split('T')[0];
          return closedDateStr === dateKey;
        })) {
          continue;
        }
        
        // その日の営業時間を取得（デモ用に10:00-20:00に固定）
        const dayBusinessHours = businessHours[dayOfWeek] || businessHours['default'] || { open: '10:00', close: '20:00' };
        const openTime = '10:00'; // デモ用に固定
        const closeTime = '20:00'; // デモ用に固定
        
        const openMinutes = timeToMinutes(openTime);
        const closeMinutes = timeToMinutes(closeTime);
        
        // その日の既存予約を取得
        const dayReservations = reservationMap.get(dateKey) || [];
        
        // 既存予約が少ない場合のみ追加（1日あたり最低1件、最大5件）
        const targetReservations = randomInt(1, 5);
        const currentReservations = dayReservations.length;
        
        if (currentReservations >= targetReservations) {
          continue; // 既に十分な予約がある場合はスキップ
        }
        
        const numReservationsToAdd = targetReservations - currentReservations;
        
        for (let i = 0; i < numReservationsToAdd; i++) {
          // メニューをランダムに選択
          const selectedMenu = randomChoice(menus);
          
          // ランダムな時間を生成（15分間隔）
          // メニューの時間を考慮して、予約終了時間が営業時間内に収まるようにする
          const maxStartMinutes = closeMinutes - selectedMenu.duration;
          if (maxStartMinutes < openMinutes) {
            continue; // このメニューは営業時間内に収まらない場合はスキップ
          }
          const timeSlotMinutes = randomInt(openMinutes, maxStartMinutes);
          const slotHour = Math.floor(timeSlotMinutes / 60);
          const slotMinute = Math.floor((timeSlotMinutes % 60) / 15) * 15; // 15分単位に丸める
          
          const reservationTime = new Date(currentDate);
          reservationTime.setHours(slotHour, slotMinute, 0, 0);
          
          // スタッフをランダムに選択（nullの可能性も）
          const selectedStaff = Math.random() < 0.8 ? randomChoice(staff) : null;
          
          // スタッフの勤務時間をチェック
          if (selectedStaff && selectedStaff.working_hours) {
            const workingHoursMatch = (selectedStaff.working_hours as string).match(/(\d{2}):(\d{2})-(\d{2}):(\d{2})/);
            if (workingHoursMatch) {
              const staffStartMinutes = timeToMinutes(`${workingHoursMatch[1]}:${workingHoursMatch[2]}`);
              const staffEndMinutes = timeToMinutes(`${workingHoursMatch[3]}:${workingHoursMatch[4]}`);
              const reservationEndMinutes = timeSlotMinutes + selectedMenu.duration;
              
              // スタッフの勤務時間外の場合はスキップ
              if (timeSlotMinutes < staffStartMinutes || reservationEndMinutes > staffEndMinutes) {
                continue;
              }
            }
          }
          
          // 同じ時間帯の予約数をチェック（最大同時予約数）
          const reservationEndTime = new Date(reservationTime);
          reservationEndTime.setMinutes(reservationEndTime.getMinutes() + selectedMenu.duration);
          
          const overlappingReservations = dayReservations.filter(existing => {
            const existingStart = new Date(existing.date);
            const existingEnd = new Date(existingStart);
            // 既存予約のメニュー時間を取得（簡易的に60分と仮定、実際のメニュー時間を使用する場合は修正が必要）
            existingEnd.setMinutes(existingEnd.getMinutes() + 60);
            
            return (reservationTime < existingEnd && reservationEndTime > existingStart);
          });
          
          if (overlappingReservations.length >= maxConcurrent) {
            continue; // 最大同時予約数を超える場合はスキップ
          }
          
          // 顧客をランダムに選択
          const selectedCustomer = randomChoice(customers);
          
          // 予約データを作成
          reservationsToInsert.push({
            tenant_id: tenantId,
            customer_id: selectedCustomer.customer_id,
            staff_id: selectedStaff ? selectedStaff.staff_id : null,
            menu_id: selectedMenu.menu_id,
            reservation_date: formatDateTime(reservationTime),
            status: 'confirmed',
            price: selectedMenu.price,
            notes: null
          });
          
          // 予約マップに追加（重複チェック用）
          if (!reservationMap.has(dateKey)) {
            reservationMap.set(dateKey, []);
          }
          reservationMap.get(dateKey)!.push({
            date: reservationTime,
            staffId: selectedStaff ? selectedStaff.staff_id : null,
            menuId: selectedMenu.menu_id
          });
          
          generatedCount++;
        }
      }
      
      // 予約を一括挿入
      if (reservationsToInsert.length > 0) {
        console.log(`予約データをデータベースに挿入中... (${reservationsToInsert.length}件)`);
        
        for (const reservation of reservationsToInsert) {
          await client.query(
            `INSERT INTO reservations (
              tenant_id, 
              customer_id, 
              staff_id, 
              menu_id, 
              reservation_date, 
              status, 
              price,
              notes,
              created_date
            )
            VALUES ($1, $2, $3, $4, $5::timestamp, $6, $7, $8, CURRENT_TIMESTAMP)
            RETURNING reservation_id`,
            [
              reservation.tenant_id,
              reservation.customer_id,
              reservation.staff_id,
              reservation.menu_id,
              reservation.reservation_date,
              reservation.status,
              reservation.price,
              reservation.notes
            ]
          );
        }
        
        console.log(`✅ ${reservationsToInsert.length}件の予約を追加しました`);
      } else {
        console.log('追加する予約がありませんでした（既に十分な予約があります）');
      }
      
      await client.query('COMMIT');
      
      return NextResponse.json({
        success: true,
        message: 'デモ予約データの自動生成が完了しました',
        generated: generatedCount,
        total: reservationsToInsert.length
      });
      
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('エラーが発生しました:', error);
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    } finally {
      client.release();
    }
    
  } catch (error: any) {
    console.error('予約生成エラー:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


