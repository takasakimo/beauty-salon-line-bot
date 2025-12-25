import { NextRequest, NextResponse } from 'next/server';
import { authenticateSuperAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { username, password } = body;

    // 入力値のトリム処理
    username = username?.trim() || '';
    password = password?.trim() || '';

    // バリデーション
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'ユーザー名とパスワードを入力してください' },
        { status: 400 }
      );
    }

    const result = await authenticateSuperAdmin(username, password);

    if (!result.success) {
      console.error('スーパー管理者認証失敗:', {
        username,
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
      superAdminName: result.superAdmin?.fullName
    });

    if (result.sessionToken) {
      response.cookies.set('session_token', result.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7日間
        path: '/'
      });
    }

    return response;
  } catch (error: any) {
    console.error('ログインエラー:', error);
    const errorMessage = error?.message || String(error);
    return NextResponse.json(
      { success: false, error: `サーバーエラー: ${errorMessage}` },
      { status: 500 }
    );
  }
}

