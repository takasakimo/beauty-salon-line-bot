import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, getCustomerAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getCustomerAuthFromRequest(request);
    if (session) {
      const sessionToken = request.cookies.get('customer_session_token')?.value;
      if (sessionToken) {
        await deleteSession(sessionToken);
      }
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete('customer_session_token');
    return response;
  } catch (error: any) {
    console.error('ログアウトエラー:', error);
    return NextResponse.json(
      { success: false, error: 'サーバーエラー' },
      { status: 500 }
    );
  }
}

