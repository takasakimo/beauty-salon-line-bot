import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** 企業1件取得（スーパー管理者 or 当該企業の企業管理者） */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const companyId = parseInt((await params).id, 10);
    if (isNaN(companyId)) {
      return NextResponse.json({ error: 'Invalid company id' }, { status: 400 });
    }

    if (session.role === 'company_admin') {
      if (session.companyId !== companyId) {
        return NextResponse.json({ error: 'この企業の情報を表示する権限がありません' }, { status: 403 });
      }
    } else if (session.role !== 'super_admin') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    const result = await query(
      'SELECT company_id, company_code, company_name, is_active, created_at FROM companies WHERE company_id = $1',
      [companyId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: '企業が見つかりません' }, { status: 404 });
    }

    const row = result.rows[0];
    return NextResponse.json({
      company: {
        companyId: row.company_id,
        companyCode: row.company_code,
        companyName: row.company_name,
        isActive: row.is_active,
        createdAt: row.created_at
      }
    });
  } catch (error: any) {
    console.error('企業取得エラー:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
