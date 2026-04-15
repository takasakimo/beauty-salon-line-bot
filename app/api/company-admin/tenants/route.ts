import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** 企業管理者用：自企業に属する店舗一覧を返す */
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }
    if (session.role !== 'company_admin' || session.companyId == null) {
      return NextResponse.json({ error: '企業管理者のみ利用できます' }, { status: 403 });
    }

    const result = await query(
      `SELECT tenant_id, tenant_code, salon_name, is_active, company_id
       FROM tenants
       WHERE company_id = $1 AND is_active = true
       ORDER BY tenant_id ASC`,
      [session.companyId]
    );

    return NextResponse.json({
      companyId: session.companyId,
      tenants: result.rows.map((row) => ({
        tenantId: row.tenant_id,
        tenantCode: row.tenant_code,
        salonName: row.salon_name,
        isActive: row.is_active
      }))
    });
  } catch (error: any) {
    console.error('企業管理者 店舗一覧取得エラー:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
