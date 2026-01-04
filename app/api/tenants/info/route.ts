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

    // カラムが存在するかチェック
    let selectColumns = 'tenant_id, tenant_code, salon_name, is_active';
    try {
      const columnCheck = await query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_name = 'tenants' AND column_name IN ('business_hours', 'closed_days', 'temporary_closed_days', 'special_business_hours')`
      );
      const columnNames = columnCheck.rows.map((row: any) => row.column_name);
      if (columnNames.includes('business_hours')) {
        selectColumns += ', business_hours';
      }
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
    
    // 営業時間をパース
    let businessHours: any = {};
    try {
      if (row.business_hours) {
        businessHours = typeof row.business_hours === 'string' 
          ? JSON.parse(row.business_hours) 
          : row.business_hours;
      }
    } catch (e) {
      console.error('business_hoursのパースエラー:', e);
    }

    // 定休日をパース
    let closedDays: number[] = [];
    try {
      if (row.closed_days) {
        closedDays = typeof row.closed_days === 'string' 
          ? JSON.parse(row.closed_days) 
          : row.closed_days;
      }
    } catch (e) {
      console.error('closed_daysのパースエラー:', e);
    }

    // 臨時休業日をパース
    let temporaryClosedDays: string[] = [];
    try {
      const rawValue = row.temporary_closed_days;
      // null、undefined、空文字列の場合は空配列を返す
      if (rawValue === null || rawValue === undefined || rawValue === '') {
        temporaryClosedDays = [];
      } else if (typeof rawValue === 'string') {
        const trimmed = rawValue.trim();
        if (trimmed === '' || trimmed === 'null' || trimmed === '[]' || trimmed === 'null' || trimmed === 'NULL') {
          temporaryClosedDays = [];
        } else {
          try {
            const parsed = JSON.parse(rawValue);
            temporaryClosedDays = Array.isArray(parsed) ? parsed : [];
          } catch (parseError) {
            console.error('temporary_closed_daysのJSONパースエラー:', parseError);
            temporaryClosedDays = [];
          }
        }
      } else if (Array.isArray(rawValue)) {
        temporaryClosedDays = rawValue;
      } else {
        temporaryClosedDays = [];
      }
      // 最終的に配列でない場合は空配列にする
      if (!Array.isArray(temporaryClosedDays)) {
        temporaryClosedDays = [];
      }
    } catch (e) {
      console.error('temporary_closed_daysのパースエラー:', e);
      temporaryClosedDays = [];
    }

    // 特別営業時間をパース
    let specialBusinessHours: Record<string, { open: string; close: string }> = {};
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
      tenant_id: row.tenant_id,
      tenant_code: row.tenant_code,
      salon_name: row.salon_name,
      is_active: row.is_active,
      business_hours: businessHours,
      closed_days: Array.isArray(closedDays) ? closedDays : [],
      temporary_closed_days: Array.isArray(temporaryClosedDays) ? temporaryClosedDays : [],
      special_business_hours: typeof specialBusinessHours === 'object' ? specialBusinessHours : {}
    });
  } catch (error: any) {
    console.error('テナント情報取得エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

