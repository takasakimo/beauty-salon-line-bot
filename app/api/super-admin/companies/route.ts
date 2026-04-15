import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSuperAdminAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** 企業一覧取得 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSuperAdminAuthFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const result = await query(
      `SELECT company_id, company_code, company_name, is_active, created_at
       FROM companies ORDER BY company_id ASC`
    );

    return NextResponse.json({
      companies: result.rows.map((row) => ({
        companyId: row.company_id,
        companyCode: row.company_code,
        companyName: row.company_name,
        isActive: row.is_active,
        createdAt: row.created_at
      }))
    });
  } catch (error: any) {
    console.error('企業一覧取得エラー:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** 企業作成 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSuperAdminAuthFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const companyCode = (body.companyCode ?? body.company_code ?? '').trim();
    const companyName = (body.companyName ?? body.company_name ?? '').trim();

    if (!companyCode || !companyName) {
      return NextResponse.json(
        { error: '企業コードと企業名は必須です' },
        { status: 400 }
      );
    }

    const insert = await query(
      `INSERT INTO companies (company_code, company_name, is_active)
       VALUES ($1, $2, true)
       RETURNING company_id, company_code, company_name, is_active, created_at`,
      [companyCode, companyName]
    );

    const row = insert.rows[0];
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
    if (error.code === '23505') {
      return NextResponse.json({ error: 'この企業コードは既に使用されています' }, { status: 400 });
    }
    console.error('企業作成エラー:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
