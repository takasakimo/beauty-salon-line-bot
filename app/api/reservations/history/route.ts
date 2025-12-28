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

    const customerId = request.nextUrl.searchParams.get('customer_id');
    if (!customerId) {
      return NextResponse.json(
        { error: 'customer_idが必要です' },
        { status: 400 }
      );
    }

    const queryText = `
      SELECT 
        r.*, 
        m.name as menu_name, 
        COALESCE(r.price, m.price) as price,
        m.price as menu_price, 
        m.duration, 
        s.name as staff_name,
        COALESCE(
          json_agg(
            json_build_object(
              'menu_id', rm_menu.menu_id,
              'menu_name', rm_menu.name,
              'price', rm.price,
              'duration', rm_menu.duration
            )
          ) FILTER (WHERE rm.reservation_menu_id IS NOT NULL),
          json_build_array(
            json_build_object(
              'menu_id', m.menu_id,
              'menu_name', m.name,
              'price', COALESCE(r.price, m.price),
              'duration', m.duration
            )
          )
        ) as menus
      FROM reservations r
      JOIN menus m ON r.menu_id = m.menu_id AND m.tenant_id = $1
      LEFT JOIN staff s ON r.staff_id = s.staff_id AND s.tenant_id = $1
      LEFT JOIN reservation_menus rm ON r.reservation_id = rm.reservation_id
      LEFT JOIN menus rm_menu ON rm.menu_id = rm_menu.menu_id
      WHERE r.customer_id = $2 AND r.tenant_id = $1
      GROUP BY r.reservation_id, m.menu_id, m.name, m.price, m.duration, s.staff_id, s.name
      ORDER BY r.reservation_date DESC
    `;
    
    let result;
    try {
      result = await query(queryText, [tenantId, customerId]);
    } catch (error: any) {
      // reservation_menusテーブルが存在しない場合はフォールバック
      if (error.message && error.message.includes('reservation_menus')) {
        const fallbackQuery = `
          SELECT 
            r.*, 
            m.name as menu_name, 
            COALESCE(r.price, m.price) as price,
            m.price as menu_price, 
            m.duration, 
            s.name as staff_name,
            json_build_array(
              json_build_object(
                'menu_id', m.menu_id,
                'menu_name', m.name,
                'price', COALESCE(r.price, m.price),
                'duration', m.duration
              )
            ) as menus
          FROM reservations r
          JOIN menus m ON r.menu_id = m.menu_id AND m.tenant_id = $1
          LEFT JOIN staff s ON r.staff_id = s.staff_id AND s.tenant_id = $1
          WHERE r.customer_id = $2 AND r.tenant_id = $1
          ORDER BY r.reservation_date DESC
        `;
        result = await query(fallbackQuery, [tenantId, customerId]);
      } else {
        throw error;
      }
    }

    // メニュー配列をパース
    const reservations = result.rows.map((row: any) => {
      // reservation_dateに+09:00を付与してJSTとして明示的に返す
      let reservationDate = row.reservation_date;
      if (reservationDate && typeof reservationDate === 'string' && !reservationDate.includes('+') && !reservationDate.includes('Z')) {
        // タイムゾーン情報がない場合は+09:00を付与
        reservationDate = reservationDate.replace(' ', 'T') + '+09:00';
      }
      return {
        ...row,
        reservation_date: reservationDate,
        menus: typeof row.menus === 'string' ? JSON.parse(row.menus) : row.menus,
        total_price: Array.isArray(row.menus) ? row.menus.reduce((sum: number, m: any) => sum + (m.price || 0), 0) : (row.price || 0),
        total_duration: Array.isArray(row.menus) ? row.menus.reduce((sum: number, m: any) => sum + (m.duration || 0), 0) : (row.duration || 0)
      };
    });

    return NextResponse.json(reservations);
  } catch (error: any) {
    console.error('Error fetching reservation history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

