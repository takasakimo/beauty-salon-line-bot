import { NextRequest, NextResponse } from 'next/server';
import { authenticateCustomer } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, tenantCode } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'メールアドレスとパスワードを入力してください' },
        { status: 400 }
      );
    }

    const result = await authenticateCustomer(email, password, tenantCode);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    // セッションクッキーを設定
    const response = NextResponse.json({
      success: true,
      customer: result.customer,
      tenantName: result.tenant?.salonName
    });

    if (result.sessionToken) {
      response.cookies.set('customer_session_token', result.sessionToken, {
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





