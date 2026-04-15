import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, getTenantIdFromRequestValidated } from '@/lib/auth';
import { query } from '@/lib/db';
import { fetchShiftsFromKintai } from '@/lib/kintai-api';

export const dynamic = 'force-dynamic';

/** 勤怠連携から従業員一覧を取得（シフトAPIの結果を従業員単位でユニーク化） */
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }
    const tenantId = await getTenantIdFromRequestValidated(request, session);
    if (!tenantId) {
      return NextResponse.json(
        { error: session ? 'この店舗にアクセスする権限がありません' : '店舗が特定できません' },
        { status: session ? 403 : 400 }
      );
    }

    const configResult = await query(
      'SELECT kintai_base_url, kintai_api_key, kintai_company_code FROM tenant_kintai_integration WHERE tenant_id = $1',
      [tenantId]
    );
    if (configResult.rows.length === 0) {
      return NextResponse.json({ employees: [] });
    }
    const config = configResult.rows[0];
    const baseUrl = config.kintai_base_url?.trim();
    const apiKey = config.kintai_api_key?.trim();
    const companyCode = config.kintai_company_code?.trim();
    if (!baseUrl || !apiKey || !companyCode) {
      return NextResponse.json({ employees: [] });
    }

    const now = new Date();
    const end = new Date(now);
    const start = new Date(now);
    start.setMonth(start.getMonth() - 3);
    const rangeStart = start.toISOString().slice(0, 10);
    const rangeEnd = end.toISOString().slice(0, 10);

    const kintaiData = await fetchShiftsFromKintai(baseUrl, apiKey, companyCode, rangeStart, rangeEnd);

    const byId = new Map<
      number,
      { employeeId: number; employeeName: string; employeeEmail: string; employeeNumber: string }
    >();
    for (const shift of kintaiData.shifts) {
      if (byId.has(shift.employeeId)) continue;
      byId.set(shift.employeeId, {
        employeeId: shift.employeeId,
        employeeName: shift.employeeName || '',
        employeeEmail: shift.employeeEmail || '',
        employeeNumber: shift.employeeNumber || '',
      });
    }

    const employees = Array.from(byId.values()).sort((a, b) =>
      (a.employeeName || a.employeeEmail).localeCompare(b.employeeName || b.employeeEmail)
    );

    return NextResponse.json({ employees });
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Kintai employees GET error:', error);
    }
    const message = error instanceof Error && error.message.includes('Kintai API')
      ? error.message
      : '勤怠から従業員一覧を取得できませんでした';
    return NextResponse.json(
      { error: message, employees: [] },
      { status: 200 }
    );
  }
}
