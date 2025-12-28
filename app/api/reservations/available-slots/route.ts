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

    // 最大同時予約数を取得
    const tenantResult = await query(
      'SELECT max_concurrent_reservations FROM tenants WHERE tenant_id = $1',
      [tenantId]
    );
    const maxConcurrent = tenantResult.rows[0]?.max_concurrent_reservations || 3;

    // 営業時間のスロットを生成（10:00-19:00、30分間隔）
    const slots: string[] = [];
    for (let hour = 10; hour < 19; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
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
      // スタッフ指定の場合：各予約の開始時間から所要時間分を確保できない時間を計算
      result.rows.forEach((row: any) => {
        const reservationDate = new Date(row.reservation_date);
        const reservationDuration = row.duration || 60; // デフォルト60分
        
        // 予約開始時間
        const startHour = reservationDate.getHours();
        const startMinute = reservationDate.getMinutes();
        const startTime = startHour * 60 + startMinute; // 分単位
        
        // 予約終了時間（開始時間 + 所要時間）
        const endTime = startTime + reservationDuration;
        
        // 予約時間帯に含まれるすべてのスロットを計算
        for (let time = startTime; time < endTime; time += 30) {
          const hour = Math.floor(time / 60);
          const minute = time % 60;
          const slot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          unavailableSlots.add(slot);
        }
      });
      
      // 新しい予約の所要時間を考慮して、確保できない時間帯を計算
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
      // スタッフ未指定の場合：最大同時予約数を考慮
      // 各スロットで、その時間帯の予約数をチェック
      slots.forEach(slot => {
        const [hour, minute] = slot.split(':').map(Number);
        const slotDateTime = new Date(`${date}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`);
        const slotEndTime = new Date(slotDateTime.getTime() + duration * 60000);
        
        // このスロットと時間帯が重複する予約をカウント
        let count = 0;
        result.rows.forEach((row: any) => {
          const reservationDate = new Date(row.reservation_date);
          const reservationDuration = row.duration || 60;
          const reservationEnd = new Date(reservationDate.getTime() + reservationDuration * 60000);
          
          // 時間帯が重複しているかチェック
          if (slotDateTime < reservationEnd && slotEndTime > reservationDate) {
            count++;
          }
        });
        
        // 最大同時予約数を超えている場合は利用不可
        if (count >= maxConcurrent) {
          unavailableSlots.add(slot);
        }
      });
    }

    // 空きスロットを返す
    const availableSlots = slots.filter(slot => !unavailableSlots.has(slot));
    
    return NextResponse.json(availableSlots);
  } catch (error: any) {
    console.error('Error fetching available slots:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

