import { NextResponse } from 'next/server';

// エラータイプ
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INTERNAL = 'INTERNAL_SERVER_ERROR',
}

// カスタムエラークラス
export class AppError extends Error {
  constructor(
    public type: ErrorType,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// エラーレスポンスの生成
export function createErrorResponse(
  error: unknown,
  defaultMessage: string = 'An error occurred'
): NextResponse {
  // 既にAppErrorの場合はそのまま使用
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.type,
        message: error.message,
        details: error.details,
      },
      { status: error.statusCode }
    );
  }

  // データベースエラーの場合
  if (error && typeof error === 'object' && 'code' in error) {
    const dbError = error as { code: string; message: string };
    
    // よくあるデータベースエラー
    if (dbError.code === '23505') {
      return NextResponse.json(
        {
          error: ErrorType.VALIDATION,
          message: 'Duplicate entry. This record already exists.',
        },
        { status: 409 }
      );
    }
    
    if (dbError.code === '23503') {
      return NextResponse.json(
        {
          error: ErrorType.VALIDATION,
          message: 'Foreign key constraint violation.',
        },
        { status: 400 }
      );
    }
  }

  // その他のエラー
  const message = error instanceof Error ? error.message : defaultMessage;
  
  // 本番環境では詳細なエラー情報を隠す
  const isProduction = process.env.NODE_ENV === 'production';
  
  return NextResponse.json(
    {
      error: ErrorType.INTERNAL,
      message: isProduction ? 'Internal server error' : message,
      ...(isProduction ? {} : { details: error }),
    },
    { status: 500 }
  );
}

// エラーハンドリングラッパー
export function withErrorHandler(
  handler: (request: Request) => Promise<NextResponse>
) {
  return async (request: Request): Promise<NextResponse> => {
    try {
      return await handler(request);
    } catch (error) {
      console.error('API Error:', error);
      return createErrorResponse(error);
    }
  };
}





