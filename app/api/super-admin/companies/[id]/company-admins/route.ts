import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSuperAdminAuthFromRequest, hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** 企業に属する企業管理者一覧 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSuperAdminAuthFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const companyId = parseInt((await params).id, 10);
    if (isNaN(companyId)) {
      return NextResponse.json({ error: 'Invalid company id' }, { status: 400 });
    }

    const result = await query(
      `SELECT company_admin_id, username, email, full_name, is_active, last_login, created_at
       FROM company_admins WHERE company_id = $1 ORDER BY company_admin_id ASC`,
      [companyId]
    );

    return NextResponse.json({
      companyAdmins: result.rows.map((row) => ({
        companyAdminId: row.company_admin_id,
        username: row.username,
        email: row.email,
        fullName: row.full_name,
        isActive: row.is_active,
        lastLogin: row.last_login,
        createdAt: row.created_at
      }))
    });
  } catch (error: any) {
    console.error('企業管理者一覧取得エラー:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** 企業管理者を作成 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSuperAdminAuthFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const companyId = parseInt((await params).id, 10);
    if (isNaN(companyId)) {
      return NextResponse.json({ error: 'Invalid company id' }, { status: 400 });
    }

    const body = await request.json();
    const username = (body.username ?? '').trim();
    const password = (body.password ?? '').trim();
    const email = (body.email ?? '').trim();
    const fullName = (body.fullName ?? body.full_name ?? '').trim();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'ユーザー名とパスワードは必須です' },
        { status: 400 }
      );
    }

    const passwordHash = hashPassword(password);

    await query(
      `INSERT INTO company_admins (company_id, username, email, password_hash, full_name, is_active)
       VALUES ($1, $2, $3, $4, $5, true)`,
      [companyId, username, email || null, passwordHash, fullName || null]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('企業管理者作成エラー:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
