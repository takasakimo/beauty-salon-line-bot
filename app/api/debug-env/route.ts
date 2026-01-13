import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // セキュリティのため、本番環境では無効化
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const envInfo = {
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasPostgresUrl: !!process.env.POSTGRES_URL,
    hasPostgresUrlNonPooling: !!process.env.POSTGRES_URL_NON_POOLING,
    databaseUrlPreview: process.env.DATABASE_URL 
      ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@').substring(0, 100)
      : null,
    postgresUrlPreview: process.env.POSTGRES_URL
      ? process.env.POSTGRES_URL.replace(/:[^:@]+@/, ':****@').substring(0, 100)
      : null,
    nodeEnv: process.env.NODE_ENV,
  };

  return NextResponse.json(envInfo);
}





