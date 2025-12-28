import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthFromRequest, getTenantIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 顧客の来店履歴取得（管理画面用）
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const tenantId = getTenantIdFromRequest(request, session);
    if (!tenantId) {
      return NextResponse.json(
        { error: '店舗IDが指定されていません' },
        { status: 400 }
      );
    }

    const customerId = parseInt(params.id);
    if (isNaN(customerId)) {
      return NextResponse.json(
        { error: '無効な顧客IDです' },
        { status: 400 }
      );
    }

    // 顧客が存在し、該当店舗の顧客であることを確認
    const customerCheck = await query(
      'SELECT customer_id FROM customers WHERE customer_id = $1 AND tenant_id = $2',
      [customerId, tenantId]
    );

    if (customerCheck.rows.length === 0) {
      return NextResponse.json(
        { error: '顧客が見つかりません' },
        { status: 404 }
      );
    }

    // 来店履歴を取得（完了した予約のみ）
    let queryText = `
      SELECT 
        r.reservation_id,
        r.reservation_date,
        r.status,
        r.price,
        r.notes,
        r.created_date,
        m.menu_id,
        m.name as menu_name,
        m.price as menu_price,
        m.duration as menu_duration,
        s.staff_id,
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
      LEFT JOIN menus m ON r.menu_id = m.menu_id
      LEFT JOIN staff s ON r.staff_id = s.staff_id
      LEFT JOIN reservation_menus rm ON r.reservation_id = rm.reservation_id
      LEFT JOIN menus rm_menu ON rm.menu_id = rm_menu.menu_id
      WHERE r.customer_id = $1 
      AND r.tenant_id = $2
      AND r.status = 'completed'
      GROUP BY r.reservation_id, m.menu_id, m.name, m.price, m.duration, s.staff_id, s.name
      ORDER BY r.reservation_date DESC
    `;

    let result;
    try {
      result = await query(queryText, [customerId, tenantId]);
    } catch (error: any) {
      // reservation_menusテーブルが存在しない場合はフォールバック
      if (error.message && error.message.includes('reservation_menus')) {
        const fallbackQuery = `
          SELECT 
            r.reservation_id,
            r.reservation_date,
            r.status,
            r.price,
            r.notes,
            r.created_date,
            m.menu_id,
            m.name as menu_name,
            m.price as menu_price,
            m.duration as menu_duration,
            s.staff_id,
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
          LEFT JOIN menus m ON r.menu_id = m.menu_id
          LEFT JOIN staff s ON r.staff_id = s.staff_id
          WHERE r.customer_id = $1 
          AND r.tenant_id = $2
          AND r.status = 'completed'
          ORDER BY r.reservation_date DESC
        `;
        result = await query(fallbackQuery, [customerId, tenantId]);
      } else {
        throw error;
      }
    }

    // メニュー配列をパース
    const history = result.rows.map((row: any) => {
      // reservation_dateに+09:00を付与してJSTとして明示的に返す
      let reservationDate = row.reservation_date;
      if (reservationDate && typeof reservationDate === 'string' && !reservationDate.includes('+') && !reservationDate.includes('Z')) {
        // タイムゾーン情報がない場合は+09:00を付与
        reservationDate = reservationDate.replace(' ', 'T') + '+09:00';
      }
      return {
        reservation_id: row.reservation_id,
        reservation_date: reservationDate,
        status: row.status,
        price: row.price,
        notes: row.notes,
        created_date: row.created_date,
        menu_id: row.menu_id,
        menu_name: row.menu_name,
        menu_price: row.menu_price,
        menu_duration: row.menu_duration,
        staff_id: row.staff_id,
        staff_name: row.staff_name,
        menus: typeof row.menus === 'string' ? JSON.parse(row.menus) : row.menus,
        total_price: Array.isArray(row.menus) 
          ? (typeof row.menus === 'string' ? JSON.parse(row.menus) : row.menus).reduce((sum: number, m: any) => sum + (m.price || 0), 0)
          : (row.price || 0),
        total_duration: Array.isArray(row.menus)
          ? (typeof row.menus === 'string' ? JSON.parse(row.menus) : row.menus).reduce((sum: number, m: any) => sum + (m.duration || 0), 0)
          : (row.menu_duration || 0)
      };
    });

    return NextResponse.json(history);
  } catch (error: any) {
    console.error('Error fetching customer history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

