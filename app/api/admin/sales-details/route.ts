import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthFromRequest, getTenantIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // 'today' or 'month'
    const date = searchParams.get('date'); // 日付指定（オプション）
    
    // クエリパラメータからtenantIdを取得（スーパー管理者の場合）
    const queryTenantId = searchParams.get('tenantId');
    let tenantId: number | null | undefined;
    
    if (queryTenantId) {
      // クエリパラメータのtenantIdを優先
      const parsedTenantId = parseInt(queryTenantId);
      if (!isNaN(parsedTenantId)) {
        tenantId = parsedTenantId;
      }
    } else {
      // 通常の管理者の場合はセッションから取得
      tenantId = getTenantIdFromRequest(request, session);
    }
    
    if (!tenantId) {
      return NextResponse.json(
        { error: '店舗IDが指定されていません' },
        { status: 400 }
      );
    }

    const sales: any[] = [];

    // 予約による売上を取得
    let reservationQuery = '';
    let reservationParams: any[] = [tenantId];

    if (type === 'today') {
      if (date) {
        reservationQuery = `
          SELECT 
            r.reservation_id,
            r.reservation_date,
            r.status,
            COALESCE(rm.price, COALESCE(r.price, m.price)) as price,
            c.real_name as customer_name,
            s.name as staff_name,
            COALESCE(rm_menu.name, m.name) as menu_name,
            'reservation' as type
          FROM reservations r
          LEFT JOIN customers c ON r.customer_id = c.customer_id
          LEFT JOIN menus m ON r.menu_id = m.menu_id AND m.tenant_id = $1
          LEFT JOIN staff s ON r.staff_id = s.staff_id AND s.tenant_id = $1
          LEFT JOIN reservation_menus rm ON r.reservation_id = rm.reservation_id
          LEFT JOIN menus rm_menu ON rm.menu_id = rm_menu.menu_id AND rm_menu.tenant_id = $1
          WHERE DATE(r.reservation_date) = $2
          AND r.status IN ('confirmed', 'completed')
          AND r.tenant_id = $1
          ORDER BY r.reservation_date ASC
        `;
        reservationParams.push(date);
      } else {
        reservationQuery = `
          SELECT 
            r.reservation_id,
            r.reservation_date,
            r.status,
            COALESCE(rm.price, COALESCE(r.price, m.price)) as price,
            c.real_name as customer_name,
            s.name as staff_name,
            COALESCE(rm_menu.name, m.name) as menu_name,
            'reservation' as type
          FROM reservations r
          LEFT JOIN customers c ON r.customer_id = c.customer_id
          LEFT JOIN menus m ON r.menu_id = m.menu_id AND m.tenant_id = $1
          LEFT JOIN staff s ON r.staff_id = s.staff_id AND s.tenant_id = $1
          LEFT JOIN reservation_menus rm ON r.reservation_id = rm.reservation_id
          LEFT JOIN menus rm_menu ON rm.menu_id = rm_menu.menu_id AND rm_menu.tenant_id = $1
          WHERE DATE(r.reservation_date) = CURRENT_DATE
          AND r.status IN ('confirmed', 'completed')
          AND r.tenant_id = $1
          ORDER BY r.reservation_date ASC
        `;
      }
    } else if (type === 'month') {
      // 今月の売上は完了した予約のみ（未来の予約は含めない）
      reservationQuery = `
        SELECT 
          r.reservation_id,
          r.reservation_date,
          r.status,
          COALESCE(rm.price, COALESCE(r.price, m.price)) as price,
          c.real_name as customer_name,
          s.name as staff_name,
          COALESCE(rm_menu.name, m.name) as menu_name,
          'reservation' as type
        FROM reservations r
        LEFT JOIN customers c ON r.customer_id = c.customer_id
        LEFT JOIN menus m ON r.menu_id = m.menu_id AND m.tenant_id = $1
        LEFT JOIN staff s ON r.staff_id = s.staff_id AND s.tenant_id = $1
        LEFT JOIN reservation_menus rm ON r.reservation_id = rm.reservation_id
        LEFT JOIN menus rm_menu ON rm.menu_id = rm_menu.menu_id AND rm_menu.tenant_id = $1
        WHERE r.status = 'completed'
        AND r.tenant_id = $1
        AND DATE_TRUNC('month', r.reservation_date) = DATE_TRUNC('month', CURRENT_DATE)
        AND r.reservation_date <= NOW()
        ORDER BY r.reservation_date ASC
      `;
    }

    try {
      const reservationResult = await query(reservationQuery, reservationParams);
      // 同じ予約IDのものをグループ化して合計金額を計算
      const reservationMap = new Map();
      reservationResult.rows.forEach((row: any) => {
        const key = row.reservation_id;
        if (reservationMap.has(key)) {
          reservationMap.get(key).price += parseFloat(row.price || 0);
          reservationMap.get(key).menus.push(row.menu_name);
        } else {
          reservationMap.set(key, {
            id: row.reservation_id,
            date: row.reservation_date,
            status: row.status,
            price: parseFloat(row.price || 0),
            customer_name: row.customer_name,
            staff_name: row.staff_name,
            menus: [row.menu_name],
            type: 'reservation'
          });
        }
      });
      sales.push(...Array.from(reservationMap.values()));
    } catch (error: any) {
      // reservation_menusテーブルが存在しない場合はフォールバック
      if (error.message && error.message.includes('reservation_menus')) {
        const fallbackQuery = type === 'today'
          ? (date
              ? `SELECT r.reservation_id, r.reservation_date, r.status, COALESCE(r.price, m.price) as price, c.real_name as customer_name, s.name as staff_name, m.name as menu_name, 'reservation' as type FROM reservations r LEFT JOIN customers c ON r.customer_id = c.customer_id LEFT JOIN menus m ON r.menu_id = m.menu_id AND m.tenant_id = $1 LEFT JOIN staff s ON r.staff_id = s.staff_id AND s.tenant_id = $1 WHERE DATE(r.reservation_date) = $2 AND r.status IN ('confirmed', 'completed') AND r.tenant_id = $1 ORDER BY r.reservation_date ASC`
              : `SELECT r.reservation_id, r.reservation_date, r.status, COALESCE(r.price, m.price) as price, c.real_name as customer_name, s.name as staff_name, m.name as menu_name, 'reservation' as type FROM reservations r LEFT JOIN customers c ON r.customer_id = c.customer_id LEFT JOIN menus m ON r.menu_id = m.menu_id AND m.tenant_id = $1 LEFT JOIN staff s ON r.staff_id = s.staff_id AND s.tenant_id = $1 WHERE DATE(r.reservation_date) = CURRENT_DATE AND r.status IN ('confirmed', 'completed') AND r.tenant_id = $1 ORDER BY r.reservation_date ASC`)
          : `SELECT r.reservation_id, r.reservation_date, r.status, COALESCE(r.price, m.price) as price, c.real_name as customer_name, s.name as staff_name, m.name as menu_name, 'reservation' as type FROM reservations r LEFT JOIN customers c ON r.customer_id = c.customer_id LEFT JOIN menus m ON r.menu_id = m.menu_id AND m.tenant_id = $1 LEFT JOIN staff s ON r.staff_id = s.staff_id AND s.tenant_id = $1 WHERE r.status IN ('confirmed', 'completed') AND r.tenant_id = $1 AND DATE_TRUNC('month', r.reservation_date) = DATE_TRUNC('month', CURRENT_DATE) ORDER BY r.reservation_date ASC`;
        const fallbackParams = date ? [tenantId, date] : [tenantId];
        const fallbackResult = await query(fallbackQuery, fallbackParams);
        sales.push(...fallbackResult.rows.map((row: any) => ({
          id: row.reservation_id,
          date: row.reservation_date,
          status: row.status,
          price: parseFloat(row.price || 0),
          customer_name: row.customer_name,
          staff_name: row.staff_name,
          menus: [row.menu_name],
          type: 'reservation'
        })));
      } else {
        throw error;
      }
    }

    // 商品販売による売上を取得
    let productQuery = '';
    let productParams: any[] = [tenantId];

    if (type === 'today') {
      if (date) {
        productQuery = `
          SELECT 
            purchase_id as id,
            purchase_date as date,
            total_price as price,
            c.real_name as customer_name,
            s.name as staff_name,
            product_name,
            quantity,
            'product' as type
          FROM product_purchases pp
          LEFT JOIN customers c ON pp.customer_id = c.customer_id
          LEFT JOIN staff s ON pp.staff_id = s.staff_id AND s.tenant_id = $1
          WHERE DATE(pp.purchase_date) = $2
          AND pp.tenant_id = $1
          ORDER BY pp.purchase_date ASC
        `;
        productParams.push(date);
      } else {
        productQuery = `
          SELECT 
            purchase_id as id,
            purchase_date as date,
            total_price as price,
            c.real_name as customer_name,
            s.name as staff_name,
            product_name,
            quantity,
            'product' as type
          FROM product_purchases pp
          LEFT JOIN customers c ON pp.customer_id = c.customer_id
          LEFT JOIN staff s ON pp.staff_id = s.staff_id AND s.tenant_id = $1
          WHERE DATE(pp.purchase_date) = CURRENT_DATE
          AND pp.tenant_id = $1
          ORDER BY pp.purchase_date ASC
        `;
      }
    } else if (type === 'month') {
      productQuery = `
        SELECT 
          purchase_id as id,
          purchase_date as date,
          total_price as price,
          c.real_name as customer_name,
          s.name as staff_name,
          product_name,
          quantity,
          'product' as type
        FROM product_purchases pp
        LEFT JOIN customers c ON pp.customer_id = c.customer_id
        LEFT JOIN staff s ON pp.staff_id = s.staff_id AND s.tenant_id = $1
        WHERE DATE_TRUNC('month', pp.purchase_date) = DATE_TRUNC('month', CURRENT_DATE)
        AND pp.tenant_id = $1
        ORDER BY pp.purchase_date ASC
      `;
    }

    try {
      const productResult = await query(productQuery, productParams);
      sales.push(...productResult.rows.map((row: any) => ({
        id: row.id,
        date: row.date,
        status: 'completed',
        price: parseFloat(row.price || 0),
        customer_name: row.customer_name,
        staff_name: row.staff_name,
        product_name: row.product_name,
        quantity: row.quantity,
        type: 'product'
      })));
    } catch (error: any) {
      // product_purchasesテーブルが存在しない場合はスキップ
      console.warn('product_purchasesテーブルが存在しません:', error);
    }

    // 日時でソート
    sales.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json(sales);
  } catch (error: any) {
    console.error('Error fetching sales details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

