import { NextRequest, NextResponse } from 'next/server';
import { authenticateCompanyAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const usernameOrEmail = (body.username ?? body.email ?? '').trim();
    const password = (body.password ?? '').trim();

    if (!usernameOrEmail || !password) {
      return NextResponse.json(
        { success: false, error: 'ユーザー名（またはメール）とパスワードを入力してください' },
        { status: 400 }
      );
    }

    const result = await authenticateCompanyAdmin(usernameOrEmail, password);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'ログインに失敗しました' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      company: result.company
    });

    if (result.sessionToken) {
      response.cookies.set('session_token', result.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/'
      });
    }

    return response;
  } catch (error: any) {
    console.error('企業管理者ログインエラー:', error);
    return NextResponse.json(
      { success: false, error: 'サーバーエラー' },
      { status: 500 }
    );
  }
}
