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
    const menuId = request.nextUrl.searchParams.get('menu_id');

    if (!date) {
      return NextResponse.json(
        { error: 'dateパラメータが必要です' },
        { status: 400 }
      );
    }

    // メニュー情報を取得（durationが必要）
    let duration = 60; // デフォルト
    if (menuId) {
      const menuResult = await query(
        'SELECT duration FROM menus WHERE menu_id = $1 AND tenant_id = $2',
        [menuId, tenantId]
      );
      if (menuResult.rows.length > 0) {
        duration = menuResult.rows[0].duration;
      }
    }

    // 営業時間のスロットを生成（10:00-19:00）
    const slots: string[] = [];
    for (let hour = 10; hour < 19; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }

    // 予約済みスロットを取得
    const queryText = `
      SELECT TO_CHAR(reservation_date, 'HH24:MI') as time
      FROM reservations
      WHERE DATE(reservation_date) = $1
      AND status = 'confirmed'
      AND tenant_id = $2
    `;
    const result = await query(queryText, [date, tenantId]);
    const bookedSlots = result.rows.map((row: any) => row.time);

    // 空きスロットを返す
    const availableSlots = slots.filter(slot => !bookedSlots.includes(slot));
    
    return NextResponse.json(availableSlots);
  } catch (error: any) {
    console.error('Error fetching available slots:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

