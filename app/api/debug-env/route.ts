import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // このエンドポイントはセキュリティ上の理由で無効化されています
  return NextResponse.json({ error: 'Not available' }, { status: 403 });
}
