import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthFromRequest, getTenantIdFromRequestAsync } from '@/lib/auth';

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

    const tenantId = await getTenantIdFromRequestAsync(request, session);
    if (!tenantId) {
      return NextResponse.json(
        { error: '店舗IDが指定されていません' },
        { status: 400 }
      );
    }

    // 総顧客数
    const totalCustomersResult = await query(
      'SELECT COUNT(*) as total FROM customers WHERE tenant_id = $1',
      [tenantId]
    );

    // 今月の新規顧客数
    const newCustomersResult = await query(
      `SELECT COUNT(*) as total 
       FROM customers 
       WHERE tenant_id = $1
       AND DATE_TRUNC('month', registered_date) = DATE_TRUNC('month', CURRENT_DATE)`,
      [tenantId]
    );

    // 常連顧客数（5回以上来店）
    const regularCustomersResult = await query(
      `SELECT COUNT(DISTINCT c.customer_id) as total
       FROM customers c
       WHERE c.tenant_id = $1
       AND (
         SELECT COUNT(*) 
         FROM reservations r 
         WHERE r.customer_id = c.customer_id 
         AND r.tenant_id = $1
         AND r.status = 'completed'
       ) >= 5`,
      [tenantId]
    );

    // 平均客単価
    const avgSpendingResult = await query(
      `SELECT AVG(m.price) as average
       FROM reservations r
       JOIN menus m ON r.menu_id = m.menu_id AND m.tenant_id = $1
       WHERE r.status = 'completed'
       AND r.tenant_id = $1`,
      [tenantId]
    );

    // 今月の売上（予約分）
    // 完了した予約のみを集計（未来の予約は含めない）
    // 複数メニュー対応: reservation_menusテーブルから合計金額を取得
    let monthlyReservationSales = 0;
    try {
      const monthlyReservationSalesResult = await query(
        `SELECT COALESCE(SUM(COALESCE(rm.price, COALESCE(r.price, m.price))), 0) as total
         FROM reservations r
         LEFT JOIN menus m ON r.menu_id = m.menu_id AND m.tenant_id = $1
         LEFT JOIN reservation_menus rm ON r.reservation_id = rm.reservation_id
         LEFT JOIN menus rm_menu ON rm.menu_id = rm_menu.menu_id AND rm_menu.tenant_id = $1
         WHERE r.status = 'completed'
         AND r.tenant_id = $1
         AND DATE_TRUNC('month', r.reservation_date) = DATE_TRUNC('month', CURRENT_DATE)
         AND r.reservation_date <= NOW()`,
        [tenantId]
      );
      monthlyReservationSales = parseFloat(monthlyReservationSalesResult.rows[0]?.total || '0');
    } catch (error: any) {
      // reservation_menusテーブルが存在しない場合はフォールバック
      if (error.message && error.message.includes('reservation_menus')) {
        const fallbackResult = await query(
          `SELECT COALESCE(SUM(COALESCE(r.price, m.price)), 0) as total
           FROM reservations r
           LEFT JOIN menus m ON r.menu_id = m.menu_id AND m.tenant_id = $1
           WHERE r.status = 'completed'
           AND r.tenant_id = $1
           AND DATE_TRUNC('month', r.reservation_date) = DATE_TRUNC('month', CURRENT_DATE)
           AND r.reservation_date <= NOW()`,
          [tenantId]
        );
        monthlyReservationSales = parseFloat(fallbackResult.rows[0]?.total || '0');
      } else {
        throw error;
      }
    }

    // 今月の売上（商品販売分）
    let monthlyProductSales = 0;
    try {
      const monthlyProductSalesResult = await query(
        `SELECT COALESCE(SUM(total_price), 0) as total
         FROM product_purchases
         WHERE DATE_TRUNC('month', purchase_date) = DATE_TRUNC('month', CURRENT_DATE)
         AND tenant_id = $1`,
        [tenantId]
      );
      monthlyProductSales = parseFloat(monthlyProductSalesResult.rows[0]?.total || '0');
    } catch (error: any) {
      // product_purchasesテーブルが存在しない場合は0
      console.warn('product_purchasesテーブルが存在しません:', error);
      monthlyProductSales = 0;
    }

    const monthlySales = monthlyReservationSales + monthlyProductSales;

    // 今日の予約数
    const todayReservationsResult = await query(
      `SELECT COUNT(*) as total
       FROM reservations
       WHERE DATE(reservation_date) = CURRENT_DATE
       AND status = 'confirmed'
       AND tenant_id = $1`,
      [tenantId]
    );

    // 今日の売上（予約分）
    // 複数メニュー対応: reservation_menusテーブルから合計金額を取得
    let todayReservationSales = 0;
    try {
      const todayReservationSalesResult = await query(
        `SELECT COALESCE(SUM(COALESCE(rm.price, COALESCE(r.price, m.price))), 0) as total
         FROM reservations r
         LEFT JOIN menus m ON r.menu_id = m.menu_id AND m.tenant_id = $1
         LEFT JOIN reservation_menus rm ON r.reservation_id = rm.reservation_id
         LEFT JOIN menus rm_menu ON rm.menu_id = rm_menu.menu_id AND rm_menu.tenant_id = $1
         WHERE DATE(r.reservation_date) = CURRENT_DATE
         AND r.status IN ('confirmed', 'completed')
         AND r.tenant_id = $1`,
        [tenantId]
      );
      todayReservationSales = parseFloat(todayReservationSalesResult.rows[0]?.total || '0');
    } catch (error: any) {
      // reservation_menusテーブルが存在しない場合はフォールバック
      if (error.message && error.message.includes('reservation_menus')) {
        const fallbackResult = await query(
          `SELECT COALESCE(SUM(COALESCE(r.price, m.price)), 0) as total
           FROM reservations r
           LEFT JOIN menus m ON r.menu_id = m.menu_id AND m.tenant_id = $1
           WHERE DATE(r.reservation_date) = CURRENT_DATE
           AND r.status IN ('confirmed', 'completed')
           AND r.tenant_id = $1`,
          [tenantId]
        );
        todayReservationSales = parseFloat(fallbackResult.rows[0]?.total || '0');
      } else {
        throw error;
      }
    }

    // 今日の売上（商品販売分）
    let todayProductSales = 0;
    try {
      const todayProductSalesResult = await query(
        `SELECT COALESCE(SUM(total_price), 0) as total
         FROM product_purchases
         WHERE DATE(purchase_date) = CURRENT_DATE
         AND tenant_id = $1`,
        [tenantId]
      );
      todayProductSales = parseFloat(todayProductSalesResult.rows[0]?.total || '0');
    } catch (error: any) {
      // product_purchasesテーブルが存在しない場合は0
      console.warn('product_purchasesテーブルが存在しません:', error);
      todayProductSales = 0;
    }

    const todaySales = todayReservationSales + todayProductSales;

    // 新着予約（未読予約）の取得
    let newReservations: any[] = [];
    let newReservationsCount = 0;
    try {
      // is_viewedカラムが存在するかチェック
      const columnCheck = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'reservations' AND column_name = 'is_viewed'
      `);
      
      if (columnCheck.rows.length > 0) {
        // 未読予約を取得（最新5件）
        const newReservationsResult = await query(`
          SELECT 
            r.reservation_id,
            r.reservation_date,
            r.status,
            r.created_date,
            c.real_name as customer_name,
            c.phone_number as customer_phone,
            m.name as menu_name,
            s.name as staff_name
          FROM reservations r
          LEFT JOIN customers c ON r.customer_id = c.customer_id
          LEFT JOIN menus m ON r.menu_id = m.menu_id
          LEFT JOIN staff s ON r.staff_id = s.staff_id
          WHERE r.tenant_id = $1
          AND (r.is_viewed = false OR r.is_viewed IS NULL)
          AND r.status != 'cancelled'
          ORDER BY r.created_date DESC
          LIMIT 5
        `, [tenantId]);
        
        newReservations = newReservationsResult.rows.map(row => {
          // reservation_dateをJSTとして処理（予約一覧APIと同じ処理）
          let reservationDate = row.reservation_date;
          
          if (reservationDate) {
            if (reservationDate instanceof Date) {
              // Dateオブジェクトの場合、UTC時刻として解釈してJSTに変換
              const year = reservationDate.getUTCFullYear();
              const month = String(reservationDate.getUTCMonth() + 1).padStart(2, '0');
              const day = String(reservationDate.getUTCDate()).padStart(2, '0');
              const hours = String(reservationDate.getUTCHours()).padStart(2, '0');
              const minutes = String(reservationDate.getUTCMinutes()).padStart(2, '0');
              const seconds = String(reservationDate.getUTCSeconds()).padStart(2, '0');
              // JST時刻として文字列に変換（+09:00を付与）
              reservationDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`;
            } else if (typeof reservationDate === 'string') {
              // 文字列の場合
              if (!reservationDate.includes('+') && !reservationDate.includes('Z')) {
                // タイムゾーン情報がない場合は+09:00を付与
                reservationDate = reservationDate.replace(' ', 'T') + '+09:00';
              } else if (reservationDate.includes('Z') || reservationDate.endsWith('+00:00')) {
                // UTC時刻（Z付きまたは+00:00）の場合は、JSTに変換
                const dateObj = new Date(reservationDate);
                const year = dateObj.getUTCFullYear();
                const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
                const day = String(dateObj.getUTCDate()).padStart(2, '0');
                const hours = String(dateObj.getUTCHours()).padStart(2, '0');
                const minutes = String(dateObj.getUTCMinutes()).padStart(2, '0');
                const seconds = String(dateObj.getUTCSeconds()).padStart(2, '0');
                reservationDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`;
              }
            }
          }
          
          return {
            reservation_id: row.reservation_id,
            reservation_date: reservationDate,
            status: row.status,
            created_date: row.created_date,
            customer_name: row.customer_name || '未登録顧客',
            customer_phone: row.customer_phone,
            menu_name: row.menu_name || 'メニュー不明',
            staff_name: row.staff_name
          };
        });
        
        // 未読予約の件数
        const countResult = await query(`
          SELECT COUNT(*) as total
          FROM reservations
          WHERE tenant_id = $1
          AND (is_viewed = false OR is_viewed IS NULL)
          AND status != 'cancelled'
        `, [tenantId]);
        
        newReservationsCount = parseInt(countResult.rows[0]?.total || '0');
      }
    } catch (error: any) {
      // is_viewedカラムが存在しない場合はエラーを無視
      console.warn('新着予約の取得でエラーが発生しました（is_viewedカラムが存在しない可能性があります）:', error);
    }

    // テナント情報を追加
    const tenantResult = await query(
      'SELECT salon_name FROM tenants WHERE tenant_id = $1',
      [tenantId]
    );

    return NextResponse.json({
      totalCustomers: parseInt(totalCustomersResult.rows[0].total),
      newCustomersMonth: parseInt(newCustomersResult.rows[0].total),
      regularCustomers: parseInt(regularCustomersResult.rows[0].total),
      averageSpending: Math.round(avgSpendingResult.rows[0].average || 0),
      monthlySales: monthlySales,
      todayReservations: parseInt(todayReservationsResult.rows[0].total),
      todaySales: todaySales,
      tenantName: tenantResult.rows[0]?.salon_name || 'ビューティーサロン',
      newReservationsCount: newReservationsCount,
      newReservations: newReservations
    });
  } catch (error: any) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

