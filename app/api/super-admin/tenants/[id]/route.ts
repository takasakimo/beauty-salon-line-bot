import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSuperAdminAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 店舗更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSuperAdminAuthFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const tenantId = parseInt(params.id);
    if (isNaN(tenantId)) {
      return NextResponse.json(
        { error: '無効な店舗IDです' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { tenantCode, salonName, isActive, maxConcurrentReservations } = body;

    // バリデーション
    if (!tenantCode || !salonName) {
      return NextResponse.json(
        { error: '店舗コードと店舗名は必須です' },
        { status: 400 }
      );
    }

    // 店舗コードの重複チェック（自分以外）
    const existing = await query(
      'SELECT tenant_id FROM tenants WHERE tenant_code = $1 AND tenant_id != $2',
      [tenantCode, tenantId]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'この店舗コードは既に使用されています' },
        { status: 400 }
      );
    }

    // 店舗を更新
    const result = await query(
      `UPDATE tenants 
       SET tenant_code = $1, 
           salon_name = $2, 
           is_active = $3,
           max_concurrent_reservations = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $5
       RETURNING tenant_id, tenant_code, salon_name, is_active, max_concurrent_reservations`,
      [tenantCode, salonName, isActive !== undefined ? isActive : true, maxConcurrentReservations || 3, tenantId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: '店舗が見つかりません' },
        { status: 404 }
      );
    }

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
    console.error('店舗更新エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 店舗削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSuperAdminAuthFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const tenantId = parseInt(params.id);
    if (isNaN(tenantId)) {
      return NextResponse.json(
        { error: '無効な店舗IDです' },
        { status: 400 }
      );
    }

    // 関連データの存在チェック（予約、顧客、管理者など）
    const reservationsCheck = await query(
      'SELECT COUNT(*) as count FROM reservations WHERE tenant_id = $1',
      [tenantId]
    );

    if (parseInt(reservationsCheck.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'この店舗には予約データが存在するため削除できません' },
        { status: 400 }
      );
    }

    // 店舗を削除
    const result = await query(
      'DELETE FROM tenants WHERE tenant_id = $1 RETURNING tenant_id',
      [tenantId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: '店舗が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('店舗削除エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

