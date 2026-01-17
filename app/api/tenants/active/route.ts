import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // タイムアウトを設定してテナント一覧を取得
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), 10000); // 10秒でタイムアウト
    });

    const queryPromise = query(
      'SELECT tenant_id, tenant_code, salon_name, is_active FROM tenants WHERE is_active = true ORDER BY salon_name'
    );

    const result = await Promise.race([queryPromise, timeoutPromise]) as any;

    // 結果が空の場合はデフォルトテナントを返す
    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json([
        {
          tenant_id: null,
          tenant_code: 'beauty-salon-001',
          salon_name: 'らくっぽリザーブ',
          is_active: true
        }
      ]);
    }

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('テナント一覧取得エラー:', error);
    console.error('エラー詳細:', error.message);
    
    // エラー時もデフォルトテナントを返す（フォールバック）
    // これにより、データベース接続エラーがあってもログイン画面は表示される
    return NextResponse.json([
      {
        tenant_id: null,
        tenant_code: 'beauty-salon-001',
        salon_name: 'らくっぽリザーブ',
        is_active: true
      }
    ], { status: 200 }); // 200を返してエラーを隠す
  }
}
