import { NextRequest, NextResponse } from 'next/server';
import { query, getTenantIdFromRequest } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantIdFromRequest(request);
    if (!tenantId) {
      return NextResponse.json(
        { error: 'テナントが見つかりません' },
        { status: 400 }
      );
    }

    const date = request.nextUrl.searchParams.get('date');
    const menuIdParam = request.nextUrl.searchParams.get('menu_id');
    const staffId = request.nextUrl.searchParams.get('staff_id');

    if (!date) {
      return NextResponse.json(
        { error: 'dateパラメータが必要です' },
        { status: 400 }
      );
    }

    // メニュー情報を取得（複数メニュー対応）
    let duration = 60; // デフォルト
    if (menuIdParam) {
      // カンマ区切りの場合は複数メニュー
      const menuIds = menuIdParam.includes(',') 
        ? menuIdParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
        : [parseInt(menuIdParam)];
      
      if (menuIds.length > 0) {
        try {
          const menuResult = await query(
            `SELECT SUM(duration) as total_duration FROM menus 
             WHERE menu_id = ANY($1::int[]) AND tenant_id = $2`,
            [menuIds, tenantId]
          );
          if (menuResult.rows.length > 0 && menuResult.rows[0].total_duration) {
            duration = parseInt(menuResult.rows[0].total_duration);
          }
        } catch (error: any) {
          // フォールバック: 最初のメニューのみ
          const menuResult = await query(
            'SELECT duration FROM menus WHERE menu_id = $1 AND tenant_id = $2',
            [menuIds[0], tenantId]
          );
          if (menuResult.rows.length > 0) {
            duration = menuResult.rows[0].duration;
          }
        }
      }
    }

    // 店舗情報を取得（最大同時予約数と営業時間）
    const tenantResult = await query(
      'SELECT max_concurrent_reservations, business_hours FROM tenants WHERE tenant_id = $1',
      [tenantId]
    );
    const maxConcurrent = tenantResult.rows[0]?.max_concurrent_reservations || 3;
    
    // 営業時間を取得
    let businessHours: any = {};
    try {
      if (tenantResult.rows[0]?.business_hours) {
        businessHours = typeof tenantResult.rows[0].business_hours === 'string'
          ? JSON.parse(tenantResult.rows[0].business_hours)
          : tenantResult.rows[0].business_hours;
      }
    } catch (e) {
      console.error('business_hoursのパースエラー:', e);
    }
    
    // 選択された日付の曜日を取得（0=日曜日、1=月曜日、...、6=土曜日）
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();
    
    // その曜日の営業時間を取得（デフォルト: 10:00-19:00）
    const dayBusinessHours = businessHours[dayOfWeek] || businessHours['default'] || { open: '10:00', close: '19:00' };
    const openTime = dayBusinessHours.open || '10:00';
    const closeTime = dayBusinessHours.close || '19:00';
    
    // 開店時間と閉店時間を分単位に変換
    const [openHour, openMinute] = openTime.split(':').map(Number);
    const [closeHour, closeMinute] = closeTime.split(':').map(Number);
    const openTimeInMinutes = openHour * 60 + openMinute;
    const closeTimeInMinutes = closeHour * 60 + closeMinute;
    
    // 営業時間のスロットを生成（30分間隔）
    const slots: string[] = [];
    for (let time = openTimeInMinutes; time < closeTimeInMinutes; time += 30) {
      const hour = Math.floor(time / 60);
      const minute = time % 60;
      slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }

    // 現在時刻を取得（サーバーのタイムゾーンを使用）
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // 選択された日付が今日の場合、現在時刻より前の時間を除外
    if (date === today) {
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      
      // 現在時刻より前のスロットを除外（作業時間を考慮して、現在時刻 + 作業時間より前のスロットも除外）
      // 例：現在が14:00で作業時間が60分の場合、15:00以降のスロットのみ表示
      const minStartTime = currentTimeInMinutes + duration; // 作業時間を加味
      
      const filteredSlots = slots.filter(slot => {
        const [hour, minute] = slot.split(':').map(Number);
        const slotTimeInMinutes = hour * 60 + minute;
        return slotTimeInMinutes >= minStartTime;
      });
      
      // スロットを更新
      slots.length = 0;
      slots.push(...filteredSlots);
    }

    // 予約済みスロットを取得
    // スタッフが指定されている場合は、そのスタッフの予約のみをチェック
    let queryText = '';
    let queryParams: any[] = [];
    
    if (staffId) {
      // スタッフ指定の場合：そのスタッフの予約と、メニューの所要時間を考慮（複数メニュー対応）
      queryText = `
        SELECT 
          r.reservation_date,
          COALESCE(
            (SELECT SUM(m2.duration) 
             FROM reservation_menus rm2
             JOIN menus m2 ON rm2.menu_id = m2.menu_id
             WHERE rm2.reservation_id = r.reservation_id),
            m.duration,
            60
          ) as duration
        FROM reservations r
        LEFT JOIN menus m ON r.menu_id = m.menu_id
        WHERE DATE(r.reservation_date) = $1
        AND r.status = 'confirmed'
        AND r.tenant_id = $2
        AND r.staff_id = $3
      `;
      queryParams = [date, tenantId, staffId];
    } else {
      // スタッフ未指定の場合：全予約をチェック（メニューの所要時間も取得、複数メニュー対応）
      queryText = `
        SELECT 
          r.reservation_date,
          COALESCE(
            (SELECT SUM(m2.duration) 
             FROM reservation_menus rm2
             JOIN menus m2 ON rm2.menu_id = m2.menu_id
             WHERE rm2.reservation_id = r.reservation_id),
            m.duration,
            60
          ) as duration
        FROM reservations r
        LEFT JOIN menus m ON r.menu_id = m.menu_id
        WHERE DATE(r.reservation_date) = $1
        AND r.status = 'confirmed'
        AND r.tenant_id = $2
      `;
      queryParams = [date, tenantId];
    }

    const result = await query(queryText, queryParams);
    
    let unavailableSlots: Set<string> = new Set();

    if (staffId) {
      // スタッフ指定の場合：既存予約の終了時間を考慮して、次の予約が取れる時間のみを表示
      const newUnavailableSlots: Set<string> = new Set();
      slots.forEach(slot => {
        const [hour, minute] = slot.split(':').map(Number);
        const slotTime = hour * 60 + minute;
        const slotEndTime = slotTime + duration;
        
        // このスロットから開始した場合、既存予約と重複するかチェック
        let hasConflict = false;
        result.rows.forEach((row: any) => {
          const reservationDate = new Date(row.reservation_date);
          const reservationDuration = row.duration || 60;
          const reservationStartTime = reservationDate.getHours() * 60 + reservationDate.getMinutes();
          const reservationEndTime = reservationStartTime + reservationDuration;
          
          // 時間帯が重複しているかチェック
          // 新しい予約の開始時間が既存予約の終了時間より前、かつ新しい予約の終了時間が既存予約の開始時間より後
          // つまり、slotTime < reservationEndTime && slotEndTime > reservationStartTime
          if (slotTime < reservationEndTime && slotEndTime > reservationStartTime) {
            hasConflict = true;
          }
        });
        
        if (hasConflict) {
          newUnavailableSlots.add(slot);
        }
      });
      
      unavailableSlots = newUnavailableSlots;
    } else {
      // スタッフ未指定の場合：最大同時予約数を考慮し、既存予約の終了時間も考慮
      // 各スロットで、その時間帯の予約数をチェック
      slots.forEach(slot => {
        const [hour, minute] = slot.split(':').map(Number);
        const slotTime = hour * 60 + minute; // 分単位
        const slotEndTime = slotTime + duration;
        
        // このスロットと時間帯が重複する予約をカウント
        let count = 0;
        result.rows.forEach((row: any) => {
          const reservationDate = new Date(row.reservation_date);
          const reservationDuration = row.duration || 60;
          const reservationStartTime = reservationDate.getHours() * 60 + reservationDate.getMinutes();
          const reservationEndTime = reservationStartTime + reservationDuration;
          
          // 時間帯が重複しているかチェック
          // 新しい予約の開始時間が既存予約の終了時間より前、かつ新しい予約の終了時間が既存予約の開始時間より後
          if (slotTime < reservationEndTime && slotEndTime > reservationStartTime) {
            count++;
          }
        });
        
        // 最大同時予約数を超えている場合は利用不可
        if (count >= maxConcurrent) {
          unavailableSlots.add(slot);
        }
      });
    }

    // 空きスロットを返す（閉店時間を考慮）
    const availableSlots = slots.filter(slot => {
      // 既に予約済みのスロットは除外
      if (unavailableSlots.has(slot)) {
        return false;
      }
      
      // 予約開始時間 + 作業時間が閉店時間を超えないかチェック
      const [hour, minute] = slot.split(':').map(Number);
      const slotTimeInMinutes = hour * 60 + minute;
      const slotEndTimeInMinutes = slotTimeInMinutes + duration;
      
      // 閉店時間を超える場合は除外
      if (slotEndTimeInMinutes > closeTimeInMinutes) {
        return false;
      }
      
      return true;
    });
    
    return NextResponse.json(availableSlots);
  } catch (error: any) {
    console.error('Error fetching available slots:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

