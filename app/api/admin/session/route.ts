import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// セッション情報取得
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      role: session.role,
      tenantId: session.tenantId,
      username: session.username,
      isSuperAdmin: session.role === 'super_admin'
    });
  } catch (error: any) {
    console.error('セッション情報取得エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
