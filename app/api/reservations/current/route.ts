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
      SELECT r.*, m.name as menu_name, m.price, m.duration, s.name as staff_name
      FROM reservations r
      JOIN menus m ON r.menu_id = m.menu_id AND m.tenant_id = $1
      LEFT JOIN staff s ON r.staff_id = s.staff_id AND s.tenant_id = $1
      WHERE r.customer_id = $2 
      AND r.tenant_id = $1
      AND r.reservation_date > NOW()
      AND r.status = 'confirmed'
      ORDER BY r.reservation_date ASC
      LIMIT 1
    `;
    const result = await query(queryText, [tenantId, customerId]);

    if (result.rows.length === 0) {
      return NextResponse.json(null);
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching current reservation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

