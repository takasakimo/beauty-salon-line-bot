import { NextResponse } from 'next/server';
import { connectDatabase, query } from '@/lib/db';
import { isProduction } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // データベース接続を確認
    await connectDatabase();
    
    // 簡単なクエリでデータベースが動作しているか確認
    await query('SELECT 1');
    
    return NextResponse.json({
      status: 'ok',
      message: 'Server and database are running',
      environment: isProduction() ? 'production' : 'development',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Database connection failed',
        error: isProduction() ? 'Internal server error' : error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

