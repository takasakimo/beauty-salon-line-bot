import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthFromRequest, getTenantIdFromRequest } from '@/lib/auth';

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

    const tenantId = getTenantIdFromRequest(request, session);
    if (!tenantId) {
      return NextResponse.json(
        { error: '店舗IDが指定されていません' },
        { status: 400 }
      );
    }

    // closed_daysカラムが存在するかチェック
    let selectColumns = 'max_concurrent_reservations, business_hours';
    try {
      const columnCheck = await query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_name = 'tenants' AND column_name IN ('closed_days', 'temporary_closed_days', 'special_business_hours')`
      );
      const columnNames = columnCheck.rows.map((row: any) => row.column_name);
      if (columnNames.includes('closed_days')) {
        selectColumns += ', closed_days';
      }
      if (columnNames.includes('temporary_closed_days')) {
        selectColumns += ', temporary_closed_days';
      }
      if (columnNames.includes('special_business_hours')) {
        selectColumns += ', special_business_hours';
      }
    } catch (checkError: any) {
      console.error('カラムチェックエラー:', checkError);
    }

    const result = await query(
      `SELECT ${selectColumns} FROM tenants WHERE tenant_id = $1`,
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
    let temporaryClosedDays: string[] = [];
    let specialBusinessHours: Record<string, { open: string; close: string }> = {};
    
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
    
    try {
      if (row.temporary_closed_days) {
        temporaryClosedDays = typeof row.temporary_closed_days === 'string' 
          ? JSON.parse(row.temporary_closed_days) 
          : row.temporary_closed_days;
      }
    } catch (e) {
      console.error('temporary_closed_daysのパースエラー:', e);
    }
    
    try {
      if (row.special_business_hours) {
        specialBusinessHours = typeof row.special_business_hours === 'string' 
          ? JSON.parse(row.special_business_hours) 
          : row.special_business_hours;
      }
    } catch (e) {
      console.error('special_business_hoursのパースエラー:', e);
    }

    return NextResponse.json({
      max_concurrent_reservations: row.max_concurrent_reservations || 3,
      business_hours: businessHours,
      closed_days: Array.isArray(closedDays) ? closedDays : (row.closed_days ? [] : []),
      temporary_closed_days: Array.isArray(temporaryClosedDays) ? temporaryClosedDays : [],
      special_business_hours: typeof specialBusinessHours === 'object' ? specialBusinessHours : {}
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

    const tenantId = getTenantIdFromRequest(request, session);
    if (!tenantId) {
      return NextResponse.json(
        { error: '店舗IDが指定されていません' },
        { status: 400 }
      );
    }
    const body = await request.json();
    const { max_concurrent_reservations, business_hours, closed_days, temporary_closed_days, special_business_hours } = body;

    // 最大同時予約数のバリデーション
    if (max_concurrent_reservations !== undefined) {
      if (!max_concurrent_reservations || max_concurrent_reservations < 1) {
        return NextResponse.json(
          { error: '最大同時予約数は1以上である必要があります' },
          { status: 400 }
        );
      }
    }

    // カラムが存在するか事前にチェック
    let closedDaysColumnExists = false;
    let temporaryClosedDaysColumnExists = false;
    let specialBusinessHoursColumnExists = false;
    try {
      const columnCheck = await query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_name = 'tenants' AND column_name IN ('closed_days', 'temporary_closed_days', 'special_business_hours')`
      );
      const columnNames = columnCheck.rows.map((row: any) => row.column_name);
      closedDaysColumnExists = columnNames.includes('closed_days');
      temporaryClosedDaysColumnExists = columnNames.includes('temporary_closed_days');
      specialBusinessHoursColumnExists = columnNames.includes('special_business_hours');
    } catch (checkError: any) {
      console.error('カラムチェックエラー:', checkError);
      // エラーが発生した場合は存在しないとみなす
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

    // closed_daysカラムが存在する場合のみ更新
    if (closed_days !== undefined && closedDaysColumnExists) {
      updates.push(`closed_days = $${paramIndex}`);
      values.push(JSON.stringify(closed_days));
      paramIndex++;
    } else if (closed_days !== undefined && !closedDaysColumnExists) {
      console.log('closed_daysカラムが存在しないため、スキップします');
    }
    
    // temporary_closed_daysカラムが存在する場合のみ更新
    if (temporary_closed_days !== undefined && temporaryClosedDaysColumnExists) {
      updates.push(`temporary_closed_days = $${paramIndex}`);
      values.push(JSON.stringify(temporary_closed_days));
      paramIndex++;
    } else if (temporary_closed_days !== undefined && !temporaryClosedDaysColumnExists) {
      console.log('temporary_closed_daysカラムが存在しないため、スキップします');
    }
    
    // special_business_hoursカラムが存在する場合のみ更新
    if (special_business_hours !== undefined && specialBusinessHoursColumnExists) {
      updates.push(`special_business_hours = $${paramIndex}`);
      values.push(JSON.stringify(special_business_hours));
      paramIndex++;
    } else if (special_business_hours !== undefined && !specialBusinessHoursColumnExists) {
      console.log('special_business_hoursカラムが存在しないため、スキップします');
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: '更新する項目が指定されていません' },
        { status: 400 }
      );
    }

    values.push(tenantId);
    
    // 返却するカラムを動的に構築
    let returnColumns = 'max_concurrent_reservations, business_hours';
    if (closedDaysColumnExists) {
      returnColumns += ', closed_days';
    }
    if (temporaryClosedDaysColumnExists) {
      returnColumns += ', temporary_closed_days';
    }
    if (specialBusinessHoursColumnExists) {
      returnColumns += ', special_business_hours';
    }
    
    const queryText = `
      UPDATE tenants 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $${paramIndex}
      RETURNING ${returnColumns}
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
    let temporaryClosedDays: string[] = [];
    let specialBusinessHours: Record<string, { open: string; close: string }> = {};
    
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
    
    try {
      if (row.temporary_closed_days) {
        temporaryClosedDays = typeof row.temporary_closed_days === 'string' 
          ? JSON.parse(row.temporary_closed_days) 
          : row.temporary_closed_days;
      }
    } catch (e) {
      console.error('temporary_closed_daysのパースエラー:', e);
    }
    
    try {
      if (row.special_business_hours) {
        specialBusinessHours = typeof row.special_business_hours === 'string' 
          ? JSON.parse(row.special_business_hours) 
          : row.special_business_hours;
      }
    } catch (e) {
      console.error('special_business_hoursのパースエラー:', e);
    }

    return NextResponse.json({
      max_concurrent_reservations: row.max_concurrent_reservations,
      business_hours: businessHours,
      closed_days: Array.isArray(closedDays) ? closedDays : [],
      temporary_closed_days: Array.isArray(temporaryClosedDays) ? temporaryClosedDays : [],
      special_business_hours: typeof specialBusinessHours === 'object' ? specialBusinessHours : {}
    });
  } catch (error: any) {
    console.error('設定更新エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

