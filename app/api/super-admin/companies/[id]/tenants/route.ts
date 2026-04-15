import { NextRequest, NextResponse } from 'next/server';
import { query, getPool } from '@/lib/db';
import { getSuperAdminAuthFromRequest, getAuthFromRequest, hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** 企業に属する店舗一覧取得（スーパー管理者 or 当該企業の企業管理者） */
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

    // 企業管理者の場合は自企業のみ
    if (session.role === 'company_admin') {
      if (session.companyId !== companyId) {
        return NextResponse.json({ error: 'この企業の店舗一覧を表示する権限がありません' }, { status: 403 });
      }
    } else if (session.role !== 'super_admin') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    const result = await query(
      `SELECT tenant_id, tenant_code, salon_name, is_active, max_concurrent_reservations, created_at, updated_at
       FROM tenants
       WHERE company_id = $1
       ORDER BY tenant_id ASC`,
      [companyId]
    );

    return NextResponse.json({
      tenants: result.rows.map((row) => ({
        tenantId: row.tenant_id,
        tenantCode: row.tenant_code,
        salonName: row.salon_name,
        isActive: row.is_active,
        maxConcurrentReservations: row.max_concurrent_reservations || 3,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    });
  } catch (error: any) {
    console.error('企業別店舗一覧取得エラー:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** 企業に店舗を追加（スーパー管理者 or 当該企業の企業管理者） */
export async function POST(
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
        return NextResponse.json({ error: 'この企業に店舗を追加する権限がありません' }, { status: 403 });
      }
    } else if (session.role !== 'super_admin') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    const body = await request.json();
    const tenantCode = (body.tenantCode ?? body.tenant_code ?? '').trim();
    const salonName = (body.salonName ?? body.salon_name ?? '').trim();
    const maxConcurrentReservations = body.maxConcurrentReservations ?? 3;
    const adminUsername = (body.adminUsername ?? body.admin_username ?? '').trim();
    const adminPassword = (body.adminPassword ?? body.admin_password ?? '');
    const adminFullName = (body.adminFullName ?? body.admin_full_name ?? '').trim();

    if (!tenantCode || !salonName) {
      return NextResponse.json({ error: '店舗コードと店舗名は必須です' }, { status: 400 });
    }
    if (!adminUsername || !adminPassword) {
      return NextResponse.json({ error: '店舗管理者のユーザー名とパスワードは必須です' }, { status: 400 });
    }
    if (adminPassword.length < 6) {
      return NextResponse.json({ error: 'パスワードは6文字以上にしてください' }, { status: 400 });
    }

    const existing = await query('SELECT tenant_id FROM tenants WHERE tenant_code = $1', [tenantCode]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'この店舗コードは既に使用されています' }, { status: 400 });
    }

    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const tenantResult = await client.query(
        `INSERT INTO tenants (tenant_code, salon_name, is_active, max_concurrent_reservations, company_id)
         VALUES ($1, $2, true, $3, $4)
         RETURNING tenant_id, tenant_code, salon_name, is_active, max_concurrent_reservations`,
        [tenantCode, salonName, maxConcurrentReservations, companyId]
      );

      const tenantId = tenantResult.rows[0].tenant_id;
      const passwordHash = hashPassword(adminPassword);

      await client.query(
        `INSERT INTO tenant_admins (tenant_id, username, password_hash, full_name, role, is_active)
         VALUES ($1, $2, $3, $4, 'admin', true)`,
        [tenantId, adminUsername, passwordHash, adminFullName || adminUsername]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        tenant: {
          tenantId: tenantResult.rows[0].tenant_id,
          tenantCode: tenantResult.rows[0].tenant_code,
          salonName: tenantResult.rows[0].salon_name,
          isActive: tenantResult.rows[0].is_active,
          maxConcurrentReservations: tenantResult.rows[0].max_concurrent_reservations
        }
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('店舗作成エラー:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
