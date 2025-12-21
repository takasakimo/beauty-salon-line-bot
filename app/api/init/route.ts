import { NextResponse } from 'next/server';
import { connectDatabase } from '@/lib/db';
import { validateEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';

// アプリケーション初期化エンドポイント（ヘルスチェック用）
export async function GET() {
  try {
    // 環境変数の検証
    validateEnv();
    
    // データベース接続の確認
    await connectDatabase();
    
    return NextResponse.json({
      status: 'ok',
      message: 'Application initialized successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Initialization failed',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

