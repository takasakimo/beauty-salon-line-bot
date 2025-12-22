import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, tenantCode } = body;

    // バリデーション
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'ユーザー名とパスワードを入力してください' },
        { status: 400 }
      );
    }

    const result = await authenticateAdmin(username, password, tenantCode);

    if (!result.success) {
      console.error('管理者認証失敗:', {
        username,
        tenantCode,
        error: result.error
      });
      return NextResponse.json(
        { success: false, error: result.error || 'ログインに失敗しました' },
        { status: 401 }
      );
    }

    // セッションクッキーを設定
    const response = NextResponse.json({
      success: true,
      adminName: result.admin?.fullName,
      tenantName: result.tenant?.salonName,
      role: result.admin?.role
    });

    if (result.sessionToken) {
      response.cookies.set('session_token', result.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7日間
      });
    }

    return response;
  } catch (error: any) {
    console.error('ログインエラー:', error);
    return NextResponse.json(
      { success: false, error: 'サーバーエラー' },
      { status: 500 }
    );
  }
}

