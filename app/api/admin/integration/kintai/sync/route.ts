import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, getTenantIdFromRequestValidated } from '@/lib/auth';
import { query, getPool } from '@/lib/db';
import { fetchShiftsFromKintai } from '@/lib/kintai-api';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** 勤怠シフトを取得して staff_shifts に反映（手動同期）POST または GET */
async function handleSync(request: NextRequest) {
  const session = await getAuthFromRequest(request);
  const noCacheHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };
  if (!session) {
    return NextResponse.json(
      { error: '認証が必要です' },
      { status: 401, headers: noCacheHeaders }
    );
  }
  const tenantId = await getTenantIdFromRequestValidated(request, session);
  if (!tenantId) {
    return NextResponse.json(
      { error: session ? 'この店舗にアクセスする権限がありません' : '店舗が特定できません' },
      { status: session ? 403 : 400 }
    );
  }

  try {
    const configResult = await query(
      'SELECT kintai_base_url, kintai_api_key, kintai_company_code FROM tenant_kintai_integration WHERE tenant_id = $1',
      [tenantId]
    );
    if (configResult.rows.length === 0) {
      return NextResponse.json(
        { error: '勤怠連携の設定がありません。設定画面でAPIキー・企業コードを登録してください。' },
        { status: 400 }
      );
    }
    const config = configResult.rows[0];
    const baseUrl = config.kintai_base_url?.trim();
    const apiKey = config.kintai_api_key?.trim();
    const companyCode = config.kintai_company_code?.trim();
    if (!baseUrl || !apiKey || !companyCode) {
      return NextResponse.json(
        { error: '勤怠連携の設定が不足しています。ベースURL・APIキー・企業コードを設定してください。' },
        { status: 400 }
      );
    }

    const url = request.nextUrl;
    let startDate = '';
    let endDate = '';
    if (request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      startDate = (body.start_date || body.startDate || '').trim();
      endDate = (body.end_date || body.endDate || '').trim();
    } else {
      startDate = (url.searchParams.get('start_date') || '').trim();
      endDate = (url.searchParams.get('end_date') || '').trim();
    }

    let rangeStart: string;
    let rangeEnd: string;
    if (startDate && endDate) {
      rangeStart = startDate;
      rangeEnd = endDate;
    } else {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      rangeStart = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      rangeEnd = `${y}-${String(m + 1).padStart(2, '0')}-${new Date(y, m + 1, 0).getDate()}`;
    }

    const kintaiData = await fetchShiftsFromKintai(baseUrl, apiKey, companyCode, rangeStart, rangeEnd);

    const staffResult = await query(
      'SELECT staff_id, LOWER(TRIM(email)) as email FROM staff WHERE tenant_id = $1',
      [tenantId]
    );
    const emailToStaffId = new Map<string, number>();
    for (const row of staffResult.rows) {
      if (row.email) {
        emailToStaffId.set(row.email, row.staff_id);
      }
    }

    let synced = 0;
    let skipped = 0;

    const pool = getPool();
    const client = await pool.connect();

    try {
      const tableCheck = await client.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'staff_shifts')`
      );
      if (!tableCheck.rows[0].exists) {
        await client.query(`
          CREATE TABLE IF NOT EXISTS staff_shifts (
            shift_id SERIAL PRIMARY KEY,
            staff_id INTEGER NOT NULL,
            tenant_id INTEGER NOT NULL,
            shift_date DATE NOT NULL,
            start_time TIME,
            end_time TIME,
            is_off BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(staff_id, tenant_id, shift_date),
            FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE,
            FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
          );
          CREATE INDEX IF NOT EXISTS idx_staff_shifts_staff_date ON staff_shifts(staff_id, shift_date);
          CREATE INDEX IF NOT EXISTS idx_staff_shifts_tenant_date ON staff_shifts(tenant_id, shift_date);
        `);
      }

      const breakCol = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'staff_shifts' AND column_name = 'break_times'`
      );
      if (breakCol.rows.length === 0) {
        await client.query(`ALTER TABLE staff_shifts ADD COLUMN IF NOT EXISTS break_times JSONB DEFAULT '[]'::jsonb`);
      }

      await client.query('BEGIN');

      for (const shift of kintaiData.shifts) {
        const staffId = shift.employeeEmail ? emailToStaffId.get(shift.employeeEmail.trim().toLowerCase()) : null;
        if (staffId == null) {
          skipped++;
          continue;
        }

        const shiftDate = shift.date;
        const startTime = shift.isOff || !shift.startTime ? null : shift.startTime;
        const endTime = shift.isOff || !shift.endTime ? null : shift.endTime;
        const isOff = shift.isOff;
        const breakTimesJson = JSON.stringify(shift.breakMinutes ? [{ minutes: shift.breakMinutes }] : []);

        await client.query(
          `INSERT INTO staff_shifts (staff_id, tenant_id, shift_date, start_time, end_time, is_off, break_times, updated_at)
           VALUES ($1, $2, $3::date, $4::time, $5::time, $6, $7::jsonb, CURRENT_TIMESTAMP)
           ON CONFLICT (staff_id, tenant_id, shift_date)
           DO UPDATE SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time, is_off = EXCLUDED.is_off,
                         break_times = EXCLUDED.break_times, updated_at = CURRENT_TIMESTAMP`,
          [staffId, tenantId, shiftDate, startTime, endTime, isOff, breakTimesJson]
        );
        synced++;
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return NextResponse.json(
      {
        success: true,
        message: '同期が完了しました',
        synced,
        skipped,
        totalFromKintai: kintaiData.shifts.length,
        startDate: rangeStart,
        endDate: rangeEnd,
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Kintai sync error:', error);
    }
    const message = error?.message?.includes('Kintai API') ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: error?.message?.includes('401') ? 401 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}

export async function GET(request: NextRequest) {
  return handleSync(request);
}
