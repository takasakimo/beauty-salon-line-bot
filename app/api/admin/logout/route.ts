import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, getAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = getAuthFromRequest(request);
    if (session) {
      const sessionToken = request.cookies.get('session_token')?.value;
      if (sessionToken) {
        deleteSession(sessionToken);
      }
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete('session_token');
    return response;
  } catch (error: any) {
    console.error('ログアウトエラー:', error);
    return NextResponse.json(
      { success: false, error: 'サーバーエラー' },
      { status: 500 }
    );
  }
}

