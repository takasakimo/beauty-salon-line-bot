import { NextRequest, NextResponse } from 'next/server';
import { query, getPool } from '@/lib/db';
import { getSuperAdminAuthFromRequest, hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 店舗一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getSuperAdminAuthFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const result = await query(
      `SELECT 
        tenant_id,
        tenant_code,
        salon_name,
        is_active,
        max_concurrent_reservations,
        created_at,
        updated_at
       FROM tenants
       ORDER BY created_at DESC`
    );

    return NextResponse.json({
      tenants: result.rows.map(row => ({
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
    console.error('店舗一覧取得エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 店舗作成
export async function POST(request: NextRequest) {
  try {
    const session = await getSuperAdminAuthFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tenantCode, salonName, maxConcurrentReservations, adminUsername, adminPassword, adminFullName } = body;

    // バリデーション
    if (!tenantCode || !salonName) {
      return NextResponse.json(
        { error: '店舗コードと店舗名は必須です' },
        { status: 400 }
      );
    }

    if (!adminUsername || !adminPassword) {
      return NextResponse.json(
        { error: '管理者ユーザー名とパスワードは必須です' },
        { status: 400 }
      );
    }

    if (adminPassword.length < 6) {
      return NextResponse.json(
        { error: '管理者パスワードは6文字以上である必要があります' },
        { status: 400 }
      );
    }

    // 店舗コードの重複チェック
    const existing = await query(
      'SELECT tenant_id FROM tenants WHERE tenant_code = $1',
      [tenantCode]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'この店舗コードは既に使用されています' },
        { status: 400 }
      );
    }

    // トランザクションで店舗と管理者アカウントを作成
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 店舗を作成
      const tenantResult = await client.query(
        `INSERT INTO tenants (tenant_code, salon_name, is_active, max_concurrent_reservations)
         VALUES ($1, $2, true, $3)
         RETURNING tenant_id, tenant_code, salon_name, is_active, max_concurrent_reservations`,
        [tenantCode, salonName, maxConcurrentReservations || 3]
      );

      const tenantId = tenantResult.rows[0].tenant_id;

      // 管理者アカウントを作成
      const passwordHash = hashPassword(adminPassword);
      await client.query(
        `INSERT INTO tenant_admins (tenant_id, username, password_hash, full_name, role, is_active)
         VALUES ($1, $2, $3, $4, 'admin', true)`,
        [tenantId, adminUsername.trim(), passwordHash, adminFullName || adminUsername.trim()]
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
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('店舗作成エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

