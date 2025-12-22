import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // テナント一覧を取得
    const result = await query(
      'SELECT tenant_id, tenant_code, salon_name, is_active FROM tenants WHERE is_active = true ORDER BY salon_name'
    );

    // 結果が空の場合はデフォルトテナントを返す
    if (result.rows.length === 0) {
      return NextResponse.json([
        {
          tenant_id: null,
          tenant_code: 'beauty-salon-001',
          salon_name: 'らくポチビューティー',
          is_active: true
        }
      ]);
    }

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('テナント一覧取得エラー:', error);
    console.error('エラー詳細:', error.message, error.stack);
    
    // エラー時もデフォルトテナントを返す（フォールバック）
    return NextResponse.json([
      {
        tenant_id: null,
        tenant_code: 'beauty-salon-001',
        salon_name: 'らくポチビューティー',
        is_active: true
      }
    ]);
  }
}
