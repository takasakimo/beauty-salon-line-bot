import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSuperAdminAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 店舗詳細情報取得（統計情報含む）
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSuperAdminAuthFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const tenantId = parseInt(params.id);
    if (isNaN(tenantId)) {
      return NextResponse.json(
        { error: '無効な店舗IDです' },
        { status: 400 }
      );
    }

    // 店舗基本情報（business_hoursとclosed_daysカラムが存在するかチェック）
    let selectColumns = 'tenant_id, tenant_code, salon_name, is_active, max_concurrent_reservations, created_at, updated_at';
    
    try {
      const columnCheck = await query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_name = 'tenants' AND column_name IN ('business_hours', 'closed_days')`
      );
      
      const hasBusinessHours = columnCheck.rows.some((row: any) => row.column_name === 'business_hours');
      const hasClosedDays = columnCheck.rows.some((row: any) => row.column_name === 'closed_days');
      
      if (hasBusinessHours) {
        selectColumns += ', business_hours';
      }
      if (hasClosedDays) {
        selectColumns += ', closed_days';
      }
    } catch (checkError: any) {
      console.error('カラムチェックエラー:', checkError);
      // エラーが発生しても続行
    }

    const tenantResult = await query(
      `SELECT ${selectColumns}
       FROM tenants
       WHERE tenant_id = $1`,
      [tenantId]
    );

    if (tenantResult.rows.length === 0) {
      return NextResponse.json(
        { error: '店舗が見つかりません' },
        { status: 404 }
      );
    }

    const tenant = tenantResult.rows[0];

    // 統計情報を取得
    // 管理者数
    const adminsResult = await query(
      'SELECT COUNT(*) as count FROM tenant_admins WHERE tenant_id = $1 AND is_active = true',
      [tenantId]
    );

    // 顧客数
    const customersResult = await query(
      'SELECT COUNT(*) as count FROM customers WHERE tenant_id = $1',
      [tenantId]
    );

    // 予約数（全体）
    const reservationsResult = await query(
      'SELECT COUNT(*) as count FROM reservations WHERE tenant_id = $1',
      [tenantId]
    );

    // 今月の予約数
    const monthlyReservationsResult = await query(
      `SELECT COUNT(*) as count 
       FROM reservations 
       WHERE tenant_id = $1
       AND DATE_TRUNC('month', reservation_date) = DATE_TRUNC('month', CURRENT_DATE)`,
      [tenantId]
    );

    // 今月の売上（reservation_menusから計算、テーブルが存在しない場合はフォールバック）
    let monthlySalesResult;
    try {
      monthlySalesResult = await query(
        `SELECT COALESCE(SUM(rm.price), 0) as total
         FROM reservations r
         LEFT JOIN reservation_menus rm ON r.reservation_id = rm.reservation_id
         WHERE r.tenant_id = $1
         AND r.status = 'completed'
         AND DATE_TRUNC('month', r.reservation_date) = DATE_TRUNC('month', CURRENT_DATE)`,
        [tenantId]
      );
    } catch (joinError: any) {
      // reservation_menusテーブルが存在しない場合は、reservations.priceから計算
      if (joinError.message && joinError.message.includes('reservation_menus')) {
        console.log('reservation_menusテーブルが存在しないため、reservations.priceから計算します');
        monthlySalesResult = await query(
          `SELECT COALESCE(SUM(COALESCE(r.price, 0)), 0) as total
           FROM reservations r
           WHERE r.tenant_id = $1
           AND r.status = 'completed'
           AND DATE_TRUNC('month', r.reservation_date) = DATE_TRUNC('month', CURRENT_DATE)`,
          [tenantId]
        );
      } else {
        throw joinError;
      }
    }

    // メニュー数
    const menusResult = await query(
      'SELECT COUNT(*) as count FROM menus WHERE tenant_id = $1 AND is_active = true',
      [tenantId]
    );

    // スタッフ数（is_activeカラムが存在しない可能性があるため、直接試行してエラー時はフォールバック）
    let staffResult;
    try {
      // まずis_activeありで試行
      staffResult = await query(
        'SELECT COUNT(*) as count FROM staff WHERE tenant_id = $1 AND is_active = true',
        [tenantId]
      );
    } catch (staffError: any) {
      // is_activeカラムが存在しない場合は、is_activeなしで取得
      if (staffError.message && staffError.message.includes('is_active')) {
        console.log('staff.is_activeカラムが存在しないため、is_active条件なしで取得します');
        staffResult = await query(
          'SELECT COUNT(*) as count FROM staff WHERE tenant_id = $1',
          [tenantId]
        );
      } else {
        // その他のエラーの場合は再スロー
        throw staffError;
      }
    }

    // business_hoursとclosed_daysをパース（カラムが存在する場合のみ）
    let businessHours = {};
    let closedDays: number[] = [];
    
    if (tenant.business_hours !== undefined) {
      try {
        if (tenant.business_hours) {
          businessHours = typeof tenant.business_hours === 'string' 
            ? JSON.parse(tenant.business_hours) 
            : tenant.business_hours;
        }
      } catch (e) {
        console.error('business_hoursのパースエラー:', e);
      }
    }
    
    if (tenant.closed_days !== undefined) {
      try {
        if (tenant.closed_days) {
          closedDays = typeof tenant.closed_days === 'string' 
            ? JSON.parse(tenant.closed_days) 
            : tenant.closed_days;
        }
      } catch (e) {
        console.error('closed_daysのパースエラー:', e);
      }
    }

    return NextResponse.json({
      tenant: {
        tenantId: tenant.tenant_id,
        tenantCode: tenant.tenant_code,
        salonName: tenant.salon_name,
        isActive: tenant.is_active,
        maxConcurrentReservations: tenant.max_concurrent_reservations || 3,
        businessHours,
        closedDays: Array.isArray(closedDays) ? closedDays : [],
        createdAt: tenant.created_at,
        updatedAt: tenant.updated_at
      },
      statistics: {
        admins: parseInt(adminsResult.rows[0].count),
        customers: parseInt(customersResult.rows[0].count),
        reservations: parseInt(reservationsResult.rows[0].count),
        monthlyReservations: parseInt(monthlyReservationsResult.rows[0].count),
        monthlySales: parseFloat(monthlySalesResult.rows[0].total) || 0,
        menus: parseInt(menusResult.rows[0].count),
        staff: parseInt(staffResult.rows[0].count)
      }
    });
  } catch (error: any) {
    console.error('店舗詳細取得エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

