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

    const tenantId = getTenantIdFromRequest(request, session);
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
    // 複数メニュー対応: reservation_menusテーブルから合計金額を取得
    let monthlyReservationSales = 0;
    try {
      const monthlyReservationSalesResult = await query(
        `SELECT COALESCE(SUM(COALESCE(rm.price, COALESCE(r.price, m.price))), 0) as total
         FROM reservations r
         LEFT JOIN menus m ON r.menu_id = m.menu_id AND m.tenant_id = $1
         LEFT JOIN reservation_menus rm ON r.reservation_id = rm.reservation_id
         LEFT JOIN menus rm_menu ON rm.menu_id = rm_menu.menu_id AND rm_menu.tenant_id = $1
         WHERE r.status IN ('confirmed', 'completed')
         AND r.tenant_id = $1
         AND DATE_TRUNC('month', r.reservation_date) = DATE_TRUNC('month', CURRENT_DATE)`,
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
           WHERE r.status IN ('confirmed', 'completed')
           AND r.tenant_id = $1
           AND DATE_TRUNC('month', r.reservation_date) = DATE_TRUNC('month', CURRENT_DATE)`,
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
      tenantName: tenantResult.rows[0]?.salon_name || 'ビューティーサロン'
    });
  } catch (error: any) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

