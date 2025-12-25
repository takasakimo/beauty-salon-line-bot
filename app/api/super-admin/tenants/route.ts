import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSuperAdminAuthFromRequest } from '@/lib/auth';

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
    const { tenantCode, salonName, maxConcurrentReservations } = body;

    // バリデーション
    if (!tenantCode || !salonName) {
      return NextResponse.json(
        { error: '店舗コードと店舗名は必須です' },
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

    // 店舗を作成
    const result = await query(
      `INSERT INTO tenants (tenant_code, salon_name, is_active, max_concurrent_reservations)
       VALUES ($1, $2, true, $3)
       RETURNING tenant_id, tenant_code, salon_name, is_active, max_concurrent_reservations`,
      [tenantCode, salonName, maxConcurrentReservations || 3]
    );

    return NextResponse.json({
      tenant: {
        tenantId: result.rows[0].tenant_id,
        tenantCode: result.rows[0].tenant_code,
        salonName: result.rows[0].salon_name,
        isActive: result.rows[0].is_active,
        maxConcurrentReservations: result.rows[0].max_concurrent_reservations
      }
    });
  } catch (error: any) {
    console.error('店舗作成エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

