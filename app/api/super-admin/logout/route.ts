import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdminAuthFromRequest, deleteSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getSuperAdminAuthFromRequest(request);
    if (session) {
      const sessionToken = request.cookies.get('session_token')?.value;
      if (sessionToken) {
        await deleteSession(sessionToken);
      }
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete('session_token');
    return response;
  } catch (error: any) {
    console.error('ログアウトエラー:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

