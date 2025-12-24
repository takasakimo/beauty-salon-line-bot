import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 設定取得
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const tenantId = session.tenantId;

    const result = await query(
      'SELECT max_concurrent_reservations, business_hours, closed_days FROM tenants WHERE tenant_id = $1',
      [tenantId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'テナントが見つかりません' },
        { status: 404 }
      );
    }

    const row = result.rows[0];
    
    // business_hoursとclosed_daysをパース
    let businessHours = {};
    let closedDays: number[] = [];
    
    try {
      if (row.business_hours) {
        businessHours = typeof row.business_hours === 'string' 
          ? JSON.parse(row.business_hours) 
          : row.business_hours;
      }
    } catch (e) {
      console.error('business_hoursのパースエラー:', e);
    }
    
    try {
      if (row.closed_days) {
        closedDays = typeof row.closed_days === 'string' 
          ? JSON.parse(row.closed_days) 
          : row.closed_days;
      }
    } catch (e) {
      console.error('closed_daysのパースエラー:', e);
    }

    return NextResponse.json({
      max_concurrent_reservations: row.max_concurrent_reservations || 3,
      business_hours: businessHours,
      closed_days: Array.isArray(closedDays) ? closedDays : []
    });
  } catch (error: any) {
    console.error('設定取得エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 設定更新
export async function PUT(request: NextRequest) {
  try {
    const session = await getAuthFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const tenantId = session.tenantId;
    const body = await request.json();
    const { max_concurrent_reservations, business_hours, closed_days } = body;

    // 最大同時予約数のバリデーション
    if (max_concurrent_reservations !== undefined) {
      if (!max_concurrent_reservations || max_concurrent_reservations < 1) {
        return NextResponse.json(
          { error: '最大同時予約数は1以上である必要があります' },
          { status: 400 }
        );
      }
    }

    // 更新するカラムを動的に構築
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (max_concurrent_reservations !== undefined) {
      updates.push(`max_concurrent_reservations = $${paramIndex}`);
      values.push(max_concurrent_reservations);
      paramIndex++;
    }

    if (business_hours !== undefined) {
      updates.push(`business_hours = $${paramIndex}`);
      values.push(JSON.stringify(business_hours));
      paramIndex++;
    }

    if (closed_days !== undefined) {
      updates.push(`closed_days = $${paramIndex}`);
      values.push(JSON.stringify(closed_days));
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: '更新する項目が指定されていません' },
        { status: 400 }
      );
    }

    values.push(tenantId);
    const queryText = `
      UPDATE tenants 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $${paramIndex}
      RETURNING max_concurrent_reservations, business_hours, closed_days
    `;

    const result = await query(queryText, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'テナントが見つかりません' },
        { status: 404 }
      );
    }

    const row = result.rows[0];
    
    // business_hoursとclosed_daysをパース
    let businessHours = {};
    let closedDays: number[] = [];
    
    try {
      if (row.business_hours) {
        businessHours = typeof row.business_hours === 'string' 
          ? JSON.parse(row.business_hours) 
          : row.business_hours;
      }
    } catch (e) {
      console.error('business_hoursのパースエラー:', e);
    }
    
    try {
      if (row.closed_days) {
        closedDays = typeof row.closed_days === 'string' 
          ? JSON.parse(row.closed_days) 
          : row.closed_days;
      }
    } catch (e) {
      console.error('closed_daysのパースエラー:', e);
    }

    return NextResponse.json({
      max_concurrent_reservations: row.max_concurrent_reservations,
      business_hours: businessHours,
      closed_days: Array.isArray(closedDays) ? closedDays : []
    });
  } catch (error: any) {
    console.error('設定更新エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

