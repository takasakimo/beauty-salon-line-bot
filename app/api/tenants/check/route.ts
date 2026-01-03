import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantCode } = body;

    if (!tenantCode) {
      return NextResponse.json(
        { exists: false, error: '店舗コードを入力してください' },
        { status: 400 }
      );
    }

    const result = await query(
      'SELECT tenant_id, tenant_code, salon_name, is_active FROM tenants WHERE tenant_code = $1',
      [tenantCode]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ 
        exists: false, 
        error: '店舗コードが見つかりません' 
      });
    }

    const tenant = result.rows[0];
    
    if (!tenant.is_active) {
      return NextResponse.json({ 
        exists: false, 
        error: 'この店舗は現在利用できません' 
      });
    }

    return NextResponse.json({
      exists: true,
      tenant: {
        tenantId: tenant.tenant_id,
        tenantCode: tenant.tenant_code,
        salonName: tenant.salon_name
      }
    });
  } catch (error: any) {
    console.error('店舗コード確認エラー:', error);
    return NextResponse.json(
      { exists: false, error: 'サーバーエラー' },
      { status: 500 }
    );
  }
}



