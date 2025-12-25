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

    // 今月の売上
    const monthlySalesResult = await query(
      `SELECT SUM(m.price) as total
       FROM reservations r
       JOIN menus m ON r.menu_id = m.menu_id AND m.tenant_id = $1
       WHERE r.status = 'completed'
       AND r.tenant_id = $1
       AND DATE_TRUNC('month', r.reservation_date) = DATE_TRUNC('month', CURRENT_DATE)`,
      [tenantId]
    );

    // 今日の予約数
    const todayReservationsResult = await query(
      `SELECT COUNT(*) as total
       FROM reservations
       WHERE DATE(reservation_date) = CURRENT_DATE
       AND status = 'confirmed'
       AND tenant_id = $1`,
      [tenantId]
    );

    // 今日の売上
    const todaySalesResult = await query(
      `SELECT SUM(m.price) as total
       FROM reservations r
       JOIN menus m ON r.menu_id = m.menu_id AND m.tenant_id = $1
       WHERE DATE(r.reservation_date) = CURRENT_DATE
       AND r.status = 'confirmed'
       AND r.tenant_id = $1`,
      [tenantId]
    );

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
      monthlySales: monthlySalesResult.rows[0].total || 0,
      todayReservations: parseInt(todayReservationsResult.rows[0].total),
      todaySales: todaySalesResult.rows[0].total || 0,
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

